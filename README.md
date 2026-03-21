# TaskFlow

A task management and employee productivity platform built for teams that want visibility into output, quality, reliability, and consistency. TaskFlow combines task tracking, daily planning, productivity scoring, and team oversight into one system.

## What It Does

- **Task Management** — Kanban board with drag-and-drop, state machine workflow (New → Accepted → In Progress → On Hold / Completed → Closed / Reopened), Eisenhower priority matrix, and manager approval flow
- **Productivity Scoring** — Four-pillar scoring system (Output, Quality, Reliability, Consistency) with configurable department-level weights, weekly snapshots, and historical trends
- **Daily Planning** — Morning/evening rituals with task planning, time estimation, carry-forward for overdue tasks, and streak tracking with celebrations
- **Analytics** — Company health dashboard, department comparison, trend charts, at-risk employee alerts, and score distribution bands (Thriving/Healthy/At Risk/Critical)
- **Team Oversight** — Pending review queue, task reassignment, team member workload visibility, and manager approval workflows
- **KPI Buckets** — Customizable performance categories with per-user assignments for targeted scoring
- **Recognition** — Six recognition types (Star of Day, High Performer, Best Team Player, Most Improved, Efficient Star, Consistency King) with dashboard widgets
- **Announcements** — Company-wide communications with priority levels and expiration dates

## Tech Stack

- **Framework**: Next.js 16 (App Router) with React 19
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL via Prisma 6 (21 models)
- **Auth**: NextAuth.js with JWT strategy, 4 roles (Employee, Manager, Department Head, Admin)
- **UI**: shadcn/ui (Radix UI), Tailwind CSS 4, Recharts, Lucide icons
- **Forms**: React Hook Form + Zod validation
- **Testing**: Jest + Testing Library (unit/integration), Playwright (E2E)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm

### Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and NEXTAUTH_SECRET

# Run database migrations
npm run db:migrate

# Seed initial data
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run all tests |
| `npm run test:coverage` | Tests with coverage |
| `npm run db:migrate` | Create and apply migrations |
| `npm run db:push` | Push schema without migration files |
| `npm run db:seed` | Seed base data |
| `npm run db:seed:demo` | Seed demo data |
| `npm run db:seed:productivity` | Seed productivity test data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | Full database reset |

## Roles & Permissions

| Role | Tasks | Team | Analytics | KPI Config | Admin |
|------|-------|------|-----------|------------|-------|
| Employee | Own tasks | - | - | - | - |
| Manager | Team tasks + approvals | View team | - | - | - |
| Department Head | Department tasks | Full team | View | - | Announcements |
| Admin | All tasks | All teams | Full access | Configure | Full access |

## Project Structure

```
src/
  app/
    (auth)/          # Login page
    (dashboard)/     # Protected pages (dashboard, tasks, analytics, team, etc.)
    api/             # API route handlers
  components/ui/     # shadcn/ui components
  lib/
    productivity/    # Scoring engine, data fetching, calculation
    utils/           # Permissions, task state machine
    validations/     # Zod schemas
```
