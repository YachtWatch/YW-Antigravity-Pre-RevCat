# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Vite dev server

# Build & Type Check
npm run build        # tsc + vite build

# Lint (warnings treated as errors)
npm run lint         # ESLint on all .ts/.tsx files

# Testing
npx vitest           # Run unit tests
npx vitest run       # Run unit tests once (CI mode)
npx vitest run src/path/to/file.test.ts  # Run a single test file
npx playwright test  # Run e2e tests

# Native (requires Capacitor CLI)
npx cap sync         # Sync web build to iOS/Android
npx cap open ios     # Open Xcode
npx cap open android # Open Android Studio
```

## Architecture

**YachtWatch** is a yacht crew management app for watch scheduling, crew manifests, and real-time check-ins. It targets web (Vercel) and native iOS/Android (Capacitor).

### Stack

- **React 18 + TypeScript + Vite** — SPA with lazy-loaded routes
- **Supabase** — PostgreSQL database, Auth, and Realtime subscriptions
- **Capacitor** — Native bridge for iOS/Android (LocalNotifications, StatusBar, SplashScreen)
- **RevenueCat** (`@revenuecat/purchases-capacitor`) — Cross-platform in-app subscriptions
- **Tailwind CSS + Radix UI** — Styling and accessible primitives

### State Management

Three React Contexts drive the app:

1. **`AuthContext`** (`src/contexts/AuthContext.tsx`) — Auth session, user profile, localStorage caching for instant load. Handles parallel DB queries on login to minimize cold-start time.
2. **`DataContext`** (`src/contexts/DataContext.tsx`) — Vessels, crew members, watch schedules, join requests, check-ins. All Supabase CRUD lives here. This is the largest file (~44KB).
3. **`SubscriptionContext`** (`src/context/SubscriptionContext.tsx`) — RevenueCat state: subscription status, offerings, purchase/restore flows.

### Routing & Role-Based Access

`src/App.tsx` defines routes with `ProtectedRoute` guarding auth. `DashboardIndex.tsx` redirects users to captain or crew dashboards based on `profile.role`.

- Captain routes: `/dashboard/captain`, `/dashboard/captain/generate-schedule`
- Crew routes: `/dashboard/crew`
- Shared: `/profile`, `/settings`, `/subscription`

### Database

Supabase PostgreSQL with Row-Level Security. Key tables:
- `profiles` — extends Supabase auth users (role, vessel_id, nationality, passport_number)
- `vessels` — yacht data with join_code for crew invitations
- `vessel_members` — crew-vessel relationships (watch_leader flag)
- `join_requests` — pending|approved|rejected crew applications
- `schedules` — watch slots array (anchor/navigation/dock watch types)

Migration scripts live in `scripts/` (SQL files). RLS policies ensure users only access their vessel's data.

### Platform Detection

Use `Capacitor.isNativePlatform()` to branch between native and web behavior. Native-only features: RevenueCat purchases, LocalNotifications, StatusBar styling.

### Key Services & Utilities

- `src/lib/supabase.ts` — Supabase client
- `src/lib/scheduler.ts` — Watch schedule generation algorithm
- `src/lib/time-utils.ts` — Timezone-aware date/time helpers
- `src/services/NotificationService.ts` — Capacitor LocalNotifications for watch reminders
- `src/hooks/useNotifications.ts` — Supabase Realtime listeners (profile, schedule, join request changes)
- `src/hooks/useWatchLogic.ts` — Watch assignment and check-in business logic

### Environment Variables

Vite exposes variables with prefixes: `VITE_`, `SUPABASE_`, `REVENUECAT_`, `APP_URL`.

Required:
- `VITE_SUPABASE_URL` / `SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY`
- `REVENUECAT_API_KEY_APPLE` / `REVENUECAT_API_KEY_GOOGLE`
