# TASKFLOW
## Product Requirement Document (PRD) & Developer Build Specification

---

## 1. Product Vision
**TASKFLOW** is an internal task, performance, and accountability system designed to make employees grow, managers gain real-time clarity, and work execution predictable, measurable, and engaging.

The system blends:
- Task management (like Trello)
- KPI-driven accountability
- Manager workload intelligence
- Gamification & habit-building
- Light AI-assisted planning

Primary goal: **Improve daily execution quality, time management, and KPI alignment across teams.**

---

## 2. User Roles

### 2.1 Employee
- Creates, plans, executes, and updates daily tasks
- Aligns tasks with KPIs
- Participates in daily start & evening shutdown rituals
- Receives alerts, nudges, and gamification feedback

### 2.2 Manager
- Assigns tasks to employees
- Reviews, approves, or reopens tasks
- Views workload radar & KPI alignment
- Redistributes work dynamically

### 2.3 Department Head (Escalation Role)
- Receives escalations for repeated delays or non-compliance
- Views high-level performance & bottlenecks

---

## 3. Core Entities & Data Models (High-Level)

### 3.1 Task
Each task must include:
- Task Title
- Task Description
- Task Owner (Employee)
- Assigned By (Self / Manager / EA / Leadership)
- Task Status (see section 4)
- Task Priority (see section 5)
- KPI Bucket (see section 6)
- Estimated Time
- Actual Time Spent
- Start Date & Deadline
- Task Size (Easy / Medium / Difficult)
- Attachments (documents, comments – Trello-like)
- Carry-forward Reason (mandatory if not completed)
- Created Date
- Last Updated Timestamp

---

## 4. Task Status System (Strict)

Available statuses:
- **New**
- **Accepted**
- **In Progress**
- **On Hold** (Mandatory reason required)
- **Completed – Pending Review**
- **Closed (Approved)**
- **Reopened** (If manager rejects)

Rules:
- Tasks cannot move to *On Hold* without a written reason
- Tasks cannot be *Closed* without manager approval
- Reopened tasks must show rejection comments

---

## 5. Task Priority Matrix

Four priority levels:
- Urgent & Important
- Urgent & Not Important
- Not Urgent & Important
- Not Urgent & Not Important

Priority affects:
- Task ordering
- Alerts & escalation timing
- AI recommendations

---

## 6. KPI System (Bucket-Based)

Each role has predefined KPIs. Example KPIs include:
- PO Accuracy
- Vendor Onboarding
- Purchase Master Update
- Bill Handling Accuracy
- PI Follow-up Timeliness
- Delivery Timeliness
- Vendor Comparison
- Negotiation Savings
- Credit Days Extension
- Monthly Vendor Reports

Rules:
- Every task must be mapped to **one KPI bucket**
- KPI buckets visually fill as tasks are completed
- If employee works excessively on only 1–2 KPIs, system triggers alerts
- Managers are notified when KPI balance is off

---

## 7. Views & Interfaces

### 7.1 Kanban Board (Employee View)
Columns:
- In Progress
- On Hold
- Under Review
- Completed
- Carry Forward (Auto-generated)

Each card displays:
- Task title
- Priority
- Status
- KPI tag
- Deadline

---

### 7.2 Daily Task Planning View
Mandatory morning action:
- List all tasks for today
- Set deadlines & time windows
- Arrange by priority
- Estimate time per task

If skipped → notification sent

---

### 7.3 Calendar View
- Personal task calendar
- Task-to-time-slot mapping
- Google Calendar integration (future-ready)
- Task-wise deadlines visible

Includes:
- Company calendar (engineers / site visits)
- Site name + visit timing

---

### 7.4 Manager Workload Radar (Critical)

Shows in real time:
- Employee working hour load (today)
- Number of tasks pending
- Site visits planned
- Overdue tasks
- Overloaded employees
- Underutilized employees

Managers can:
- Reassign tasks instantly
- Adjust deadlines

---

## 8. Carry-Forward Logic (Automatic)

End of day:
- All unticked tasks auto-move to next day
- Mandatory reason required per task
- Reason logged & tracked

Repeated carry-forward impacts:
- Accuracy KPI
- Time management score
- Manager alerts

---

## 9. Gamification & Motivation Layer

### 9.1 Completion Feedback
If all tasks completed:
- Celebration animation (fun UI)
- Message like: “Hey, you are a star!”

### 9.2 Streak System
- 1-day streak: Completion logged
- 5-day streak: Badge – “Efficient Star”
- 20-day streak: “Consistency King / Queen”

---

## 10. Daily Ritual System (Mandatory)

### 10.1 Morning – Daily Start Ritual (60 seconds)
System auto-opens:
- List today’s tasks
- Prioritize
- Estimate time
- Set task windows

### 10.2 Evening – Shutdown Ritual
Before logout:
- Update task statuses
- Tick completed tasks
- Provide reason for pending tasks

If skipped → manager notified

---

## 11. Notification & Escalation System

### 11.1 Auto-Silent Escalation
Triggered if:
- Task delayed
- Task On-Hold too long
- No status update for X hours

Escalation chain:
1. Employee
2. Manager
3. Department Head

### 11.2 WhatsApp / External Nudges (Phase 2)
- Reminder to complete tasks
- Request task updates

---

## 12. AI-Assisted Planning (Lightweight)

System learns patterns over time:
- Time taken per task type
- Frequent delays
- Priority mismanagement

Suggestions like:
- “You usually take 2 hours for BOQ tasks”
- “Finish this urgent task first”

No heavy AI – rule + pattern-based learning initially

---

## 13. Smart KPI Balance Alerts

System detects imbalance:
- Too much documentation
- Too little site work
- Excess purchase tasks without follow-ups

Warning shown:
“Your KPI balance is off. Adjust tasks.”

---

## 14. Weekly Reflection Module

Every Friday, employee answers:
1. What went well this week?
2. What delayed your tasks?
3. What can be improved?

Stored as:
- Employee self-growth report
- Manager review input

---

## 15. Dashboard & Culture Layer

### 15.1 Employee Dashboard
- Pie / donut charts for 5 KPIs
- Daily motivational messages
- Task completion progress

### 15.2 Company Announcements Board
- Birthdays
- Announcements
- Recognition

### 15.3 Recognition Widgets
- Star of the Day
- High Performer of Week
- Best Team Player
- Most Improved Employee

---

## 16. Non-Negotiable Rules (Very Important)
- No task without KPI
- No On-Hold without reason
- No day-end exit without update
- Carry-forward always logged
- Managers must approve closures

---

## 17. Build Priority (Suggested Phases)

**Phase 1:** Core tasks, statuses, daily rituals, carry-forward
**Phase 2:** Manager radar, KPI buckets, notifications
**Phase 3:** Gamification, AI suggestions, WhatsApp nudges

---

## 18. Success Criteria
- Reduced task carry-forward
- Better KPI distribution
- Higher on-time completion
- Manager clarity on workload

---

**This document is the single source of truth for development. Any deviation must be discussed and approved.**

