# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

This is a pnpm workspace monorepo (`pnpm-workspace.yaml`) with two packages:

- **Root (`./`)** — Vite + React 18 + TypeScript frontend (Dyad-scaffolded). Uses shadcn/ui (full Radix set pre-installed), Tailwind CSS, TanStack Query, React Router, Framer Motion, Mappls maps SDK, and `jose` for JWE.
- **`backend/`** — Express 5 + TypeScript API. Uses `@supabase/supabase-js` (service-role client, `persistSession: false`), `multer` for uploads, `swagger-jsdoc` + `swagger-ui-express` for docs at `/api-docs`, and `jose` for JWE-based auth.
- **`SimplyTicketzNew/`** — A nested copy of the same project (Dyad generates this). Treat as legacy/duplicate; the authoritative sources are at the repo root and `backend/`.
- **`simply-ticketz/`** — Contains only `pnpm-workspace.yaml`; leftover/scratch workspace.
- **`public/`** — Static assets served by Vite.

## Commands

All commands run from the repo root unless noted. Use `pnpm` (lockfile is `pnpm-lock.yaml`).

**Frontend (root)**
- `pnpm dev` — start Vite dev server (host `::`, port `32109`).
- `pnpm build` — production build (`vite build`).
- `pnpm build:dev` — development-mode build (`vite build --mode development`).
- `pnpm lint` — ESLint over `.` (flat config, `eslint.config.js`). No tests are configured.
- `pnpm preview` — preview the production build.

**Backend (`backend/`)**
- `pnpm --filter backend dev` — `ts-node-dev --respawn --transpile-only src/index.ts` (port `5000`, Swagger UI at `http://localhost:5000/api-docs`).
- `pnpm --filter backend build` — `tsc` to `dist/`.
- `pnpm --filter backend start` — `node dist/index.js`.
- The backend has no lint or test scripts.

There is no top-level test runner, so "run a single test" is not applicable.

## Environment Variables

`.env` is gitignored — values live only on each developer machine and are not committed.

- **Root `.env`** (Vite, must be `VITE_`-prefixed):
  - `VITE_API_URL` — backend base URL (default `http://localhost:5000/api`).
  - `VITE_MAPPLS_ACCESS_TOKEN` — Mappls SDK access token.
- **Backend `.env`** (loaded via `dotenv.config()` in `backend/src/index.ts`, `config/supabase.ts`, and `middleware/authMiddleware.ts`):
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — required; the Supabase client throws if either is missing.
  - `JWT_SECRET` — defaults to a 32-char placeholder if unset (`authMiddleware.ts`).
  - `PORT` — defaults to `5000`.

## Frontend Architecture

- **Entry & routing** — `src/main.tsx` mounts `<App />`. All routes are declared in `src/App.tsx` (single source of truth for routes — do not split). It wraps the tree in `QueryClientProvider` → `TooltipProvider` → dual toasters (`@/components/ui/toaster` and Sonner) → `BrowserRouter`. The route map distinguishes **public** (`/`, `/users`, `/merchants`, `/merchant-services`, `/merchant-subscriptions`, `/book/:serviceId`, `/view-site-map`), **admin** (`/admin/*`), and **merchant** (`/merchant/*`) paths.
- **Pages** live in `src/pages/`. The default page is `Index.tsx`. New components must be wired into `Index.tsx` or the relevant page, otherwise they are invisible.
- **Components** in `src/components/`: app-level (`Navbar`, `Hero`, `EventCard`, `CategoryFilter`, `Footer`, `SiteMapDialog`), merchant service-management tabs (`service-mgmt/` — `CategoryTab`, `DeviceTab`, `ServiceTab`, `TimeslotTab`), and the unmodified shadcn/ui library (`ui/`).
- **Path alias** — `@/*` → `./src/*` (both `vite.config.ts` and `tsconfig.json`). Use `@/components/ui/...` for shadcn primitives, `@/lib/utils` for `cn()`, `@/hooks/...` for hooks.
- **Config helper** — `src/config.ts` exposes `API_URL` and `MAPPLS_TOKEN`. Map bootstrap goes through `src/utils/maps.ts` (`initMapplsMap`); it is a module-level singleton, so multiple map instances in the same session share initialization state.
- **Styling** — Tailwind with shadcn tokens; `tailwind.config.ts`, `postcss.config.js`, `src/globals.css`. Do not edit files under `src/components/ui/` — clone into a new component if you need changes.

## Backend Architecture

`backend/src/index.ts` is the composition root:

1. Loads env, opens CORS (`origin: '*'`, `Authorization` header allowed), parses JSON.
2. Mounts Swagger UI at `/api-docs` using the spec from `config/swagger.ts`.
3. Declares public auth routes inline: `POST /api/login`, `POST /api/logout`, `POST /api/guestLogin` (delegated to `controllers/userController`).
4. Mounts public/semi-public routers: `merchantEnquiryRoutes`, `countryRoutes`, `stateRoutes`, `userTypeRoutes`, and `/api/documents` (`documentRoutes`).
5. Mounts the rest as `/api` routers — all rely on `authorizeRoles(...)` from `middleware/authMiddleware.ts`.

**Request flow** — `routes/*` → `controllers/*` → `services/*` (only `merchantService.ts` and `userService.ts` exist; most controllers call Supabase directly) → Supabase client from `config/supabase.ts`. Typed via `types/database.types.ts`.

**Auth model** — `authMiddleware.ts` decrypts JWE (compact, via `jose`) using `JWT_SECRET`, reads `role` from the payload, and rejects with `401`/`403` unless the role is in `roles`. The token is attached to `req.user`. There is no session store — Supabase is configured with `persistSession: false`, `autoRefreshToken: false`, so every request re-validates the JWE.

**File uploads** — `multer` is in deps but no controller is mounted on a multipart route in `index.ts`; if you add upload endpoints, wire them through `multer` and use the Supabase service-role key.

## Cross-Cutting Conventions

- **Dyad rules (`AI_RULES.md`)** — Dyad edits the project. New pages go in `src/pages/`, new components in `src/components/`, shadcn/ui is the primitive library, and the main page is `src/pages/Index.tsx`. Update it when adding user-facing components.
- **No tests, no CI config** in the repo.
- **Vercel** — `vercel.json` rewrites all paths to `/index.html` (SPA fallback).
- **Vite plugin** — `@dyad-sh/react-vite-component-tagger` is enabled in dev; it instruments components for Dyad's editor.
- **Secrets** — `.env`, `Gemini Api Keys.txt`, and the Supabase keypair files in the parent `.ollama/` directory are not committed. Never commit credentials.