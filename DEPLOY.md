# Deploy.sa — Production Deployment (Ubuntu + Nginx + PM2)

Target: **https://deploy.wafgate.com** · Repo: `azizfs96/deploy-sa`

---

## A. On your Windows machine — push the code

```powershell
cd C:\Users\nhlar\Deploy-sa
git init                       # if not already a repo
git add .
git commit -m "Deploy.sa: app + backend + GitHub integration"
git branch -M main
git remote add origin https://github.com/azizfs96/deploy-sa.git
git push -u origin main
```

> `.env` is gitignored — your secrets are NOT pushed. You'll recreate `.env` on the server.

---

## B. Update the GitHub OAuth App for production

https://github.com/settings/developers → your app (or create a new one):

| Field | Value |
| ----- | ----- |
| Homepage URL | `https://deploy.wafgate.com` |
| Authorization callback URL | `https://deploy.wafgate.com/api/auth/callback/github` |

Copy the **Client ID** + a fresh **Client Secret** for the server `.env`.

---

## C. DNS

Point an **A record** for `deploy.wafgate.com` → your server's public IPv4.
Verify: `ping deploy.wafgate.com` resolves to the server.

---

## D. On the Ubuntu server

### 1. Base packages + Node 20 LTS
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx
sudo npm install -g pm2
node -v   # should be v20.x
```

### 2. Get the code
```bash
sudo mkdir -p /var/www && sudo chown -R $USER:$USER /var/www
cd /var/www
git clone https://github.com/azizfs96/deploy-sa.git
cd deploy-sa
```

### 3. Create the production .env
```bash
cp .env.production.example .env
nano .env          # fill DATABASE_URL, AUTH_SECRET, AUTH_GITHUB_ID/SECRET
```
Generate a fresh secret: `npx auth secret` (paste into `AUTH_SECRET`).

### 4. Install, migrate, build
```bash
npm install                # also runs prisma generate (postinstall)
npm run db:deploy          # applies migrations to Neon (prisma migrate deploy)
npm run build
```

> If `db:deploy` says "No migration found", run `npx prisma migrate dev --name init`
> ONCE on your Windows machine first and commit the generated `prisma/migrations/`
> folder, then push & pull. (See note at the bottom.)

### 5. Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup        # run the command it prints, to auto-start on reboot
pm2 logs deploy-sa # check it's listening on :3000
```

### 6. Nginx reverse proxy
```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/deploy-sa
sudo ln -s /etc/nginx/sites-available/deploy-sa /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### 7. HTTPS with Let's Encrypt
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d deploy.wafgate.com
```
Certbot adds the 443 block and auto-renews. Open **https://deploy.wafgate.com**.

### 8. Firewall (if ufw is on)
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
```

---

## E. Redeploy after code changes
```bash
cd /var/www/deploy-sa
git pull
npm install
npm run db:deploy      # if schema changed
npm run build
pm2 reload deploy-sa
```

---

## Important: commit your Prisma migration

`prisma migrate deploy` needs a `prisma/migrations/` folder in the repo.
On Windows, BEFORE pushing, run once against any reachable DB (your Neon URL works):

```powershell
npm run db:migrate    # creates prisma/migrations/<timestamp>_init/
git add prisma/migrations
git commit -m "add initial migration"
git push
```

If you can't run it locally, use `npm run db:push` on the server instead of
`db:deploy` — it syncs the schema directly without migration files:

```bash
npm run db:push
```
