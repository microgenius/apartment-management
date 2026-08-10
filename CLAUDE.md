# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # tsc -b (typecheck) && vite build
npm run lint     # ESLint over the whole repo
npm run preview  # Preview a production build
```

No test runner is configured in this repo. `npm run build` is the closest thing to a correctness check (it runs `tsc -b` first, so type errors fail the build).

Database schema changes live as standalone SQL files, not a migration tool: `supabase-schema.sql` and `supabase-user-profiles.sql` are the base schema; incremental changes go in `scripts/*.sql` (see `scripts/README.md` for what each one does and how to run it via the Supabase SQL Editor). When adding a DB column/table, add a new `scripts/<name>.sql` file rather than editing the base schema files, and use `ON CONFLICT ... DO NOTHING` / idempotent `ALTER TABLE ... IF NOT EXISTS` style so scripts are safe to re-run.

## Architecture

Turkish-language site/apartment management SPA: React 19 + TypeScript + Vite, TailwindCSS, Supabase (Postgres + Auth) as the only backend, Gemini API for one AI feature. No router — navigation is a single `activeTab` string in `App.tsx` that conditionally renders one view at a time.

### Data flow: Supabase → services → hooks → App.tsx → views

- `src/lib/supabase.ts` — Supabase client plus hand-written `Database` types (table Row/Insert/Update shapes). There is no generated-types step; when the DB schema changes, update these types by hand.
- `src/services/*Service.ts` — one file per table, thin CRUD wrappers around `supabase.from(...)`. This is the only layer that talks to Supabase directly.
- `src/hooks/use*.ts` — one hook per service, holds the `useState`/`useEffect` fetch-on-mount + loading/error state, and exposes a setter for optimistic local updates after a service call.
- `App.tsx` calls every top-level hook, computes derived state (theme, translator, base CSS classes, debt calculations), and prop-drills everything into whichever view matches `activeTab`. Views are otherwise self-contained and receive all data/callbacks as props — there's no context beyond auth.

When adding a new data entity, follow this same four-layer chain (table → service → hook → wire into `App.tsx`) rather than fetching from a component directly.

### Auth & roles

- `src/contexts/AuthContext.tsx` wraps the app (`main.tsx`) and owns Supabase session state plus the app-specific `user_profiles` row (`userProfilesService`), exposing `userRole: 'resident' | 'admin' | null`. Profile lookups are cached per-user-id in a ref to avoid refetching on every render.
- `src/components/auth/ProtectedRoute.tsx` gates the entire app behind a logged-in session; unauthenticated users see `LoginPage.tsx` instead of the app shell.
- Roles are fixed at creation time and not user-switchable. `admin` can create users and reassign the admin role via `SettingsView`; `resident` sees a subset of tabs. Role checks are UI-only (`userRole === 'admin'`) — there is no RLS enabled yet, so nothing here is a real security boundary (see `ROLE_SYSTEM.md` / `AUTHENTICATION_SETUP.md`).
- Full role/permission behavior and the admin-transfer flow are documented in `ROLE_SYSTEM.md`; auth setup/config steps are in `AUTHENTICATION_SETUP.md`.

### Debt/ledger calculation

`src/utils/helpers.ts` is where the non-obvious business logic lives:
- `getResidentLedgerWithPlanning` synthesizes projected monthly dues between `debt_start_date` and the configured `meetingDate` (both stored in the `settings` table via `useSettings`), filling in months that don't have an actual `ledgers` row yet, and marking past/current synthesized months `unpaid` vs future ones `planned`.
- `calculateTotalDebt` sums `unpaid` + the remaining portion of `partial_paid` ledger items.
- `sortLedgerItems` imposes a fixed status display order (unpaid → partial_paid → planned → paid).

Any view showing debt totals or ledger lists should go through these helpers rather than re-deriving the logic locally, so the planning/partial-payment rules stay in one place.

### i18n, theming, persistence

- `src/constants/translations.ts` holds TR/EN string tables; `createTranslator` turns them into a `t(key)` function passed as a prop through the whole tree. There's no key-namespacing — all keys are flat in one object per language.
- `src/constants/themes.ts` defines 4 color themes as Tailwind class bundles; `getBaseClasses(darkMode)` in `helpers.ts` produces the dark/light class set. Both are plain objects looked up by name, not CSS variables.
- Language, theme, and dark-mode preferences persist via `src/utils/cookies.ts` (not localStorage), read/written directly in `App.tsx`.

### AI feature

`src/config/api.ts` (`callGemini`) is a single fetch wrapper around the Gemini `generateContent` endpoint, used only from `RequestBoxView` to auto-draft a meeting agenda from resident requests marked `inAgenda`. Failures degrade to a Turkish "service unavailable" string rather than throwing.

## Environment variables

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GEMINI_API_KEY=        # optional, only needed for AI agenda generation
```

Copy `.env.example` to `.env`. Full Supabase project setup (schema, first admin user, auth provider config) is in `SUPABASE_SETUP.md`.
