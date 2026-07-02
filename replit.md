# Live Match Intelligence Engine (LMIE)

Real-time World Cup 2026 sports intelligence platform with TxLINE-compatible odds simulation, autonomous Sharp Movement Detector agent (60s cycles), Solana devnet on-chain signal anchoring, and a dual Fan/Analyst UI. Built for the TxLINE hackathon track.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, via workflow)
- `pnpm --filter @workspace/lmie run dev` — run the frontend (port auto, via workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `SESSION_SECRET` — set in Replit secrets

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (artifacts/api-server, port 8080, path /api)
- Frontend: React + Vite + Tailwind v4 + TanStack Query + Recharts + framer-motion (artifacts/lmie, path /)
- DB: PostgreSQL + Drizzle ORM (not currently used — state is in-memory)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at lib/api-spec)
- Build: esbuild (CJS bundle for API server)

## Where things live

- `artifacts/api-server/src/` — Express API server
  - `lib/matchEngine.ts` — World Cup 2026 fixtures, simulation, match state machine
  - `lib/txlineAdapter.ts` — TxLINE-compatible odds simulation
  - `lib/solanaAnchor.ts` — Solana devnet memo anchoring, keypair management
  - `lib/sharpDetector.ts` — Autonomous agent (60s cycle), sharp movement detection
  - `routes/` — matches, intelligence, odds, agent routes
- `artifacts/lmie/src/` — React frontend
  - `pages/` — Dashboard, MatchView, IntelligenceSummary, AgentPage
  - `components/layout/AppLayout.tsx` — nav with Dashboard/Intelligence/Agent links
  - `components/match/` — SignalCard, NarrativeFeed, IndicesDashboard, MatchEventsLog, StateHistoryTimeline
  - `components/shared/` — StateBadge, IndexBar
- `lib/api-spec/` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/` — Generated hooks (via Orval)

## Architecture decisions

- Contract-first: OpenAPI spec → Orval codegen → typed hooks. Never write fetch calls manually.
- All match state is in-memory (no DB persistence) — matches restart automatically on server restart.
- Solana keypair is generated fresh on each server start; devnet airdrop is rate-limited and fails gracefully.
- Sharp movements are detected on 60s autonomous cycles but thresholds require ≥4% odds movement — early cycles show 0 detections until odds diverge enough.
- Match list endpoint (`/api/matches`) returns `Match[]` WITHOUT `indices` — only the snapshot endpoint returns `MatchIndices`.

## Product

- **Dashboard** — Hero header, 5-stat bar (matches/signals/movements/anchors/cycles), live match cards with flag emojis + state badges + index bars, agent mini-card with countdown
- **MatchView** — Fan mode (momentum gauge, narrative feed) and Analyst mode (TxLINE odds panel, Recharts odds history chart, signals, sharp movements, state timeline)
- **Intelligence** — Cross-match 8-stat grid, active state distribution, agent status panel
- **Agent** — Full autonomous agent dashboard: cycles, detections, accuracy, Solana wallet, detection log table, on-chain anchors table

## Solana Wallet

Wallet address: `BrCdTBReMTD7J98BSCG4UHzWifR5mX9KU8dFMEVqEdTj` (devnet)
Explorer: https://explorer.solana.com/address/BrCdTBReMTD7J98BSCG4UHzWifR5mX9KU8dFMEVqEdTj?cluster=devnet
Airdrop fails with "Internal error" due to devnet RPC rate limits — fund manually to enable anchoring.

## User preferences

_None recorded yet._

## Gotchas

- `IndexBar` color prop: only `primary | amber | red | cyan | violet | emerald` — no "destructive" or "purple"
- `StateBadge` has no `className` prop — only `state` and optional `size`
- Never add query params to OpenAPI operations (causes TS2308 in codegen output)
- Match list type `Match` does NOT include `indices` — only `MatchSnapshot` does
- Do not run codegen in watch mode; run `pnpm --filter @workspace/api-spec run codegen` manually after spec changes
- API server path prefix is `/api` — all routes are under that prefix

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Generated hooks live in `lib/api-client-react/src/generated/api.ts`
- Hook pattern: `useGetMatch(matchId, { query: { enabled: !!matchId, queryKey: getGetMatchQueryKey(matchId) } })`
