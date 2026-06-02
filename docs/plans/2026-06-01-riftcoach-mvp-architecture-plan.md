# RiftCoach MVP, Architecture and Implementation Plan

> For Hermes: use subagent-driven-development skill only after Francisco explicitly asks to start implementation. This document is planning only; do not write application code yet.

Goal: Build RiftCoach, a post-game League of Legends coaching web app that helps Francisco review recent matches, competitive progress, most-played champions, key stats, and recurring error patterns.

Architecture: Start with a dedicated backend API and a separate frontend. RiftCoach is data-ingestion-heavy: it talks to Riot APIs, stores immutable match data, computes analytics, handles rate limits, and will likely need background refresh jobs later. Keeping that logic in a Bun + Elysia backend from day one gives cleaner boundaries than embedding it inside the frontend.

Tech Stack Proposal:

- Monorepo orchestration: TurboRepo with Bun workspaces
- Frontend: Next.js with TypeScript, App Router, Tailwind CSS, shadcn/ui
- Backend: Bun + Elysia HTTP API
- Database: PostgreSQL
- ORM/query layer: Drizzle ORM preferred for Bun/Elysia ergonomics; Prisma remains acceptable if Francisco prefers it later
- Jobs: backend-owned manual refresh endpoint for MVP; later add a backend worker/queue for scheduled refreshes
- Auth: start with single-user local profile or simple auth; defer multi-user auth unless needed
- External API: Riot Games API
- Deployment target: Francisco VPS under /home/francisco/projects, separate from Hermes
- Deployment direction: container-first; use Docker Compose for local/dev shape and prefer Dokploy for VPS deployment once the app is ready to run like a small real product
- Observability direction: self-hosted metrics/logs/traces stack with Grafana, Prometheus, Loki, OpenTelemetry Collector, and Tempo; design it as shared VPS infrastructure for multiple future projects

---

## 1. Product Definition

### Problem

After playing League of Legends, it is hard to identify improvement patterns from the raw client history alone. Riot provides match data, but players still need interpretation: champion trends, ranked progression, role performance, common death patterns, poor objective participation, vision issues, and repeat mistakes.

### RiftCoach Positioning

RiftCoach is a post-game coach, not an overlay and not a real-time assistant.

It should answer questions like:

- How have my recent ranked games gone?
- Which champions am I relying on most?
- Am I improving or stagnating?
- What stats are repeatedly weak?
- Which mistakes appear across multiple games?
- What should I focus on in the next session?

### Non-goals for MVP

- No real-time game tracking
- No in-game overlay
- No live shotcalling
- No team scouting
- No public multi-user SaaS features
- No advanced ML training pipeline
- No automatic video/VOD analysis

---

## 2. MVP Scope

### MVP User Flow

1. User enters Riot region, game name, and tag line.
2. App resolves account data via Riot API.
3. App fetches recent matches.
4. App stores raw match summaries and normalized participant stats.
5. Dashboard shows recent performance overview.
6. Champion page shows most-played champions and performance by champion.
7. Match detail page shows key stats and detected post-game mistakes.
8. Coach summary page gives simple prioritized recommendations.

### MVP Screens

#### A. Player Setup Page

Purpose: connect Riot identity.

Fields:

- Region routing value, e.g. europe/americas/asia depending Riot endpoint needs
- Platform region, e.g. euw1, na1, kr
- Riot gameName
- Riot tagLine

Acceptance criteria:

- Can save one player profile locally
- Can resolve PUUID through Riot API
- Shows a clear error if Riot API key is missing or invalid

#### B. Dashboard

Purpose: at-a-glance post-game review.

Cards:

- Last refresh time
- Last 10/20 match record
- Ranked solo/duo tier, LP, wins/losses if available
- Average KDA
- Average CS/min
- Average vision score
- Average kill participation
- Most played role/lane if derivable

Charts/tables:

- Recent match list
- Win/loss trend
- Champion usage summary

#### C. Champions Page

Purpose: understand champion pool.

For each champion:

- Games played
- Win rate
- Average KDA
- Average CS/min
- Average damage share or damage per minute if available
- Average vision score
- Notes/flags based on weak metrics

#### D. Match Detail Page

