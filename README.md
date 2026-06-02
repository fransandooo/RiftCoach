# RiftCoach

RiftCoach is a post-game League of Legends coaching web app. It imports recent Riot match data, stores it, computes deterministic analytics, and presents improvement-focused summaries.

## Stack

- Monorepo: TurboRepo + Bun workspaces
- Frontend: Next.js + TypeScript + Tailwind CSS
- Backend: Bun + Elysia
- Database: PostgreSQL
- ORM: Drizzle
- Future deployment direction: Docker/container-first, with Dokploy as the preferred VPS app platform once RiftCoach moves beyond local dev
- Future observability direction: self-hosted Grafana, Loki, Prometheus, OpenTelemetry, and Tempo stack

## Repository layout

```text
apps/
  web/    Next.js frontend
  api/    Bun + Elysia backend
packages/
  shared/ optional shared types/schemas later
docs/
  plans/  product and implementation plans
```

## Local setup

Install dependencies:

```bash
bun install
```

Start the local PostgreSQL database:

```bash
docker compose up -d postgres
```

Use this development database URL:

```bash
export DATABASE_URL=postgres://riftcoach:***@localhost:55432/riftcoach
```

Create the local development env file:

```bash
cp .env.example .env
```

The backend scripts load the root `.env` explicitly from `apps/api`, so `bun run dev`, `bun run db:migrate`, and `bun run db:check` work from the repository root.

Run migrations:

```bash
bun run db:migrate
```

Check database connectivity:

```bash
bun run db:check
```

Run both frontend and backend through TurboRepo:

```bash
bun run dev
```

Run only the backend:

```bash
bun run --cwd apps/api dev
```

Run only the frontend:

```bash
bun run --cwd apps/web dev
```

Default local URLs:

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Backend health: http://localhost:4000/health
- PostgreSQL: localhost:55432

## Viewing the VPS dev app from a laptop

When the app runs on the VPS, `localhost:3000` on the VPS is not automatically the same as `localhost:3000` on your laptop.

Recommended development approach: SSH port forwarding.

From your laptop:

```bash
ssh -L 3000:localhost:3000 -L 4000:localhost:4000 francisco@srv1191876
```

Then, inside that SSH session on the VPS:

```bash
cd ~/projects/RiftCoach
bun run dev
```

Now open these URLs on the laptop:

- Frontend: http://localhost:3000
- Backend health: http://localhost:4000/health

Why this works: the SSH tunnel maps your laptop ports 3000 and 4000 to the VPS ports 3000 and 4000. Without the tunnel, your laptop's `localhost` means your laptop, not the VPS.

## Scripts

```bash
bun run build
bun run lint
bun run test
bun run format
bun run db:generate
bun run db:migrate
bun run db:check
```

Backend-specific database scripts:

```bash
bun run --cwd apps/api db:generate
bun run --cwd apps/api db:migrate
bun run --cwd apps/api db:studio
bun run --cwd apps/api db:check
```

## Environment

Copy `.env.example` to `.env` for local VPS development. The backend requires `DATABASE_URL` before it starts as a real server. Tests that do not need a real database can still run without it.

Required backend variables:

```bash
DATABASE_URL=postgres://riftcoach:***@localhost:55432/riftcoach
API_HOST=0.0.0.0
API_PORT=4000
WEB_ORIGIN=http://localhost:3000
```
