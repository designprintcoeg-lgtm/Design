# Design Print Production Tracker

A full-stack production management system for a printing and packaging company with 5 production lines. Manages the full lifecycle from quotation to delivery — tracking job orders, production stages, machines, inventory, QC, and costing.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000/8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + TailwindCSS + shadcn/ui + recharts
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — all 10 Drizzle schema files (users, customers, quotations, salesOrders, jobOrders, jobStages, machines, materials, jobCosting, qcChecklists)
- `lib/api-spec/` — OpenAPI spec (source of truth for API contracts)
- `lib/api-client-react/src/generated/` — generated hooks and Zod schemas (run codegen to regenerate)
- `artifacts/api-server/src/routes/` — 14 route files (auth, users, customers, quotations, salesOrders, jobOrders, jobStages, machines, materials, costing, qc, dashboard, reports, health)
- `artifacts/api-server/src/middlewares/auth.ts` — in-memory session auth middleware
- `artifacts/design-print/src/pages/` — all 12 frontend pages
- `artifacts/design-print/src/lib/auth-context.tsx` — auth context with token management

## Architecture decisions

- Auth uses in-memory session map with plain-text passwords (demo mode). Token stored as `Bearer` header on every API call via `setAuthTokenGetter` hook in custom-fetch.ts.
- Production workflows are hardcoded per production line (offset_printing, silk_screen, plastic_bags, corrugated_carton, flowpack). Each job order gets stages auto-created when the job is created.
- Numeric fields in DB use Drizzle `numeric()` type which returns strings from PostgreSQL — all route handlers parse them with `parseFloat()`.
- Dashboard aggregations are computed on-the-fly from the database (no caching). For production, consider materialized views.
- `routes/index.ts` imports and mounts all 14 routers.

## Product

- **Login** — Username/password auth with role-based access
- **Dashboard** — Live summary cards, bar/pie charts, urgent/delayed job lists, machine load status
- **Customers** — Full CRUD with search, contact info, type/source tracking
- **Quotations** — Full CRUD, status flow (draft→sent→approved→rejected), "Convert to Order" button for approved quotations
- **Sales Orders** — Full CRUD, "Generate Job Order" for confirmed orders, payment and order status tracking
- **Job Orders** — Full CRUD with filters, status/priority/line badges, delayed flag, link to detail page
- **Job Order Detail** — Stage progress timeline, advance stage button, QC checklist, job costing panel
- **Kanban Board** — Jobs grouped by current production stage with advance-stage buttons
- **Machines** — Management by production line, status badges
- **Inventory** — Materials with low-stock alerts, full CRUD
- **Reports** — 7 report tabs: Production Performance, Delayed Jobs, Waste, Machine Utilization, Profitability, QC Rejection, Low Stock Alerts
- **Users** — Admin-only: create/edit/delete users with 11-role system

## User preferences

- Colors: Red #D32F2F primary, Dark #1F1F1F sidebar
- No emojis in UI
- Dense, industrial "control room" aesthetic

## Gotchas

- After adding new route files, always restart the API server workflow (routes are compiled with esbuild)
- The `@workspace/api-client-react` package exports `./src/custom-fetch` as a sub-path for token injection
- Drizzle `numeric()` columns return strings from DB — always parseFloat() before arithmetic or JSON output
- Always run `pnpm --filter @workspace/db run push` after modifying schema files

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Default admin credentials: username `admin`, password `admin123`
- Other users: username format `sales01`, `ops01`, `designer01`, etc. — all use password `pass123`