Purpose: review one game.

Show:

- Champion, lane, role, result, duration
- KDA, CS, gold, damage, vision, objectives where available
- Timeline-derived events if fetched
- Detected mistakes and positives

#### E. Coach Summary Page

Purpose: convert stats into action.

Output:

- Top 3 recurring issues
- Top 3 strengths
- Suggested focus for next 5 games
- Champion pool recommendation based on recent data

---

## 3. Riot API Integration Plan

### Required Riot Data

Account endpoints:

- Resolve Riot ID to PUUID

Summoner/League endpoints:

- Get summoner profile by PUUID if needed for profile icon, revision date, or summoner level
- Get ranked entries by PUUID for tier, rank, LP, wins, losses
- Note: live Riot smoke testing showed Summoner V4 by PUUID no longer returns encrypted summoner id in the response, so ranked lookup should use League V4 `entries/by-puuid/{puuid}` instead of the older `entries/by-summoner/{encryptedSummonerId}` flow

Match endpoints:

- Get match IDs by PUUID
- Get match details by match ID
- Optional for later MVP+: get match timeline by match ID

### API Key Handling

- Store RIOT_API_KEY in .env.local on VPS
- Never commit API keys
- Add .env.example with required variables during implementation
- Build a Riot API client wrapper with typed errors and rate-limit awareness

### Rate Limits

MVP approach:

- Fetch only recent 10-20 matches by default
- Cache/store fetched matches by matchId
- Do not refetch existing immutable match details unless forced
- Add manual Refresh button

Future approach:

- Background refresh jobs
- Request queue
- Rate-limit retry/backoff

---

## 4. Core Analytics Rules for MVP

Keep first version deterministic and explainable. Avoid AI until the base metrics are reliable.

### Derived Metrics

Per match:

- win/loss
- KDA = (kills + assists) / max(1, deaths)
- CS/min = totalMinionsKilled + neutralMinionsKilled divided by game minutes
- kill participation = (kills + assists) / team kills
- vision score per minute
- damage share = player champion damage / team champion damage
- gold share = player gold / team gold

Across matches:

- recent win rate
- average KDA
- average CS/min
- average KP
- average vision score/min
- champion-specific aggregates

### Initial Mistake Detection Rules

These are deliberately simple and should be shown as heuristic flags, not absolute truth.

Possible flags:

- Low CS: CS/min below role/champion baseline threshold
- High deaths: deaths above threshold, especially in losses
- Low kill participation: KP below threshold for role
- Low vision: vision score/min below threshold
- Low damage contribution: damage share below threshold for carry roles
- Champion pool spread: too many champions in small sample
- Tilt/loss streak: consecutive losses with rising deaths or falling CS/min

### Example Coach Output Logic

If player has repeated low CS and high deaths:

- Primary focus: safer laning and farming consistency
- Next 5 games: track CS at 10 minutes and avoid deaths before first objective

If player has many champions with low sample size:

- Primary focus: narrow champion pool
- Next 5 games: play top 2 champions only

---

## 5. Data Model Draft

### PlayerProfile

- id
- gameName
- tagLine
- platformRegion
- regionalRoute
- puuid
- createdAt
- updatedAt

### RankedSnapshot

- id
- playerProfileId
- queueType
- tier
- rank
- leaguePoints
- wins
- losses
- fetchedAt

### Match

- id
- riotMatchId unique
- gameCreation
- gameDuration
- gameMode
- queueId
- platformId
- rawJson optional/jsonb
- createdAt

### MatchParticipant

- id
- matchId
- playerProfileId nullable
- puuid
- summonerName/gameName if available
- championName
- championId
- teamId
- win
- lane
- role
- kills
- deaths
- assists
- totalMinionsKilled
- neutralMinionsKilled
- goldEarned
- totalDamageDealtToChampions
- visionScore
- wardsPlaced
- wardsKilled
- detectorFlags jsonb
- derivedStats jsonb

### CoachInsight

- id
- playerProfileId
- scope, e.g. recent_matches/champion/match
- title
- severity
- description
- evidence jsonb
- createdAt

---

## 6. Architecture

### Proposed MVP Structure

