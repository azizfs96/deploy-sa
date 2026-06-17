# Deploy.sa

A Saudi-first PaaS dashboard (Vercel + Railway style), built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Framer Motion**, and **Zustand**.

> All data is mocked in `src/lib/mock-data.ts`. There are no real API calls.

## Features

- **Full RTL ⇄ LTR** — Arabic default, English secondary (persisted in `localStorage`)
- **Dark default + light mode** toggle (persisted)
- **Mobile-first responsive** layout, collapsible sidebar
- Pages: `/login`, `/dashboard`, `/projects/[id]`, `/new` (3-step wizard)
- Simulated **live build-log streaming** (lines appear at 80ms intervals)
- Status badges: Ready (green) · Building (amber, pulsing) · Failed (red)
- Framework detection chips: Node (green) · Python (blue) · Static (purple)

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000 — you'll land on `/login`. Either OAuth button
(mocked) takes you into the dashboard.

## Stack notes

| Concern        | Choice |
| -------------- | ------ |
| Global state   | Zustand — `usePrefs` (persisted UI), `useApp` (domain state) |
| i18n           | Lightweight dictionary in `src/lib/i18n.ts` via `useT()` |
| Fonts          | IBM Plex Sans Arabic (AR) · Inter (EN) · JetBrains Mono (code) |
| Theme tokens   | CSS variables in `globals.css`, toggled by `.light` / `.dark` |

## Structure

```
src/
  app/
    (auth)/login/        # OAuth landing
    dashboard/           # main overview
    projects/[id]/       # detail: Deployments | Settings | Logs | Analytics | Domains
    new/                 # 3-step new project wizard
    deployments|databases|domains|settings/  # nav stubs
  components/
    ui/                  # button, input, card, avatar, toggle
    layout/              # Navbar, Sidebar, DashboardShell, ThemeProvider, Logo
    deployments/         # StatusBadge, FrameworkIcon, DeploymentRow, DeploymentPanel, LogStream
    projects/            # ProjectCard, NewProjectWizard, SettingsTab, EnvVarsEditor, AnalyticsTab, DomainsTab
    dashboard/           # NewProjectHero, ActivityFeed
  lib/
    mock-data.ts  store.ts  i18n.ts  types.ts  utils.ts
```
