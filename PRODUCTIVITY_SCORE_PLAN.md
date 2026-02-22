# Employee Productivity Score (EPS) — Implementation Plan

## Overview

A composite score (0-100) for each employee, calculated from 4 objective pillars using behavioral data already captured in TaskFlow. No surveys, no self-assessments — just system-tracked actions.

## Scoring Window

- Rolling **4-week window** (28 days back from today)
- Weekly snapshots stored for trend tracking (growth comes free from comparing snapshots)

---

## Pillar 1: Output Score (0-100) — Weight: 35%

**What:** Weighted task completion volume.

```
Size weights:     EASY=1, MEDIUM=2, DIFFICULT=4
Priority bonus:   URGENT_IMPORTANT=×1.5, all others=×1

Points = Σ (size_weight × priority_multiplier) for each CLOSED_APPROVED task
         where completedAt falls within the 4-week window

Score = min(100, (points / (weekly_target × 4)) × 100)
```

- `weekly_target` configurable per department, default = 15 points/week (60 over 4 weeks)
- Data source: `Task.status`, `Task.size`, `Task.priority`, `Task.completedAt`

---

## Pillar 2: Quality Score (0-100) — Weight: 25%

**What:** Are deliverables actually good, or does work keep getting sent back/reopened?

```
reviewed_tasks = tasks with requiresReview=true that reached CLOSED_APPROVED in window

first_pass_tasks = reviewed tasks where TaskStatusHistory shows
                   COMPLETED_PENDING_REVIEW → CLOSED_APPROVED
                   with NO REOPENED status in between

first_pass_rate = first_pass_tasks / reviewed_tasks

all_completed = all tasks that reached CLOSED_APPROVED in window
                (both reviewed and self-closed)

reopened_tasks = completed tasks that were later REOPENED
                 (check TaskStatusHistory for any CLOSED_APPROVED → REOPENED transition)

reopen_rate = 1 - (reopened_tasks / all_completed)

If reviewed_tasks >= 3:
  Quality = (first_pass_rate × 0.6 + reopen_rate × 0.4) × 100
Else:
  Quality = reopen_rate × 100
```

- Data source: `TaskStatusHistory` (trace full lifecycle per task), `Task.requiresReview`
- Handles both reviewed and non-reviewed tasks
- `review_ratio` (reviewed_tasks / all_completed) surfaced as a transparency metric for managers but does NOT affect the score

---

## Pillar 3: Reliability Score (0-100) — Weight: 25%

**What:** Can the org depend on this person to deliver when they say they will?

```
completed_tasks_with_deadlines = all CLOSED_APPROVED tasks in window that have a deadline

on_time_tasks = tasks where completedAt <= deadline

on_time_rate = on_time_tasks / completed_tasks_with_deadlines

total_carry_forwards = count of CarryForwardLog entries for this user in window

total_active_tasks = all tasks owned by user that were active in window
                     (any status beyond NEW — they actually worked on it)

carry_forward_score = 1 - min(1, total_carry_forwards / total_active_tasks)

Reliability = (on_time_rate × 0.65 + carry_forward_score × 0.35) × 100
```

- Data source: `Task.completedAt`, `Task.deadline`, `CarryForwardLog`
- Both timestamps are system-generated, not self-reported
- Cross-checks each other: someone who carry-forwards to hit "on time" gets caught by carry-forward rate

---

## Pillar 4: Consistency Score (0-100) — Weight: 15%

**What:** Do they show up daily and work across all their responsibilities?

```
workdays_in_window = total weekdays (Mon-Fri) in the 4-week window

planned_days = days with DailyPlanningSession where morningCompleted=true

planning_rate = planned_days / workdays_in_window

assigned_kpi_buckets = count of UserKpi entries for this user

active_kpi_buckets = unique KPI buckets with ≥1 CLOSED_APPROVED task in window

kpi_spread = active_kpi_buckets / assigned_kpi_buckets
             (if assigned_kpi_buckets = 0, kpi_spread = 1.0)

Consistency = (planning_rate × 0.5 + kpi_spread × 0.5) × 100
```