```text
RiftCoach/
  docs/
    plans/
  apps/
    web/                         # Next.js frontend
      app/
        page.tsx
        setup/
        dashboard/
        champions/
        matches/[matchId]/
        coach/
      components/
        dashboard/
        matches/
        champions/
        coach/
        ui/
      lib/
        api-client.ts            # typed client for backend API
        env.ts
    api/                         # Bun + Elysia backend
      src/
        index.ts                 # Elysia app entrypoint
        config/
          env.ts
        modules/
          player/
          matches/
          champions/
          coach/
          refresh/
        riot/
          client.ts
          types.ts
          errors.ts
        analytics/
          derived-metrics.ts
          mistake-rules.ts
          aggregations.ts
          recommendations.ts
        db/
          client.ts
          schema.ts
          migrations/
        jobs/
          refresh-player.ts
      tests/
        unit/
        integration/
  packages/
    shared/                      # optional shared types/schemas if needed
```

### Backend Boundaries

- apps/api/src/riot: Riot API calls only
- apps/api/src/analytics: pure deterministic functions, easy to test
- apps/api/src/db: database schema, queries, migrations
- apps/api/src/modules: HTTP routes and application services
- apps/api/src/jobs: refresh orchestration and future background tasks
- apps/web: UI only; talks to the backend API and does not call Riot directly

### Why Dedicated Bun + Elysia Backend

Pros:

- Better separation of concerns for a data-heavy coaching product
- Riot API key stays strictly server-side
- Refresh/import logic lives outside the frontend lifecycle
- Easier path to background jobs, queues, scheduled refreshes, and rate-limit handling
- Elysia gives typed routes and fast iteration with Bun
- The backend can later serve other clients, e.g. mobile app, Discord bot, CLI, or AI analysis worker

Tradeoffs:

- Slightly more setup than a single Next.js full-stack app
- Need to manage CORS, API contracts, and two deployable processes
- Need to decide monorepo package/workspace structure early

Decision: use dedicated Bun + Elysia backend from the start. This matches the product shape better than embedding backend logic into Next.js route handlers.

---

## 7. Implementation Plan

### Phase 0: Repository and Planning

Objective: create project skeleton documentation only.

Tasks:

1. Create /home/francisco/projects/RiftCoach
2. Create docs/plans/2026-06-01-riftcoach-mvp-architecture-plan.md
3. Initialize git only when Francisco confirms preferred repo flow
4. Do not write app code yet

Verification:

- Plan file exists
- File owner is francisco:francisco

Phase acceptance test:

- Run `stat -c "%U:%G %n" docs/plans/2026-06-01-riftcoach-mvp-architecture-plan.md` and confirm it prints `francisco:francisco`.

### Phase 1: TurboRepo Monorepo and Frontend/Backend Skeleton

Objective: create a working TurboRepo monorepo with Bun workspaces, a Next.js frontend, and a Bun + Elysia backend.

Tasks:

1. Initialize project workspace in /home/francisco/projects/RiftCoach
2. Configure TurboRepo with Bun workspaces
3. Create apps/web as the Next.js TypeScript frontend
4. Create apps/api as the Bun + Elysia backend
5. Add placeholder frontend routes: setup, dashboard, champions, matches, coach
6. Add basic Elysia health route, e.g. GET /health
7. Add shared formatting/linting/test scripts at repo level through TurboRepo
8. Add README with local commands for frontend, backend, and database
9. Document SSH port forwarding for viewing VPS dev servers from Francisco's laptop

Verification:

- bun install succeeds
- frontend dev server starts
- backend dev server starts
- GET /health returns OK
- frontend can call backend health endpoint
- lint/build/test scripts pass where configured

Phase acceptance test:

- Run `bun run dev`, open `http://localhost:3000` through SSH port forwarding, and confirm the homepage shows backend status `ok (riftcoach-api)`.

### Phase 2: Backend Database Foundation

Objective: persist player profile and match data from the Bun + Elysia API.

Tasks:

1. Add Drizzle ORM and PostgreSQL driver to apps/api
2. Configure DATABASE_URL in backend env validation
3. Ensure backend scripts load the root `.env` even when Turbo runs them from `apps/api`
4. Define schema for PlayerProfile, RankedSnapshot, Match, MatchParticipant, CoachInsight
5. Create first migration
6. Add backend database client
7. Add seed/dev reset command if useful

