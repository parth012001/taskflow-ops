# TaskFlow User Manual

**Version 1.0 · March 2026**

---

## Table of Contents

1. [What is TaskFlow?](#1-what-is-taskflow)
2. [Getting Started](#2-getting-started)
3. [Your Dashboard](#3-your-dashboard)
4. [Managing Tasks](#4-managing-tasks)
5. [Daily Planning](#5-daily-planning)
6. [Team Oversight (Managers)](#6-team-oversight)
7. [Productivity Scoring](#7-productivity-scoring)
8. [Company Analytics (Leadership)](#8-company-analytics)
9. [Announcements](#9-announcements)
10. [Administration](#10-administration)
11. [Appendix A – Role Permissions at a Glance](#appendix-a--role-permissions-at-a-glance)
12. [Appendix B – Task Lifecycle Reference](#appendix-b--task-lifecycle-reference)
13. [Appendix C – Productivity Scoring Formula](#appendix-c--productivity-scoring-formula)

---

## 1. What is TaskFlow?

TaskFlow is a workforce productivity platform built for organisations that want clear, measurable visibility into how work gets done — not just whether it gets done.

At its core, TaskFlow combines **task management**, **daily work rituals**, and a **four-pillar productivity scoring engine** into a single system. Every task an employee creates, completes, or carries forward feeds into a live productivity score that leadership can use to identify top performers, support struggling team members, and make data-driven decisions about team health.

TaskFlow is designed around four organisational roles — Employee, Manager, Department Head, and Admin — each with a tailored experience that matches their responsibilities.

---

## 2. Getting Started

### Logging In

Open TaskFlow in your browser. You will see the login screen.

- Enter the **email address** and **password** provided by your administrator.
- Click **Sign In**.

If your administrator has recently created your account or reset your password, you will be taken directly to the Settings page and asked to choose a new password before you can access any other part of the system.

### First-Time Password Change

When prompted:

1. Enter your temporary password in the **Current Password** field.
2. Choose a new password (minimum 8 characters) and confirm it.
3. Click **Change Password**.

You will then be redirected to your dashboard.

### Your Profile & Settings

You can access your settings at any time from the sidebar. The Settings page allows you to:

- **Update your name** — Change your first and last name as displayed across the system.
- **View your organisation details** — See your department, who you report to, when you joined, and when you last logged in. These fields are managed by your administrator.
- **Change your password** — Update your password at any time.

---

## 3. Your Dashboard

The dashboard is the first thing you see after logging in. It is a personalised summary of your workday, designed to give you everything you need at a glance.

### Greeting & Streak

At the top of the page, TaskFlow greets you by name with a time-appropriate message (good morning, good afternoon, or good evening). Next to your greeting, you will see your **current streak** — the number of consecutive working days you have completed your daily planning ritual. The longer your streak, the better your Consistency score.

### Morning Ritual Banner

If you have not yet completed your morning planning session for the day, a banner will remind you to do so. Clicking it takes you to the Daily Planning page. You can dismiss this banner if you prefer.

### Status Cards

Four cards summarise your current workload:

| Card               | What It Shows                                                        |
| ------------------ | -------------------------------------------------------------------- |
| **In Progress**    | Tasks you are actively working on right now                          |
| **Pending Review** | Tasks you have submitted and are waiting for your manager to approve |
| **Overdue**        | Tasks that have passed their deadline without being completed        |
| **Completed**      | Tasks you have closed within the current scoring window (28 days)    |

### Today's Summary

Below the status cards, a brief summary tells you how many tasks are **due today**, how many are **due this week**, and your **completion rate** as a percentage.

### Productivity Widget

A gauge displays your **composite productivity score** (0–100), along with a breakdown of your four pillar scores: Output, Quality, Reliability, and Consistency. Each pillar has its own progress bar. This score updates whenever your administrator triggers a recalculation.

### Announcements

The latest company-wide announcements appear here — policy updates, events, team news. These are posted by your Department Head or Admin.

### Recognitions

If you have earned any awards or badges (Star of the Day, High Performer of the Week, and so on), they are displayed in the recognitions section.

### Recent Activity

A timeline of your most recent task status changes — for example, "Moved _Create PO for Office Supplies_ to In Progress — 2 hours ago."

### Task Distribution by KPI

A visual breakdown showing how your tasks are spread across the KPI buckets assigned to you. This gives you a sense of whether you are focusing on one area or working across all your responsibilities.

### Manager View

If you are a Manager or above, an additional card appears showing **tasks pending your review** from your team members. This ensures you are never unaware of work waiting for your approval.

---

## 4. Managing Tasks

Tasks are the fundamental unit of work in TaskFlow. Every task has an owner, a priority, a size, a deadline, and a KPI bucket that it contributes to.

### Viewing Tasks

Navigate to **Tasks** from the sidebar. You will see a Kanban-style board with columns representing each stage of a task's lifecycle:

| Column             | Meaning                                                        |
| ------------------ | -------------------------------------------------------------- |
| **New**            | Task has been created but not yet acknowledged                 |
| **Accepted**       | Owner has acknowledged the task and plans to work on it        |
| **In Progress**    | Owner is actively working on the task                          |
| **On Hold**        | Work is paused (a reason must be provided)                     |
| **Pending Review** | Owner has finished and submitted the task for manager approval |
| **Approved**       | Task has been reviewed and closed                              |
| **Reopened**       | Task was sent back after review for further work               |

Depending on your role, you will see different tabs at the top of the page:

- **My Tasks** — Your own tasks (available to all roles).
- **Team Tasks** — Tasks belonging to your direct reports (Managers and above).
- **All Tasks** — Every task in the department or organisation (Department Heads and Admins).

### Searching and Filtering

Above the board, you can:

- **Search** by keyword to find tasks by title.
- **Filter by status** — Show only tasks in a specific stage.
- **Filter by priority** — Focus on urgent/important work.
- **Filter by KPI bucket** — See tasks tied to a particular goal.
- **Filter by date** — Use presets like "Due Today," "This Week," or "Overdue."
- **Filter by owner** — In Team or All views, narrow down to a specific person.

Click **Clear Filters** to reset everything.

### Creating a Task

Click the **New Task** button in the top-right corner. A form will appear asking for:

- **Title** — A short, clear name for the task.
- **Description** — Additional detail about what needs to be done.
- **Priority** — Choose from the Eisenhower matrix:
  - _Urgent & Important_ — Do this first.
  - _Urgent, Not Important_ — Delegate if possible.
  - _Not Urgent, Important_ — Schedule for later.
  - _Not Urgent, Not Important_ — Consider whether it is needed.
- **Size** — An estimate of effort:
  - _Easy_ (1 point) — Quick task, under an hour.
  - _Medium_ (2 points) — A few hours of focused work.
  - _Difficult_ (4 points) — Significant effort, potentially spanning days.
- **KPI Bucket** — Which goal area does this task contribute to?
- **Deadline** — When it needs to be done.
- **Estimated Time** — How many minutes you expect it to take.
- **Requires Review** — Whether a manager must approve the task before it can be closed.

### Moving Tasks Through the Workflow

You can advance a task by dragging it between columns on the Kanban board, or by opening the task and clicking the appropriate action button. The system enforces a logical workflow:

1. **New → Accepted** — You acknowledge the task.
2. **Accepted → In Progress** — You begin working.
3. **In Progress → Pending Review** — You finish and submit for manager approval (if the task requires review).
4. **In Progress → Approved** — If the task does not require review, you close it directly.
5. **Pending Review → Approved** — Your manager reviews and approves.
6. **Pending Review → Reopened** — Your manager sends it back with feedback (a reason is required, minimum 10 characters).
7. **Reopened → In Progress** — You resume work after addressing the feedback.

You can also:

- **Put a task On Hold** from In Progress — a reason is required (for example, "Waiting on vendor response").
- **Resume from On Hold** back to In Progress.
- **Withdraw from review** — Move a Pending Review task back to In Progress if you realise something needs changing before your manager sees it.
- **Reopen an approved task** — If an issue is discovered after closure, the task can be reopened with a reason.

### Task Details

Click any task to open its detail view. Here you can see:

- All task information (title, description, priority, size, KPI, deadline, estimated and actual time).
- **Comments** — A threaded conversation where you and your manager can discuss the task. This is useful for asking questions, providing updates, or explaining decisions.
- **Status History** — A complete timeline of every status change, who made it, and when.
- **Carry Forward** — If a task is overdue, you can carry it forward to a new deadline. This is logged and factors into your Reliability score.

### Task Assignment

Managers can assign tasks to their team members when creating a task. The **Assigned By** field tracks whether a task was self-created, assigned by a manager, or assigned by leadership.

Managers can also **reassign** a task from one team member to another if workload balancing is needed.

---

## 5. Daily Planning

The Daily Planning page is where you structure your workday. TaskFlow encourages a **morning and evening ritual** — a few minutes at the start and end of each day to plan and reflect.

### How It Works

Navigate to **Daily Planning** from the sidebar. You will see today's date with your planned tasks for the day.

#### Planning Your Day

1. Click **Add Task** to open the task picker.
2. Browse or search your available tasks.
3. Click a task to add it to today's plan.
4. Drag tasks up or down to reorder your priorities.
5. The total estimated time is calculated automatically so you can see if you have overcommitted.

You can remove a task from the plan without affecting the task itself — it simply will not be part of today's focus.

#### Morning Ritual

At the start of your day, open Daily Planning, review your planned tasks, and optionally write a short note about your focus for the day. Click **Complete Morning Ritual** to mark it done. The time you completed it is recorded.

Completing your morning ritual every working day builds your streak and directly improves your Consistency score.

#### Evening Ritual

At the end of your day, return to Daily Planning. The evening ritual is available only after you have completed the morning ritual. Write a short reflection note if you wish, then click **Complete Evening Ritual**.

The evening ritual is optional but encouraged. It helps you close out the day and prepare mentally for the next.

#### Navigating Between Days

Use the left and right arrows to view past or future dates. You can plan ahead by adding tasks to upcoming days. You can also review what you planned and accomplished on previous days.

#### Carrying Forward Overdue Tasks

If a task's deadline has passed and it is still active, a carry-forward button appears next to it. Clicking it allows you to set a new deadline. This action is logged and visible to your manager. Frequent carry-forwards will affect your Reliability score.

---

## 6. Team Oversight

_This section applies to Managers, Department Heads, and Admins._

### Team Page

Navigate to **Team** from the sidebar. This page gives you a bird's-eye view of your direct reports.

#### Summary Cards

Three cards at the top show:

- **Team Members** — How many people report to you.
- **Pending Review** — How many tasks are waiting for your approval. This number is highlighted if there are outstanding reviews.
- **Overdue Tasks** — How many tasks across your team have passed their deadline.

#### Team Member List

Each team member is listed with:

- Their name.
- How many tasks they have in progress.
- How many tasks are overdue.

This allows you to quickly spot who might be overloaded or falling behind.

#### Pending Review Queue

On the right side, you will see a list of tasks submitted for your review. Each item shows the task title, who submitted it, and which KPI bucket it belongs to.

Click any task to open the **Review Dialog**, where you can:

- **Approve** — The task moves to Approved status and is counted as complete.
- **Reopen** — Send the task back to the employee with a written reason (minimum 10 characters) explaining what needs to change. The employee will see this reason when they open the task.
- **Reassign** — Transfer the task to a different team member if the work should be handled by someone else.

### Reviewing Work

The review process is central to TaskFlow's Quality scoring. When you approve a task on the first submission (without reopening it), the employee earns full credit on their first-pass rate. If you reopen it, that is recorded and affects their Quality score.

This is intentional — it encourages employees to submit thorough, complete work rather than rushing to mark tasks as done.

### Viewing Team Tasks

On the Tasks page, switch to the **Team Tasks** tab to see all tasks belonging to your direct reports. You can filter and search just as you would with your own tasks. Department Heads can also view the **All Tasks** tab to see work across the entire department.

---

## 7. Productivity Scoring

_The Productivity page is available to Managers, Department Heads, and Admins. Employees can see their own scores on their dashboard._

TaskFlow measures productivity through four pillars, each capturing a different dimension of work performance. Together, they form a composite score from 0 to 100.

### The Four Pillars

#### Output — "How much are you getting done?"

This measures the volume and weight of completed work over a rolling 28-day window.

- Every completed task earns points based on its size: Easy (1 point), Medium (2 points), Difficult (4 points).
- Tasks marked as Urgent & Important receive a 1.5× multiplier, reflecting the additional pressure and importance of that work.
- Your total points are compared against a weekly target set by your department (for example, 15 points per week means a 28-day target of 60 points).
- If you meet or exceed the target, you score 100. Below the target, your score scales proportionally.

**What this encourages:** Consistent throughput. Taking on harder, higher-priority work is rewarded more than completing many small tasks.

#### Quality — "How clean is your work?"

This measures whether your work passes review without being sent back.

Two factors are considered:

- **First-Pass Rate (60% of the Quality score):** Of all tasks that went through manager review, what percentage were approved on the first submission without being reopened? If your manager never sends your work back, this is 100%.
- **Reopen Rate (40% of the Quality score):** Of all your completed tasks, how many were reopened _after_ already being approved? This catches issues that surface after sign-off — bugs found later, documents that need correction after the fact.

At least three reviewed tasks are needed in the scoring window for the first-pass rate to be counted. Below that threshold, only the reopen rate is used, since a single reviewed task would give an unreliable 0% or 100%.

**What this encourages:** Thoroughness and attention to detail. Submitting polished, complete work rather than rushing and relying on the review cycle to catch problems.

#### Reliability — "Can people count on you?"

This measures whether you deliver on time and keep your commitments.

Two factors are considered:

- **On-Time Rate (65% of the Reliability score):** Of all tasks you completed, what percentage were finished on or before the deadline? If you always deliver before the due date, this is 100%.
- **Carry-Forward Score (35% of the Reliability score):** How often do your tasks spill past their deadlines and need to be carried forward to a new date? The fewer carry-forwards relative to your active workload, the higher this score.

**What this encourages:** Realistic planning and follow-through. Setting achievable deadlines and honouring them, rather than overcommitting and repeatedly pushing work to tomorrow.

#### Consistency — "Do you show up every day?"

This measures your daily discipline and how broadly you contribute across your responsibilities.

Two factors are considered equally (50/50):

- **Planning Rate:** What percentage of working days (Monday through Friday) in the 28-day window did you complete your morning planning ritual? Showing up, reviewing your plan, and starting the day intentionally is rewarded.
- **KPI Spread:** Are you working across all the KPI buckets assigned to you, or concentrating on just one? If you have seven KPIs assigned but only completed tasks in two of them, your spread is 2 out of 7. A balanced workload across all responsibilities scores higher.

**What this encourages:** Daily discipline and balanced attention. Coming in every day with a plan and making sure no area of responsibility is neglected.

### Composite Score

The four pillar scores are combined using department-level weights that your administrator configures. The default weights for Procurement are:

| Pillar      | Weight |
| ----------- | ------ |
| Output      | 35%    |
| Quality     | 25%    |
| Reliability | 25%    |
| Consistency | 15%    |

Different departments can set different weights depending on what matters most to their work. An engineering team might weigh Quality higher; a sales team might weigh Output higher.

**Composite Score = (Output × Output Weight) + (Quality × Quality Weight) + (Reliability × Reliability Weight) + (Consistency × Consistency Weight)**

### Health Bands

Composite scores map to four health bands:

| Band         | Score Range | Meaning                                     |
| ------------ | ----------- | ------------------------------------------- |
| **Thriving** | 80–100      | Excellent performance across all dimensions |
| **Healthy**  | 60–79       | Solid, reliable contributor                 |
| **At Risk**  | 40–59       | Some areas need attention                   |
| **Critical** | 0–39        | Significant intervention needed             |

### Minimum Threshold

A user must complete at least **3 tasks** within the 28-day window to receive a score. Below this threshold, the ratios that Quality and Reliability rely on are statistically meaningless — a single task gives either 0% or 100% with no useful signal. Users below this threshold are marked as "unscorable" rather than receiving a misleading low score.

### Leaderboard

The Productivity page displays a leaderboard — a table of all scored users ranked by composite score. Each row shows the user's name, role, department, their four pillar scores, their composite score (with a colour-coded health band badge), and when the score was last calculated.

Click on any user's name to open their **scorecard**, which shows a detailed breakdown of each pillar along with a historical trend chart showing how their performance has evolved over time.

### Weekly Snapshots

Every time scores are calculated, TaskFlow saves a weekly snapshot. This creates a historical record that powers the trend charts. Over time, you can see whether an employee is improving, stable, or declining — which is far more useful than a single point-in-time number.

---

## 8. Company Analytics

_This section is available to Department Heads and Admins._

Navigate to **Analytics** from the sidebar. This page presents the health of your organisation at a glance.

### Company Health Score

A large gauge at the top displays the overall company composite score, along with:

- The **health band** (Thriving, Healthy, At Risk, or Critical).
- The **change** compared to the previous period (for example, "+3.2 from last week"), with a colour-coded arrow showing the direction.
- The number of employees scored out of the total eligible.
- Individual scores for each of the four pillars.

### Alerts Panel

Three alert indicators highlight areas that may need attention:

- **At-Risk Employees** — How many employees fall in the At Risk or Critical bands.
- **Biggest Mover** — Which pillar has changed the most (and in which direction) compared to the last period. This helps you spot emerging trends — for example, if Reliability is dropping across the board, it might indicate deadline-setting problems.
- **Unscorable Employees** — How many employees did not complete enough tasks to receive a score. A high number here might indicate disengagement or workload issues.

### Trend Chart

A line chart showing the company's composite score over time. This is the single most important chart for understanding whether the organisation's performance is improving, stable, or declining.

### Score Distribution

A visual breakdown showing how many employees fall into each health band (Thriving, Healthy, At Risk, Critical). A healthy organisation will have the majority of its people in the Healthy and Thriving bands.

### Department Comparison

A comparative view showing how different departments perform against each other. Each department is displayed with its own health status, allowing leadership to identify which teams are excelling and which need support.

---

## 9. Announcements

_Creating and managing announcements is available to Department Heads and Admins. All users can view announcements on their dashboard._

### Viewing Announcements

Active announcements appear on every user's dashboard. They include the title, content, type, and priority level. Announcements automatically disappear after their expiry date.

### Creating an Announcement

Navigate to **Announcements** from the sidebar (available to Department Heads and Admins). Click **Create Announcement** and fill in:

- **Title** — A clear, concise headline.
- **Content** — The full body of the announcement.
- **Type** — Categorise it as General, Birthday, Event, or Policy.
- **Priority** — Set it to Low, Normal, or High. High-priority announcements are displayed more prominently.
- **Expiry Date** — When the announcement should stop being shown (optional).

### Managing Announcements

The announcements table shows all announcements with their current status (Active, Expired). You can edit or delete any announcement from this table.

---

## 10. Administration

_This section is available to Admins only._

### User Management

Navigate to **Settings → Users** from the sidebar. This is where you create and manage user accounts.

#### Creating a User

Click **Create User** and provide:

- **First Name** and **Last Name**.
- **Email Address** — This is used for login.
- **Role** — Employee, Manager, Department Head, or Admin.
- **Department** — Which department the user belongs to.
- **Reports To** — Who the user's direct manager is.

A temporary password will be generated. Share this with the user — they will be required to change it on first login.

#### Managing Users

The users table shows all accounts with their role, department, reporting relationship, and active status. You can:

- **Edit** a user's profile — Change their name, role, department, or manager.
- **Activate or Deactivate** — Deactivated users cannot log in but their historical data is preserved.
- **Reset Password** — Generate a new temporary password. The user will be required to change it on next login.

#### Filtering Users

Use the search bar and dropdown filters to find users by name, email, role, department, or active status.

### KPI Management

Navigate to **KPI Management** from the sidebar. This page has two sections:

#### KPI Buckets

KPI Buckets are the goal categories that tasks are assigned to (for example, "PO Accuracy," "Vendor Onboarding," "Delivery Timeliness"). Each bucket has:

- A **name** and **description**.
- **Applicable roles** — Which roles can have this KPI assigned to them.

You can create, edit, or delete KPI buckets. Deleting a bucket removes it from future use but does not affect historical task data.

#### User KPI Assignments

This section shows which KPIs are assigned to each user. You can:

- **Assign** a KPI to a user — This determines which goal areas the user is responsible for.
- **Remove** a KPI assignment — The user will no longer be measured against that bucket.

The summary at the top shows the total number of buckets, total assignments, how many users have KPIs assigned, and how many do not. Users without KPI assignments may have incomplete Consistency scores.

### Scoring Configuration

On the **Productivity** page, Admins have access to a **Scoring Config** tab. This is where you set the department-level weights for the four productivity pillars.

For each department, you can adjust:

- **Output Weight** — How much task completion volume matters.
- **Quality Weight** — How much first-time-right work matters.
- **Reliability Weight** — How much on-time delivery matters.
- **Consistency Weight** — How much daily discipline and KPI breadth matter.

The four weights must sum to 100%. Changing these weights immediately affects how composite scores are calculated for that department the next time scores are recalculated.

### Recalculating Scores

On the Productivity page, click the **Recalculate** button to trigger a fresh calculation of all productivity scores across the organisation. This processes every eligible user's task data from the last 28 days and updates their scores and weekly snapshots.

---

## Appendix A — Role Permissions at a Glance

| Capability                      | Employee | Manager | Dept Head | Admin |
| ------------------------------- | :------: | :-----: | :-------: | :---: |
| View own dashboard & tasks      |   Yes    |   Yes   |    Yes    |  Yes  |
| Create and manage own tasks     |   Yes    |   Yes   |    Yes    |  Yes  |
| Use daily planning              |   Yes    |   Yes   |    Yes    |  Yes  |
| Change own password             |   Yes    |   Yes   |    Yes    |  Yes  |
| View team members' tasks        |    —     |   Yes   |    Yes    |  Yes  |
| Approve or reopen tasks         |    —     |   Yes   |    Yes    |  Yes  |
| Reassign tasks                  |    —     |   Yes   |    Yes    |  Yes  |
| View team page                  |    —     |   Yes   |    Yes    |  Yes  |
| View productivity leaderboard   |    —     |   Yes   |    Yes    |  Yes  |
| View company analytics          |    —     |    —    |    Yes    |  Yes  |
| Create announcements            |    —     |    —    |    Yes    |  Yes  |
| Manage KPI buckets              |    —     |    —    |    Yes    |  Yes  |
| Manage users                    |    —     |    —    |     —     |  Yes  |
| Configure scoring weights       |    —     |    —    |     —     |  Yes  |
| Recalculate productivity scores |    —     |    —    |     —     |  Yes  |

---

## Appendix B — Task Lifecycle Reference

```
                    ┌──────────┐
                    │   NEW    │
                    └────┬─────┘
                         │ Accept
                    ┌────▼─────┐
                    │ ACCEPTED │
                    └────┬─────┘
                         │ Start Work
                    ┌────▼──────┐
               ┌────│IN PROGRESS│────┐
               │    └─────┬─────┘    │
               │          │          │
          Put on Hold     │     Submit for Review
               │          │          │
        ┌──────▼──┐       │   ┌──────▼──────────────┐
        │ ON HOLD │       │   │ PENDING REVIEW       │
        └──────┬──┘       │   └───┬─────────────┬────┘
               │          │       │             │
          Resume Work     │    Approve       Reopen
               │          │       │             │
               └──────────┘  ┌────▼─────┐  ┌───▼─────┐
                             │ APPROVED │  │REOPENED │
                             └──────────┘  └────┬────┘
                                                │
                                           Resume Work
                                           (back to In Progress)
```

**Key rules:**

- Only the **task owner** can move a task from New → Accepted → In Progress.
- Only a **Manager or above** can approve or reopen a task during review, and they cannot approve their own work.
- Putting a task **On Hold** or **reopening** an approved task requires a written reason (minimum 10 characters).
- Tasks that do **not require review** skip the Pending Review stage and go directly from In Progress to Approved.

---

## Appendix C — Productivity Scoring Formula

**Scoring Window:** Rolling 28 days from the current date.

**Minimum Threshold:** 3 completed tasks required to generate a score.

### Output (default 35%)

```
Points = Σ (Size Points × Priority Multiplier) for each completed task

    Size Points:  Easy = 1,  Medium = 2,  Difficult = 4
    Priority:     Urgent & Important = 1.5×,  all others = 1.0×

Target = Weekly Target × 4

Output Score = min(100, Points ÷ Target × 100)
```

### Quality (default 25%)

```
First-Pass Rate = Tasks approved without reopening ÷ Total reviewed tasks
Reopen Rate     = 1 − (Tasks reopened after approval ÷ Total completed tasks)

Quality Score = (First-Pass Rate × 0.6 + Reopen Rate × 0.4) × 100

    * If fewer than 3 reviewed tasks: Quality Score = Reopen Rate × 100
```

### Reliability (default 25%)

```
On-Time Rate        = Tasks completed on or before deadline ÷ Total completed tasks
Carry-Forward Score = 1 − min(1, Carry-forward count ÷ Active task count)

Reliability Score = (On-Time Rate × 0.65 + Carry-Forward Score × 0.35) × 100
```

### Consistency (default 15%)

```
Planning Rate = Workdays with morning ritual completed ÷ Total workdays in window
KPI Spread    = min(1, Distinct KPI buckets with completed tasks ÷ Assigned KPI buckets)

Consistency Score = (Planning Rate × 0.5 + KPI Spread × 0.5) × 100

    * If no KPIs assigned: Consistency Score = Planning Rate × 100
```

### Composite

```
Composite = Output × Output Weight
          + Quality × Quality Weight
          + Reliability × Reliability Weight
          + Consistency × Consistency Weight
```

### Health Bands

| Band     | Range  |
| -------- | ------ |
| Thriving | 80–100 |
| Healthy  | 60–79  |
| At Risk  | 40–59  |
| Critical | 0–39   |

---

_TaskFlow — Built to make work measurable, fair, and visible._
