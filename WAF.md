# Deploy.sa — Per-site WAF (ModSecurity + OWASP CRS)

Each project gets OWASP Core Rule Set protection plus **its own block rules**,
managed from the dashboard. Clients control **only their own site's rules** —
the core CRS and other tenants' rules are never exposed.

## Safety model
- Clients never write raw SecLang. They add **structured rules** (block IP /
  path / country) and the agent emits safe, parameterized `SecRule`s only.
  Dangerous directives (`exec`, etc.) are impossible by construction.
- Each site's rules live in its own file `/etc/modsec-sites/<slug>.conf`,
  applied only to that site's server block.

## What ships in the app (product layer — live now after deploy)
- `Project.wafEnabled` + `WafRule` model.
- Project **WAF tab**: enable toggle + add/remove block rules.
- API: `GET/PUT /api/projects/:slug/waf`, `POST/DELETE …/waf/rules`.
- Agent `POST /waf`: writes `/etc/modsec-sites/<slug>.conf` and reloads ModSec.

### Deploy the product layer
```bash
# Windows: git push
# Hostinger:
cd /var/www/deploy-sa
git fetch origin && git reset --hard origin/main
npm install && npm run db:push && npm run build && pm2 reload deploy-sa
# ECS agent:
cd /opt/deploy-sa && sudo git pull
sudo cp agent/server.mjs /opt/deploysa-agent/server.mjs
sudo systemctl restart deploysa-agent
```
After this the WAF tab works and rule files are generated on the ECS — but they
are **not enforced** until the routing cutover below.

---

## Enforcement cutover (do together, with testing)

This inserts ModSecurity into the live path and **changes routing**, so we do it
carefully on the ECS:

```
Traefik (*.apps -> modsec) -> ModSecurity (CRS + /etc/modsec-sites/<slug>.conf) -> deploysa-<slug>:3000
```

### Steps (high level)
1. Start ModSec: `cd /opt/deploy-sa/infra/modsec && docker compose up -d`.
2. The agent must, on each deploy, ALSO generate a per-site nginx server block
   that `proxy_pass`es to `deploysa-<slug>:3000` and includes the site's rule
   file. (This is the `buildAndRun` change we wire up during the cutover.)
3. App containers stop publishing their own Traefik labels; Traefik routes the
   `*.apps` wildcard to `modsec` instead (see the `apps-waf` router label).
4. Verify one test site end-to-end, then roll forward.

> Until step 2–3 are wired and tested, production keeps the current direct
> routing (apps reachable, WAF rules stored but not enforced). This is
> intentional so we don't break live sites.

### Verifying a rule
After enforcement, add a `block_path = /admin` rule for a test site, then:
```bash
curl -I https://<slug>.apps.deploy.wafgate.com/admin   # expect 403
curl -I https://<slug>.apps.deploy.wafgate.com/         # expect 200
```

## Roadmap (post-MVP)
- Paranoia level per site; disable specific CRS rule IDs (false positives).
- Blocked-requests log per site (audit log → dashboard).
- Rate limiting; country blocking via GeoIP database.
