# Deploy.sa — Per-site WAF (ModSecurity + OWASP CRS)

Each client can **enable or disable** a Web Application Firewall for their own
site, and manage their own block rules — all from the dashboard. Clients control
**only their own site's rules**; the core CRS and other tenants are never
exposed.

## How it works (per-site, opt-in)
When a client toggles WAF **on** for project `<slug>`, the agent:
1. Writes the site's SecLang rules to `/etc/modsec-sites/<slug>.conf`.
2. Starts a dedicated ModSecurity container `deploysa-waf-<slug>`
   (OWASP CRS + that site's rules) that proxies to `deploysa-<slug>:3000`.
3. Attaches a **higher-priority Traefik router** (`priority=1000`) for
   `<slug>.apps.deploy.wafgate.com`, so traffic goes through the WAF.

Toggle **off** → the WAF container is removed and traffic falls back to the
app's own (direct) Traefik router. **Zero impact on any other site.**

```
WAF on :  Traefik ─►(priority 1000)─► deploysa-waf-<slug> (CRS+rules) ─► deploysa-<slug>:3000
WAF off:  Traefik ───────────────────────────────────────────────────► deploysa-<slug>:3000
```

## Safety
- Clients never write raw SecLang — only **structured rules** (block IP / path /
  country). The agent emits safe, parameterized `SecRule`s only; dangerous
  directives (`exec`, …) are impossible by construction.
- Each site's rules live in its own file and its own container — full isolation.

## Validated
Proven on the ECS (isolated test): `/` → 200, `/admin` → 403 (client rule),
SQLi → 403 (CRS).

## Deploy
```bash
# Windows: git push
# Hostinger (control plane):
cd /var/www/deploy-sa
git fetch origin && git reset --hard origin/main
npm install && npm run db:push && npm run build && pm2 reload deploy-sa
# ECS (agent):
cd /opt/deploy-sa && sudo git pull
sudo cp agent/server.mjs /opt/deploysa-agent/server.mjs
sudo systemctl restart deploysa-agent
```
The `owasp/modsecurity-crs:nginx-alpine` image is pulled automatically on the
first enable (already present on the ECS).

## Test (after deploy)
1. Dashboard → project → **WAF** tab → enable → add rule `block_path = /admin`.
2. On the ECS: `docker ps | grep deploysa-waf` shows the new container.
3. Public checks:
   ```bash
   curl -I https://<slug>.apps.deploy.wafgate.com/        # 200
   curl -I https://<slug>.apps.deploy.wafgate.com/admin   # 403 (your rule)
   curl -I "https://<slug>.apps.deploy.wafgate.com/?id=1%20OR%201=1--"  # 403 (CRS)
   ```
4. Toggle WAF off → container removed → `/admin` returns 200 again (direct).

## Notes / roadmap
- Redeploying an app auto-restarts its WAF container (to track the new IP).
- Each WAF-enabled site uses one small ModSec container (~80 MB). Fine for
  pre-production; for scale, move to a shared multi-site ModSec later.
- Next: paranoia level per site, disable specific CRS rule IDs, blocked-request
  audit log, rate limiting, GeoIP country blocking.