Verification:

- drizzle migration generation succeeds
- migration applies
- backend DB connection test passes

Phase acceptance test:

- Run `docker compose up -d postgres`, `bun run db:migrate`, and `bun run db:check`; confirm output includes `Database connection OK`.

### Phase 3: Riot API Client

Objective: safely call Riot API.

Tasks:

1. Add RIOT_API_KEY env validation
2. Implement account lookup by Riot ID
3. Implement ranked entries fetch
4. Implement match ID list fetch
5. Implement match detail fetch
6. Add typed error handling for missing key, 403, 404, 429

Verification:

- Unit tests for URL construction and error mapping
- Optional live smoke test only if RIOT_API_KEY is present

Phase acceptance test:

- With mocked Riot responses, run the Riot client test suite and confirm account lookup, ranked fetch, match ID fetch, match detail fetch, and 429 handling pass. If RIOT_API_KEY is present, run one live lookup smoke test against Francisco's account.

### Phase 4: Analytics Engine

Objective: compute metrics and mistake flags from stored match data.

Tasks:

1. Implement derived stat functions
2. Implement aggregation by recent matches
3. Implement aggregation by champion
4. Implement deterministic mistake rules
5. Implement coach recommendation generator

Verification:

- Unit tests with fixture matches
- Edge cases for zero deaths, zero team kills, short games, remakes

Phase acceptance test:

- Run `bun run --cwd apps/api test tests/analytics-engine.test.ts` against fixture matches and confirm it produces expected KDA, CS/min, KP, vision flags, champion aggregates, top coach recommendations, and edge-case behavior for zero deaths, zero team kills, short games, and remakes.

### Phase 5: Backend Refresh Flow

Objective: import recent post-game data through the Bun + Elysia API.

Tasks:

1. Build setup endpoint to save player profile
2. Build manual backend refresh endpoint/action
3. Fetch recent match IDs from Riot API
4. Skip already-stored matches
5. Store match and participant rows
6. Generate/update coach insights
7. Expose refresh status for frontend polling/display

Verification:

- Manual refresh fetches recent matches with a valid Riot key
- Re-running refresh does not duplicate matches
- UI shows imported data

Phase acceptance test:

- Trigger manual refresh twice for the same player. Confirm the first run imports recent matches and the second run reports skipped existing matches without duplicate `matches` rows.

### Phase 6: Dashboard UI

Objective: make the MVP useful visually.

Tasks:

1. Dashboard summary cards
2. Recent matches table
3. Win/loss trend component
4. Champion summary table
5. Empty/error/loading states

Verification:

- Dashboard works with seeded fixture data
- Dashboard works after live refresh
- Build and lint pass

Phase acceptance test:

- Seed or import at least 10 matches, open `/dashboard`, and confirm recent record, average KDA, CS/min, vision, recent matches, and champion summary render without console/API errors.

### Phase 7: Match Detail and Coach Pages

Objective: expose review and recommendations.

Tasks:

1. Match detail route
2. Match stat sections
3. Mistake flags component
4. Coach summary page
5. Recommendation evidence display

Verification:

- Each insight links back to concrete match/stat evidence
- No recommendation appears without evidence

Phase acceptance test:

- Open one match detail and the coach page. Confirm every shown mistake/recommendation includes concrete evidence such as matchId, champion, stat value, threshold, or recent-match count.

### Phase 8: Containerized Production Shape

Objective: make RiftCoach production-ready as a containerized app before handing it to a platform.

Tasks:

1. Add Dockerfile for apps/api
2. Add Dockerfile for apps/web
3. Add production Docker Compose for web, api, postgres, and network wiring
4. Use env files/secrets that are not committed
5. Add healthchecks for api and web
6. Add database backup/restore notes
7. Keep Hermes root setup untouched

Verification:

- Containers build successfully
- `api` can reach `postgres` through the internal Docker network
- `web` can reach `api` through the configured API URL
- Healthchecks pass

Phase acceptance test:

- Run the production-like compose stack, then confirm `curl http://localhost:<web-port>` returns the frontend and `curl http://localhost:<api-port>/health` returns `riftcoach-api`.

