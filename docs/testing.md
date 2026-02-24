# Testing

TaskFlow uses two layers of automated testing:

- **Jest** — 542 unit and integration tests for individual functions, components, hooks, API routes, and validations
- **Playwright** — 47 end-to-end tests that launch a real browser against the running app and live database

---

## Running Tests

### Unit / Integration (Jest)

```bash
npm test                # run all tests
npm run test:watch      # watch mode
npm run test:coverage   # with coverage report
```

Config: `jest.config.js` | Tests: `src/__tests__/`

### End-to-End (Playwright)

```bash
npx playwright test               # headless (default)
npx playwright test --headed       # watch tests run in a browser
npx playwright show-report         # open HTML report with screenshots/traces
```

Config: `playwright.config.ts` | Tests: `e2e/`

Playwright automatically:
1. Seeds the database (schema push + seed script)
2. Starts the dev server on port 3000
3. Runs all tests in Chromium
4. Captures screenshots on failure and traces on retry

---

## Test Accounts

All passwords: `password123`

| Email | Role | Department |
|-------|------|------------|
| admin@taskflow.com | ADMIN | Procurement |
| head@taskflow.com | DEPARTMENT_HEAD | Procurement |
| manager1@taskflow.com | MANAGER | Procurement |
| manager2@taskflow.com | MANAGER | Procurement |
| employee1@taskflow.com | EMPLOYEE | Procurement |
| employee2@taskflow.com | EMPLOYEE | Procurement |
| employee3@taskflow.com | EMPLOYEE | Procurement |
| employee4@taskflow.com | EMPLOYEE | Procurement |
| employee5@taskflow.com | EMPLOYEE | Procurement |

---

## E2E Test Coverage (Phase 1 — Complete)

32 tests across 6 suites. All passing.

### Authentication (`e2e/auth.spec.ts`) — 6 tests

| # | Test | What it proves |
|---|------|----------------|
| 1 | Employee can log in and lands on /dashboard | Employee credentials work, redirect to dashboard works |
| 2 | Manager can log in and lands on /dashboard | Manager credentials work |
| 3 | Admin can log in and lands on /dashboard | Admin credentials work |
| 4 | Department Head can log in and lands on /dashboard | Dept Head credentials work |
| 5 | Invalid password shows error | Wrong password is rejected with "Invalid email or password" |
| 6 | Invalid email shows error | Nonexistent email is rejected with "Invalid email or password" |

### Role-Based Access Gates (`e2e/role-gates.spec.ts`) — 9 tests

| # | Test | What it proves |
|---|------|----------------|
| 1 | Employee visiting /productivity → /dashboard | Employees cannot access productivity page |
| 2 | Employee visiting /kpi-management → /dashboard | Employees cannot access KPI management |
| 3 | Employee visiting /settings/users → /dashboard | Employees cannot access user management |
| 4 | Employee visiting /team → /dashboard | Employees cannot access team page |
| 5 | Employee visiting /announcements → /dashboard | Employees cannot access announcements |
| 6 | Manager can access /productivity | Managers see "Productivity Scores" heading |
| 7 | Manager can access /team | Managers see "Team Overview" heading |
| 8 | Admin can access /kpi-management | Admins see "KPI Management" heading |
| 9 | Admin can access /settings/users | Admins see "User Management" heading |

### Sidebar Navigation (`e2e/sidebar-nav.spec.ts`) — 4 tests

| # | Test | What it proves |
|---|------|----------------|
| 1 | Employee sidebar | Sees Dashboard, Tasks, Daily Planning, Settings only. Does NOT see Team, Productivity, Announcements, KPI Management, User Management |
| 2 | Manager sidebar | Sees Dashboard, Tasks, Daily Planning, Team, Productivity, Settings. Does NOT see Announcements, KPI Management, User Management |
| 3 | Department Head sidebar | Sees all except KPI Management and User Management |
| 4 | Admin sidebar | Sees every nav item |

### User Management (`e2e/user-management.spec.ts`) — 4 tests

| # | Test | What it proves |
|---|------|----------------|
| 1 | Admin sees users table | User management page loads with real data from the database |
| 2 | Admin can create a new user | The full create-user flow works: form modal opens, fields fill correctly, submission succeeds, toast confirms |
| 3 | Admin can edit a user's role | Edit modal opens, role can be changed, save succeeds |
| 4 | Admin can deactivate a user | Deactivation button works, confirmation dialog appears, user gets deactivated |

### Task Lifecycle (`e2e/task-flow.spec.ts`) — 5 tests

| # | Test | What it proves |
|---|------|----------------|
| 1 | Employee can create a task | Full task creation flow: title, KPI bucket, deadline picker, submit, success toast |
| 2 | Employee can start a task (NEW → IN_PROGRESS) | "Start" quick action works, task moves columns |
| 3 | Employee can complete a task (IN_PROGRESS → COMPLETED_PENDING_REVIEW) | "Complete" quick action works |
| 4 | Manager can approve a task (COMPLETED_PENDING_REVIEW → CLOSED_APPROVED) | Manager switches to team view, "Approve" quick action works |
| 5 | Kanban columns render correctly | All four columns (To Do, In Progress, In Review, Done) are visible |

### Productivity (`e2e/productivity.spec.ts`) — 4 tests

| # | Test | What it proves |
|---|------|----------------|
| 1 | Manager sees leaderboard | Productivity page loads, leaderboard tab is visible |
| 2 | Admin can recalculate all scores | "Recalculate All" button works, API responds, success toast appears |
| 3 | Score row opens scorecard dialog | Clicking a row opens the detail dialog |
| 4 | Admin can switch to Scoring Config tab | Config tab renders for admin |

---

## E2E Test Coverage (Phase 2 — Complete)

