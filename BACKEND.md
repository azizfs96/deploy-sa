# Deploy.sa — Backend & GitHub Integration

Real **GitHub OAuth** (Auth.js v5) + **PostgreSQL/Prisma**. Deployments are
simulated; everything else (login, repos, branches, persistence) is real.

## 1. Install dependencies

```bash
npm install
```

> `next-auth@5` peer-warns on Next 16 — it works; the warning is safe to ignore.

## 2. Start PostgreSQL

Easiest via Docker:

```bash
docker run --name deploy-sa-db -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=deploysa -p 5432:5432 -d postgres:16
```

(Or use a hosted DB like Neon/Supabase and copy its connection string.)

## 3. Register a GitHub OAuth App

https://github.com/settings/developers → **New OAuth App**

| Field | Value |
| ----- | ----- |
| Homepage URL | `http://localhost:3000` |
| Authorization callback URL | `http://localhost:3000/api/auth/callback/github` |

Copy the **Client ID** and generate a **Client Secret**.

## 4. Environment variables

```bash
cp .env.example .env
```

Fill in:

```ini
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/deploysa?schema=public"
AUTH_SECRET="<run: npx auth secret>"
AUTH_GITHUB_ID="<client id>"
AUTH_GITHUB_SECRET="<client secret>"
```

## 5. Create the database schema

```bash
npm run db:generate     # prisma client
npm run db:migrate      # creates tables (name it e.g. "init")
```

## 6. Run

```bash
npm run dev
```

Open http://localhost:3000 → **Continue with GitHub** → authorize →
the New Project wizard now lists **your real repositories**.

### Optional: seed demo projects
After signing in once:

```bash
npm run db:seed         # attaches the 3 sample projects to your account
```

Inspect data anytime with `npm run db:studio`.

## Architecture

| Concern | Where |
| ------- | ----- |
| Auth (edge-safe config) | `src/auth.config.ts` |
| Auth (full + Prisma adapter) | `src/auth.ts` |
| Route protection | `middleware.ts` (JWT, no Prisma on edge) |
| GitHub API client | `src/lib/github.ts` |
| DB client singleton | `src/lib/prisma.ts` |
| Schema | `prisma/schema.prisma` |
| DB → UI mapper | `src/lib/mappers.ts` |

### API routes
| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/api/github/repos` | List your GitHub repos |
| GET | `/api/github/branches?repo=owner/name` | List branches |
| GET / POST | `/api/projects` | List / create projects |
| GET / DELETE | `/api/projects/[slug]` | Single project |
| POST | `/api/projects/[slug]/deployments` | Redeploy |
| * | `/api/auth/*` | Auth.js (NextAuth) |

The frontend store (`src/lib/store.ts`) hydrates from `/api/projects` via
`ProjectsSync`, so the dashboard, project detail, and activity feed all reflect
real database state.
