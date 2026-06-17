# Deploy.sa — Real Deployment Pipeline (Alibaba ECS + Docker + Traefik)

Turns the simulated deploy into a **real** one: each project is cloned, built
into a Docker image, run as a container, and exposed at
`https://<slug>.apps.deploy.wafgate.com` with an automatic Let's Encrypt cert.

**MVP scope:** Node.js apps (a default Dockerfile is injected if the repo has
none). Repos that ship their own `Dockerfile` work for any stack.

```
┌─────────────────────┐   POST /deploy + SSE     ┌──────────────────────────┐
│ Control plane        │ ───────────────────────▶ │ Alibaba ECS              │
│ (Next app, Hostinger)│ ◀─────────────────────── │  • Build Agent (:9000)   │
│  deploy.wafgate.com  │     live build logs      │  • Docker + Traefik      │
└─────────────────────┘                           │  • *.apps.deploy.wafgate │
                                                   └──────────────────────────┘
```

---

## 1. Create the ECS instance

- Ubuntu 22.04/24.04, ≥ 2 vCPU / 4 GB.
- **Security group inbound:**
  - `80`, `443` → `0.0.0.0/0` (Traefik / public apps)
  - `9000` → **only your control-plane server's IP** (the build agent)
  - `22` → your IP

## 2. DNS (wildcard)

Add an **A record**: `*.apps.deploy.wafgate.com` → **ECS public IP**.
(Optionally `apps.deploy.wafgate.com` → same IP.)

Verify: `dig +short test.apps.deploy.wafgate.com` → ECS IP.

## 3. Install Docker + Node 20 on the ECS

```bash
sudo apt update
curl -fsSL https://get.docker.com | sudo sh
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git
sudo docker network create web
```

## 4. Start Traefik

```bash
# copy the repo (or just the infra folder) to the ECS
git clone https://github.com/azizfs96/deploy-sa.git /opt/deploy-sa
cd /opt/deploy-sa/infra/traefik
ACME_EMAIL="you@example.com" docker compose up -d
docker ps   # traefik should be running on 80/443
```

## 5. Install the Build Agent

```bash
sudo mkdir -p /opt/deploysa-agent /var/deploysa/builds
sudo cp /opt/deploy-sa/agent/server.mjs /opt/deploysa-agent/
sudo cp /opt/deploy-sa/agent/.env.example /opt/deploysa-agent/.env
sudo nano /opt/deploysa-agent/.env     # set a strong AGENT_TOKEN, APPS_DOMAIN

# systemd service
sudo cp /opt/deploy-sa/agent/deploysa-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now deploysa-agent
sudo systemctl status deploysa-agent   # active (running)
curl -s localhost:9000/health          # {"ok":true}
```

> The agent runs Docker as root and builds untrusted repo code — that's why
> port 9000 is firewalled to the control plane only. For multi-tenant use,
> isolate builds (rootless Docker / Kaniko / a sandbox) later.

## 6. Link the control plane (Hostinger server)

Edit `/var/www/deploy-sa/.env`:
```ini
AGENT_URL="http://<ecs-public-ip>:9000"
AGENT_TOKEN="<same token as the agent>"
APPS_DOMAIN="apps.deploy.wafgate.com"
```

Apply the new DB columns + SSE-friendly Nginx, then rebuild:
```bash
cd /var/www/deploy-sa
git pull
npm install
npm run db:push          # adds Deployment.agentId / liveUrl
npm run build
pm2 reload deploy-sa
```

**Nginx — enable SSE** on the `deploy.wafgate.com` 443 server block
(add inside its `location /`):
```nginx
proxy_buffering off;
proxy_read_timeout 3600s;
```
Then `sudo nginx -t && sudo systemctl reload nginx`.

---

## 7. Test

1. Open https://deploy.wafgate.com → **New Project**.
2. Pick a Node.js repo → Deploy.
3. You'll see **real build logs** streaming (git clone → docker build → run).
4. On success: open `https://<slug>.apps.deploy.wafgate.com` — your app is live.
5. **Redeploy** from the project page re-runs the real build.

If `AGENT_URL` is empty, everything falls back to the previous simulated flow —
so the app keeps working without the ECS.

---

## Troubleshooting

| Symptom | Fix |
| ------- | --- |
| Logs don't stream (spinner stuck) | Nginx `proxy_buffering off` missing on the 443 block |
| `agent unavailable` (502) | Agent down or port 9000 blocked from control plane |
| Build fails on clone | Repo private + token lacks `repo` scope — re-login |
| App 502 at its subdomain | Container not listening on `PORT=3000`, or no `start` script |
| Cert error on subdomain | Wildcard DNS not pointing to ECS, or port 80 blocked (HTTP-01) |

### Useful commands (ECS)
```bash
docker ps                      # running project containers (deploysa-<slug>)
docker logs deploysa-<slug>    # a project's runtime logs
journalctl -u deploysa-agent -f
docker logs traefik
```