15 tests across 4 suites. All passing.

### Task Form Validation (`e2e/task-validation.spec.ts`) — 3 tests

| # | Test | What it proves |
|---|------|----------------|
| 1 | Submit empty form shows validation errors | Zod client-side validation fires on empty submit: title error ("Title must be at least 3 characters") and kpiBucketId/deadline errors ("Invalid input: expected string, received undefined") appear. Dialog stays open, no API call made. |
| 2 | Title too short (2 chars) shows error | Title minimum length validation works at the boundary (2 chars rejected, 3 chars accepted) |
| 3 | Fill all required fields submits successfully | Full round-trip: title + KPI bucket + deadline → form submits, dialog closes, success toast appears |

### Negative Task Transitions (`e2e/task-transitions-negative.spec.ts`) — 5 tests

| # | Test | What it proves |
|---|------|----------------|
| 1 | Employee does NOT see Approve/Reject on own pending-review task | Permission enforcement: employee sees "Withdraw" but not "Approve"/"Reject" on their own COMPLETED_PENDING_REVIEW task |
| 2 | Employee only sees their own tasks | Data isolation: employee1 does NOT see employee3's "Delivery Coordination" task |
| 3 | Manager CAN see Approve/Reject on subordinate's pending-review task | Manager permission works: "Approve" and "Reject" buttons visible in team view |
| 4 | Manager does NOT see non-subordinate tasks in team view | Hierarchy isolation: manager2 cannot see employee1's tasks (employee1 reports to manager1) |
| 5 | Employee sees correct quick actions per task status | "Start" visible on NEW tasks, "Complete"/"Pause"/"Undo" visible on IN_PROGRESS tasks |

### Search and Filters (`e2e/task-search-filters.spec.ts`) — 4 tests

| # | Test | What it proves |
|---|------|----------------|
| 1 | Search by title filters the board | Typing in search box filters kanban cards after debounce, matching task remains visible |
| 2 | Search with no results shows empty board | Non-matching search query causes all task cards to disappear |
| 3 | Status filter narrows the board | Selecting "New" status shows only NEW tasks, hides IN_PROGRESS tasks |
| 4 | Clear all filters resets the board | "Clear all" button removes active filters, tasks from multiple statuses reappear |

### Edge Cases (`e2e/edge-cases.spec.ts`) — 3 tests

| # | Test | What it proves |
|---|------|----------------|
| 1 | Deactivated user cannot log in | Admin deactivates employee5, employee5 gets "Invalid email or password" on login, admin reactivates for cleanup |
| 2 | mustChangePassword user is redirected to /settings | Admin creates new user, logs in as new user → redirected to `/settings?passwordChange=required`, amber alert visible, navigating to /dashboard redirects back |
| 3 | Rate limiter blocks excessive login attempts | 6 rapid login attempts with wrong password all stay on /login page (rate limiter kicks in after 5) |

---

## E2E Test Roadmap (Phase 3 — Planned)

6 remaining test suites to implement, in priority order.

### 1. Task Assignment by Manager

Manager creates a task and assigns it to a specific employee using the "Assign To" dropdown. Then log in as that employee and verify the task appears on their board.

### 2. Daily Planning

Employee can open the Daily Planning page, see their tasks for today, and interact with the planning UI.

### 3. KPI Management (Admin CRUD)

Admin can create a new KPI bucket, edit an existing one, and delete one. Verify the changes reflect in the task creation form's KPI dropdown.

### 4. Announcements (Department Head)

Department Head can create an announcement. Other roles in the same department can see it on the Announcements page.

### 5. Settings / Password Change

User changes their password through the settings page. Log out and log back in with the new password successfully. Old password is rejected.

### 6. Dashboard Stats

After seeding, verify the dashboard shows the correct stat cards (task counts, active streak, etc.) matching the seed data.

---

## Notes for Writing New Tests

### Rate Limiting

The app has a 5-requests-per-minute rate limiter on login, keyed by email. The login helper (`e2e/helpers/auth.ts`) automatically retries once after a 13-second wait if it hits the limit. To avoid delays:
- Use different test accounts across different test suites
- Available accounts: employee1-5, manager1-2, head, admin

### File Structure

```
e2e/
  helpers/
    auth.ts                        # loginAs(), loginAsRole(), TEST_USERS
  auth.spec.ts                     # authentication tests (Phase 1)
  role-gates.spec.ts               # authorization / redirect tests (Phase 1)
  sidebar-nav.spec.ts              # sidebar visibility per role (Phase 1)
  user-management.spec.ts          # admin user CRUD (Phase 1)
  task-flow.spec.ts                # task lifecycle (Phase 1)
  productivity.spec.ts             # productivity scoring (Phase 1)
  task-validation.spec.ts          # form validation (Phase 2)
  task-transitions-negative.spec.ts # permission enforcement (Phase 2)
  task-search-filters.spec.ts      # search and filters (Phase 2)
  edge-cases.spec.ts               # deactivation, mustChangePassword, rate limit (Phase 2)
  global-setup.ts                  # seeds database before test run
```

### Selectors Cheat Sheet

| Element | Selector |
|---------|----------|
| Email input | `#email` |
| Password input | `#password` |
| Sign in button | `getByRole("button", { name: "Sign in" })` |
| Login error | `.text-red-600` |
| Sidebar nav link | `nav a[href="/dashboard"]` |
| Dialog/modal | `[role=dialog]` |
| Alert dialog | `[role=alertdialog]` |
| Toast notification | `[data-sonner-toast]` |
| Task title input | `#title` |
| Kanban columns | `getByText("To Do")`, `getByText("In Progress")`, etc. |
| Quick action buttons | `getByRole("button", { name: "Start" })`, `"Complete"`, `"Approve"` |
