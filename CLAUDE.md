# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` — Start Next.js dev server
- `npm run build` — Production build (includes Prisma generation)
- `npm run lint` — ESLint

### Testing
- `npm test` — Run all Jest tests once
- `npm run test:watch` — Jest watch mode
- `npm run test:coverage` — Jest with coverage
- `npx jest path/to/file.test.ts` — Run a single test file
- `npx playwright test` — Run E2E tests (sequential, chromium only)
- `npx playwright test e2e/specific.spec.ts` — Single E2E spec

### Database (Prisma + PostgreSQL)
- `npm run db:migrate` — Create and apply migration
- `npm run db:push` — Push schema changes without migration files
- `npm run db:seed` — Run base seed
- `npm run db:seed:productivity` — Seed productivity test data
- `npm run db:studio` — Open Prisma Studio
- `npm run db:reset` — Full database reset (destructive)

## Architecture

**Next.js 16 App Router** with React 19, TypeScript (strict), PostgreSQL via Prisma 6.

### Route Groups
- `src/app/(auth)/` — Login page with public layout
- `src/app/(dashboard)/` — All protected pages (sidebar + header layout)
- `src/app/api/` — API route handlers

### Core Domain

**Tasks** — Central entity with a state machine (`lib/utils/task-state-machine.ts`):
`NEW → ACCEPTED → IN_PROGRESS → ON_HOLD / COMPLETED_PENDING_REVIEW → CLOSED_APPROVED / REOPENED`
Tasks have size (EASY=1pt, MEDIUM=2pt, DIFFICULT=4pt), priority (Eisenhower matrix), and KPI bucket assignments.

**Productivity Scoring** — Four-pillar system in `src/lib/productivity/`:
- `scoring-engine.ts` — Pure scoring functions for Output, Quality, Reliability, Consistency
- `fetch-scoring-data.ts` — Gathers all data needed for scoring
- `calculate.ts` — Orchestrates scoring, persists results and weekly snapshots

Department-level weights are configured via `ScoringConfig`. Scores are persisted to `ProductivityScore` (current) and `ProductivitySnapshot` (weekly history).

**Analytics** — Three endpoints (`/api/analytics/`) for company health, department comparison, and trends. Use DB-level aggregation (Prisma aggregate + raw SQL) for performance.

### Auth & Permissions
- NextAuth.js with JWT strategy, credentials provider, 8-hour sessions
- Four roles: `EMPLOYEE`, `MANAGER`, `DEPARTMENT_HEAD`, `ADMIN`
- Permission checks in `src/lib/utils/permissions.ts` — role-based matrix with specific capabilities (canViewTask, canApproveTask, canViewAnalytics, etc.)
- Middleware (`src/middleware.ts`) enforces route-level guards and password change redirects
- Rate limiting via in-memory sliding window (`src/lib/rate-limit.ts`): authLimiter (5/min), mutationLimiter (10/min), generalLimiter (100/min)

### Data Fetching Patterns
- Server Components by default; `"use client"` for interactive features
- `src/lib/auth-fetch.ts` — Fetch wrapper that handles 401 (auto sign-out), 403, 429 with toast notifications
- Zod validation schemas in `src/lib/validations/` for both API input and form validation
- Forms use React Hook Form + Zod resolvers

### UI Stack
- shadcn/ui components (Radix UI primitives) in `src/components/ui/`
- Tailwind CSS 4 with `cn()` utility from tailwind-merge
- Recharts for data visualization, Lucide React for icons, Sonner for toasts

## Testing

- **Unit/Integration**: Jest + @testing-library/react. Tests live in `src/__tests__/`. Mock fixtures in `src/__tests__/helpers.ts` (mock users, tasks).
- **E2E**: Playwright specs in `e2e/` with global setup for auth. Runs sequentially (1 worker).
- `jest.setup.js` mocks ResizeObserver, IntersectionObserver, window.matchMedia, next/navigation, and next-auth/react.

## Key Conventions

- Import alias: `@/*` maps to `src/*`
- Prisma schema: `prisma/schema.prisma` (20 models)
- Prisma singleton: `import { prisma } from "@/lib/prisma"`
- Transactions use `prisma.$transaction` with callback pattern (`async (tx) => { ... }`)
- API routes validate with Zod, return `NextResponse.json()`
- Band thresholds for health scores: Thriving ≥80, Healthy ≥60, At Risk ≥40, Critical <40
