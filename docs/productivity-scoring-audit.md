# Productivity Scoring Audit

Audit performed against seeded data (20 users, 5 archetypes) with manual calculation verification.

**Result:** All 4 pillar formulas compute correctly — manual math matches stored values exactly. Edge-case and default-handling issues were found and are being resolved.

---

## Resolved in PR #10 (`fix/productivity-scoring-threshold`)

### ~~1. Zero tasks = perfect Quality & Reliability score~~ FIXED

**Severity:** P0

Added `MIN_COMPLETED_TASKS = 3` threshold gate in `calculateForUser()`. Users with fewer than 3 completed tasks in the 28-day window are marked `scorable: false`, return all zeros, and get their `ProductivityScore` record deleted (removed from leaderboard). Quality and Reliability also now return `score: 0` (not 100) for empty task lists as a safety net.

---

### ~~2. Admin users get scored (shouldn't appear on leaderboard)~~ FIXED

**Severity:** P0

Added `role: { not: "ADMIN" }` filter to `fetchAllUsersForScoring()` query. Admin users are now excluded at the data-fetch level — they're never even evaluated for scoring.

---

## Bugs to Fix

### 3. Zero assigned KPIs = perfect KPI spread (Consistency)

**Severity:** P1
**Location:** `src/lib/productivity/scoring-engine.ts` — `calculateConsistencyScore()` (line 260)

When `assignedBuckets === 0`, `kpiSpread` defaults to `1.0` (100%). Users with no KPI assignments get a free consistency boost.

**Example:** Rajesh Kumar (Dept Head) — 0 KPIs assigned, Consistency = 100.

**Fix:** Default to `0` instead of `1.0` when no KPIs are assigned.

---

### 4. Carry-forward denominator inflated by completed tasks

**Severity:** P1
**Location:** `src/lib/productivity/scoring-engine.ts` — `calculateReliabilityScore()` (line 206), and `src/lib/productivity/fetch-scoring-data.ts` — active tasks query (line 64)

The "active tasks" query's OR clause pulls in completed tasks (`completedAt` in window). This inflates the denominator in the carry-forward ratio, making the penalty ~3x weaker than intended.

**Example:** Rajesh has 17 "active" tasks but 14 are completed — only 3 are truly active. Carry-forward score: 1 CF / 17 tasks = 94.1%. Against truly active only: 1 CF / 3 tasks = 66.7%.

**Fix:** Exclude CLOSED_APPROVED from the active task count used as carry-forward denominator.

---

## Intentional Design (Not Bugs)

### 5. Size weighting penalizes easy-task volume — BY DESIGN

**Location:** `src/lib/productivity/scoring-engine.ts` — `calculateOutputScore()` (line 111)

Size weighting (EASY=1, MEDIUM=2, DIFFICULT=4) means high volumes of easy tasks yield low Output scores. Kavita completed 18 tasks (most of anyone) but scored Output = 55 because 9 were EASY (1pt each).

**Verdict:** Intentional. The system deliberately incentivizes harder work over volume. No fix needed.

---

### 6. On-time comparison is time-of-day sensitive — LOW IMPACT

**Location:** `src/lib/productivity/scoring-engine.ts` — `calculateReliabilityScore()` (line 216)

`completedAt <= deadline` compares full datetimes. A task completed at 11pm on the deadline day could be "late" if the deadline was set to 9am.

**Verdict:** Not a real-world issue. Deadlines are set via the app and include a time component — comparing against that time is correct behavior. Nice-to-have fix at best, not worth prioritizing.

---

## Pre-fix Findings (seeded run snapshot, March 1 2026)

These counts are from the initial seed run and do not reflect live system state:

- 20 ProductivityScore records existed (matching the 20 seeded users)
- All calculated in a single batch (~10 seconds)
- 247 ProductivitySnapshot records, latest week starting Feb 23, 2026
- System has not been actively used in production beyond seeding

---

## What's Working Well

- **Composite weighting** (35/25/25/15) produces clear differentiation — stars lead, strugglers trail
- **Quality dual-signal** (first-pass rate 60% + reopen rate 40%) captures two distinct quality dimensions
- **Consistency formula** combining planning discipline + KPI breadth captures real behaviors
- **Trend snapshots** provide meaningful week-over-week visibility
- **All formulas compute correctly** — no bugs in the math itself
