
## Current State

**What exists today:**
- 4-pillar scoring (Output, Quality, Reliability, Consistency) → composite score
- Weekly snapshots in `ProductivitySnapshot` (12 weeks seeded, no retention limit)
- Leaderboard view (Manager+ only, hierarchically scoped)
- Scorecard dialog per user with a 12-week trend line chart
- Per-department scoring config (weights + output target)
- No department-level aggregation stored anywhere
- No company-wide health view
- No employee self-service growth view
- Snapshots are weekly only — no monthly/quarterly/yearly rollups

---

## Where the 3 features fit

### 1. Employee Growth Chart (Productivity & Performance Over Months/Years)

**What exists:** `ProductivitySnapshot` stores weekly data, and `trend-chart.tsx` renders a 12-week Recharts line. But this is only visible inside the manager's scorecard dialog — employees can't even see their own trends.

**What's missing:**
- **Employee self-service view** — right now employees have zero visibility into their own scores. They can't see the leaderboard or trends. That's the biggest UX gap.
- **Longer time horizons** — the trends API supports up to 52 weeks, but the UI hardcodes 12. For months/years we'd need monthly rollups or the chart gets noisy with 100+ weekly points.
- **Growth narrative** — raw scores over time are data, not insight. The UX question is: does the employee see "your quality went from 62 to 78 over 3 months" or just a line going up?

**Brainstorm questions for you:**
- Should employees see their own composite + pillar breakdown? Or just a simplified view?
- Do we want a comparison against team/department average so they have context ("you're above average")?
- Should managers also see this view for their reports, or is the existing scorecard dialog enough?

---

### 2. Department-wise Performance

**What exists:** The leaderboard can be filtered by department (admin only), and `ScoringConfig` exists per department. But there's no department-level score — it's always individual users filtered down.

**What's missing:**
- **Department aggregate scores** — average composite, pillar breakdowns per department
- **Department comparison view** — side-by-side or ranked list of departments
- **Department trends** — how is the department performing over time, not just individuals
- **Department head's dashboard** — today a dept head sees their people on the leaderboard, but no summary of "my department is at 72 composite, up from 65 last month"

**Brainstorm questions:**
- Should department scores be stored (new table `DepartmentSnapshot`) or computed on the fly from user snapshots? Storing is better for historical accuracy (people leave/join departments).
- Who sees department comparisons? Only admin? Or dept heads can see other departments too?
- Do we want to highlight which pillar is dragging a department down? ("Engineering output is strong but consistency is lagging")

---

### 3. Company Employment Average Health Score

**What exists:** Nothing. The admin can see all users and mentally average, but there's no company-wide metric.

**What's missing:**
- **Company-wide composite** — single number health score
- **Distribution view** — not just the average, but how spread out people are (are most people at 70, or is it bimodal with stars at 90 and strugglers at 20?)
- **Company trends** — is the company getting healthier over time?
- **Alerts/insights** — "15% of employees are below 40 composite" is more useful than "average is 63"

**Brainstorm questions:**
- Is this an admin-only dashboard, or should leadership roles see it too?
- Do we want a single health score, or a breakdown by pillar? ("Company output is great but reliability is a problem")
- Should this surface on a dedicated page or be a top-level widget on an existing dashboard?

---

## UX Architecture — How I'd think about this

Instead of 3 separate features, these naturally form **3 levels of the same pyramid**:

```
        ┌─────────────────────┐
        │   Company Health    │  ← Admin/Leadership
        │   (macro overview)  │
        ├─────────────────────┤
        │  Department Perf    │  ← Dept Heads + Admin
        │  (team comparison)  │
        ├─────────────────────┤
        │  Employee Growth    │  ← Everyone (self-service)
        │  (individual trend) │
        └─────────────────────┘
```

The UX pattern would be **drill-down**: Company → click department → see department detail + ranked employees → click employee → see individual growth chart. Each level gives progressively more detail.

**The key UX decision:** Do we build this as a new dedicated page (e.g., `/analytics` or `/insights`) with these three levels, or do we extend the existing `/productivity` page with new tabs? I'd lean toward a new page for the company/department views and an employee-facing widget on their existing dashboard for their own growth.

What's your thinking on the drill-down approach vs separate pages? And which of the three feels most urgent to you — that'll shape the build order.