- Data source: `DailyPlanningSession.morningCompleted`, `Task.kpiBucketId`, `UserKpi`
- Catches employees who only work in one comfort-zone KPI while ignoring others

---

## Composite EPS

```
EPS = Output×0.35 + Quality×0.25 + Reliability×0.25 + Consistency×0.15
```

Single number 0-100 per employee. Color coding:

- Green: 70+
- Yellow: 40-69
- Red: <40

---

## Database — 3 New Tables

### ProductivityScore (cached current scores, 1 row per user)

| Column | Type | Notes |
|--------|------|-------|
| id | String | PK |
| userId | String | Unique FK → User |
| output | Float | |
| quality | Float | |
| reliability | Float | |
| consistency | Float | |
| composite | Float | |
| windowStart | DateTime | |
| windowEnd | DateTime | |
| calculatedAt | DateTime | |

### ProductivitySnapshot (weekly historical record)

| Column | Type | Notes |
|--------|------|-------|
| id | String | PK |
| userId | String | FK → User |
| weekStartDate | DateTime | |
| output | Float | |
| quality | Float | |
| reliability | Float | |
| consistency | Float | |
| composite | Float | |
| taskCount | Int | Total completed that week |
| reviewedTaskCount | Int | Tasks that went through review |
| | | Unique: (userId, weekStartDate) |

### ScoringConfig (per-department configurable targets/weights)

| Column | Type | Notes |
|--------|------|-------|
| id | String | PK |
| departmentId | String | Unique FK → Department |
| weeklyOutputTarget | Int | Default 15 |
| outputWeight | Float | Default 0.35 |
| qualityWeight | Float | Default 0.25 |
| reliabilityWeight | Float | Default 0.25 |
| consistencyWeight | Float | Default 0.15 |
| updatedAt | DateTime | |

---

## Scoring Engine (Pure Functions)

```
calculateOutputScore(tasks[], weeklyTarget) → number
calculateQualityScore(tasks[], statusHistories[]) → number
calculateReliabilityScore(tasks[], carryForwardLogs[]) → number
calculateConsistencyScore(sessions[], userKpis[], tasks[], windowStart, windowEnd) → number
calculateCompositeScore(pillars, weights) → number
```

No side effects — takes raw data in, returns scores out. Testable in isolation.

---

## API Routes

| Method | Route | Who | What |
|--------|-------|-----|------|
| `POST` | `/api/productivity/calculate` | Admin | Trigger recalculation for all users |
| `GET` | `/api/productivity/scores` | Manager+ | List scores with filters (dept, role) |
| `GET` | `/api/productivity/scores/[userId]` | Manager+ / Self | Individual breakdown with raw numbers |
| `GET` | `/api/productivity/trends` | Manager+ | Historical snapshots for trend charts |
| `GET` | `/api/productivity/config` | Admin | Get scoring config per department |
| `PATCH` | `/api/productivity/config/[departmentId]` | Admin | Update targets/weights |

---

## Frontend — 3 Views

### 1. Executive Dashboard (`/productivity`)

- Department-level average EPS with drill-down
- Employee table: name, department, role, EPS, each pillar, trend arrow (↑↓→ vs last week)
- Color coding: green (70+), yellow (40-69), red (<40)
- Filter by department, role
- Sort by any column
- Click any employee → opens Individual Scorecard

### 2. Team Radar (new tab on existing `/team` page)

- Spider/radar chart per team member across 4 pillars
- Side-by-side comparison of 2-3 team members
- Quick identification of coaching areas (which pillar is dragging someone down)

### 3. Individual Scorecard (modal from employee row)

- Composite EPS with donut/gauge visualization
- 4 pillar cards with score + raw numbers behind each:
  - Output: "42 points earned / 60 target (70%)"
  - Quality: "9/10 first-pass, 0 reopened"
  - Reliability: "14/17 on-time, 2 carry-forwards"
  - Consistency: "16/20 days planned, 4/5 KPIs active"
- 4-week trend line per pillar (from ProductivitySnapshot)
- Review ratio shown as info metric (not scored)
- Trend arrow + delta vs last week
