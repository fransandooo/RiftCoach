# RiftCoach

RiftCoach is a post-game League of Legends coaching web app. It imports recent Riot match data, stores it, computes deterministic analytics, and presents improvement-focused summaries.

## Stack

- Monorepo: TurboRepo + Bun workspaces
- Frontend: Next.js + TypeScript + Tailwind CSS
- Backend: Bun + Elysia
- Database: PostgreSQL, planned for Phase 2
- ORM: Drizzle, planned for Phase 2

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

## Scripts

```bash
bun run build
bun run lint
bun run test
bun run format
```

## Environment

Copy `.env.example` to local environment files as needed. Phase 1 only needs the backend URL for health checks. Phase 2 will add `DATABASE_URL` and Riot API variables.