### Phase 9: Dokploy Deployment on VPS

Objective: deploy RiftCoach like a small real product on Francisco's VPS using Dokploy as the preferred platform.

Tasks:

1. Install/configure Dokploy outside the Hermes root setup
2. Connect the GitHub repository using the existing SSH/repo flow
3. Create Dokploy apps/services for web, api, and postgres or attach an external postgres service
4. Configure domains, HTTPS, env vars, and internal service URLs
5. Configure deploy strategy from the main branch
6. Configure restart policy and basic resource limits
7. Document rollback and redeploy steps

Verification:

- Dokploy can build and deploy from GitHub
- Frontend is reachable through the configured public domain
- Backend `/health` is reachable through internal route and, if intended, public route
- Frontend can call backend in the deployed environment
- Reboot/redeploy keeps services healthy

Phase acceptance test:

- Push a harmless UI change to main, trigger/observe Dokploy deploy, and confirm the public domain updates while `/health` remains healthy.

### Phase 10: VPS Observability Stack

Objective: add self-hosted observability suitable for multiple future VPS projects, not only RiftCoach.

Recommended stack:

- Grafana for dashboards
- Prometheus for metrics scraping/storage
- Loki for logs
- Tempo for traces
- OpenTelemetry Collector as the ingestion/router layer
- Optional later: Grafana Alloy if it becomes the simpler collector/agent choice for the VPS

Tasks:

1. Create a shared observability Docker Compose/Dokploy project separate from RiftCoach
2. Configure Prometheus scrape targets for RiftCoach API and platform services
3. Configure Loki log ingestion for containers
4. Configure Tempo trace ingestion
5. Add OpenTelemetry instrumentation hooks to apps/api first
6. Add structured logging to apps/api
7. Add basic Grafana dashboards for uptime, request rate, errors, latency, DB connectivity, and container resource usage
8. Add alerting later only after dashboards are stable

Verification:

- Grafana opens from the admin-only URL
- Prometheus receives metrics
- Loki receives RiftCoach logs
- Tempo receives at least one API trace
- Dashboards show live data after calling the app

Phase acceptance test:

- Call the deployed API `/health` and one real RiftCoach endpoint, then confirm in Grafana that the request appears in metrics, logs, and traces.

---

## 8. Testing Strategy

### Unit Tests

Focus on:

- Riot client URL construction
- Riot error mapping
- Derived metrics
- Mistake rules
- Aggregations
- Coach recommendation logic

### Integration Tests

Focus on:

- Profile save
- Refresh orchestration using mocked Riot responses
- Database persistence and deduplication

### Manual Smoke Tests

Focus on:

- Setup profile
- Refresh matches
- View dashboard
- Open match detail
- Read coach summary

---

## 9. Key Decisions to Confirm Before Coding

1. Riot region/platform for Francisco account, e.g. EUW, LAN, LAS, NA, etc.
2. Whether MVP is single-user only or should include login from day one.
3. Which domain/subdomain layout to use for Dokploy deployment.
4. Whether to create GitHub repo immediately using github.com-hermes SSH alias.
5. Whether to include AI-generated natural-language coaching in MVP or keep deterministic rules first.
6. Whether API is exposed as /api behind the same domain or as a separate api.riftcoach-style subdomain.

Recommended defaults:

- Single-user MVP
- Deterministic coaching first
- Next.js frontend + Bun/Elysia backend + PostgreSQL + Drizzle
- Manual backend refresh first
- Docker Compose for local/dev and production-like container testing
- Dokploy as the preferred VPS deployment platform instead of native systemd services
- Shared observability stack for the VPS: Grafana + Prometheus + Loki + OpenTelemetry Collector + Tempo

---

## 10. Definition of Done for MVP

RiftCoach MVP is done when:

- A Riot profile can be configured
- Recent matches can be imported manually
- Match data is stored without duplicates
- Dashboard shows recent performance and ranked snapshot
- Champions page shows champion pool performance
- Match detail page shows post-game stats and mistake flags
- Coach page gives prioritized recommendations backed by evidence
- App builds successfully on the VPS
- App runs separately from Hermes
