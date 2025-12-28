# TaskFlow: Phase 2 Completion Checklist

## Overview

This document outlines the remaining work needed to fully complete Phases 1 & 2 before starting Phase 3 (Gamification, AI, WhatsApp nudges).

**Current Status:** ~92% complete
**Target:** 100% core feature coverage

---

## Phase 1 Gaps (Core Tasks, Statuses, Daily Rituals, Carry-Forward)

### 1. Carry-Forward Automation

**PRD Requirement (Section 8):**
> End of day: All unticked tasks auto-move to next day. Mandatory reason required per task. Reason logged & tracked.

**Current State:**
- ✅ `CarryForwardLog` model exists with required `reason` field
- ✅ `Task` has `isCarriedForward`, `originalDeadline`, `carryForwardCount` fields
- ❌ No automation to trigger carry-forward at end of day

**Implementation Needed:**
```
Option A: Cron Job (Recommended)
- Create a scheduled job that runs at 11:59 PM daily
- Find all incomplete tasks where deadline < today
- Prompt users (via notification) to provide carry-forward reason
- Move deadline to next working day
- Increment carryForwardCount
- Log to CarryForwardLog

Option B: On-Demand (Simpler)
- Add "Carry Forward" button in daily planning evening view
- User manually triggers carry-forward with reason
- Same logging logic
```

**Files to Create/Modify:**
- `src/app/api/tasks/carry-forward/route.ts` - API endpoint
- `src/lib/jobs/carry-forward.ts` - Cron logic (if using Option A)
- `src/components/tasks/carry-forward-modal.tsx` - Reason input modal

**Effort:** ~4-6 hours

---

### 2. Evening Ritual Enforcement

**PRD Requirement (Section 10.2):**
> Before logout: Update task statuses, tick completed tasks, provide reason for pending tasks. If skipped → manager notified.

**Current State:**
- ✅ `DailyPlanningSession.eveningCompleted` field exists
- ✅ Daily planning page has evening section
- ❌ No enforcement preventing logout/exit without completing ritual
- ❌ No auto-notification to manager if skipped

**Implementation Needed:**
```
1. Evening Ritual Modal/Blocker
   - Show modal at end of workday (e.g., 5:30 PM) or on logout
   - List all tasks planned for today
   - Require status update for each incomplete task
   - Require carry-forward reason for pending tasks

2. Manager Notification
   - If user closes browser without completing evening ritual
   - Send notification to manager next morning
   - Track in DailyPlanningSession
```

**Files to Create/Modify:**
- `src/components/rituals/evening-ritual-modal.tsx` - Enforcement modal
- `src/app/(dashboard)/layout.tsx` - Trigger modal on idle/exit
- `src/app/api/notifications/ritual-reminder/route.ts` - Manager notification

**Effort:** ~6-8 hours

---

### 3. Morning Ritual Notification

**PRD Requirement (Section 10.1):**
> System auto-opens daily planning. If skipped → notification sent.

**Current State:**
- ✅ Daily planning page exists
- ✅ Morning completion tracking works
- ❌ No auto-open/prompt on login
- ❌ No notification if morning ritual skipped

**Implementation Needed:**
```
1. Auto-Prompt on Login
   - Check if morningCompleted = false for today
   - Redirect to /daily-planning or show modal

2. Reminder Notification
   - If 10 AM and morning ritual not done → send notification
   - Requires scheduled job
```

**Files to Create/Modify:**
- `src/app/(dashboard)/layout.tsx` - Check ritual on mount
- `src/lib/jobs/ritual-reminder.ts` - Scheduled check

**Effort:** ~3-4 hours

---

## Phase 2 Gaps (Manager Radar, KPI Buckets, Notifications)

### 4. Manager Task Reassignment UI

**PRD Requirement (Section 7.4):**
> Managers can: Reassign tasks instantly, Adjust deadlines.

**Current State:**
- ✅ Team page shows team members and their tasks
- ✅ Pending review tasks visible
- ❌ No "Reassign" action button
- ❌ No deadline adjustment UI for manager

**Implementation Needed:**
```
1. Reassign Task Modal
   - Select new assignee from team dropdown
   - Add optional reassignment note
   - Update task.ownerId
   - Log in TaskStatusHistory

2. Adjust Deadline UI
   - Quick deadline picker on task card
   - Manager can extend/shorten deadline
   - Log change
```

**Files to Create/Modify:**
- `src/components/team/reassign-task-modal.tsx` - Reassignment UI
- `src/app/api/tasks/[taskId]/reassign/route.ts` - Reassignment API
- `src/app/(dashboard)/team/page.tsx` - Add action buttons

**Effort:** ~4-5 hours

---

### 5. Auto-Escalation System

**PRD Requirement (Section 11.1):**
> Triggered if: Task delayed, Task On-Hold too long, No status update for X hours.
> Escalation chain: Employee → Manager → Department Head.

**Current State:**
- ✅ `EscalationLog` model exists
- ✅ `Notification` model exists
- ❌ No automated escalation triggers
- ❌ No escalation thresholds configured

**Implementation Needed:**
```
1. Escalation Rules Engine
   - Task overdue by 24h → Notify employee
   - Task overdue by 48h → Escalate to manager
   - Task overdue by 72h → Escalate to department head
   - On-Hold > 48h without update → Escalate

2. Scheduled Job
   - Run every hour
   - Check tasks against escalation rules
   - Create notifications and escalation logs
```

**Files to Create/Modify:**
- `src/lib/jobs/escalation-check.ts` - Escalation logic
- `src/lib/config/escalation-rules.ts` - Configurable thresholds
- `src/app/api/escalations/route.ts` - View escalations

**Effort:** ~6-8 hours

---

### 6. Settings Page

**Current State:**
- ✅ Sidebar has Settings link
- ❌ `/settings` page returns 404

**Implementation Needed:**
```
Basic settings page with:
- User profile (name, email, avatar)
- Notification preferences
- Password change
- Theme preference (future)
```

**Files to Create:**
- `src/app/(dashboard)/settings/page.tsx`
- `src/app/api/users/me/route.ts` - Update profile API

**Effort:** ~3-4 hours

---

## Summary Table

| Item | Phase | Priority | Effort | Status |
|------|-------|----------|--------|--------|
| Carry-Forward Automation | 1 | High | 4-6h | Not Started |
| Evening Ritual Enforcement | 1 | High | 6-8h | Not Started |
| Morning Ritual Notification | 1 | Medium | 3-4h | Not Started |
| Manager Reassignment UI | 2 | High | 4-5h | Not Started |
| Auto-Escalation System | 2 | Medium | 6-8h | Not Started |
| Settings Page | 2 | Low | 3-4h | Not Started |

**Total Estimated Effort:** 26-35 hours

---

## Recommended Order of Implementation

1. **Settings Page** (3-4h) - Quick win, fixes 404
2. **Manager Reassignment UI** (4-5h) - Core manager feature
3. **Carry-Forward Automation** (4-6h) - Critical daily workflow
4. **Morning Ritual Notification** (3-4h) - Builds on existing UI
5. **Evening Ritual Enforcement** (6-8h) - Complex but important
6. **Auto-Escalation System** (6-8h) - Can be simplified initially

---

## Technical Considerations

### Background Jobs

Several features require scheduled jobs:
- Carry-forward (daily at EOD)
- Ritual reminders (morning check)
- Escalation checks (hourly)

**Options:**
1. **Vercel Cron Jobs** - Native if deploying to Vercel
2. **External Cron (e.g., cron-job.org)** - Hits API endpoints
3. **Database-triggered** - Check on user login/action

### Notification Delivery

Current: In-app notifications only (Notification model)

Future (Phase 3):
- Email notifications
- WhatsApp integration

---

## Definition of Done (Before Phase 3)

- [ ] All Phase 1 gaps addressed
- [ ] All Phase 2 gaps addressed
- [ ] Settings page functional
- [ ] Manager can reassign tasks
- [ ] Carry-forward works (manual or automated)
- [ ] Basic escalation logging in place
- [ ] All 5 non-negotiable rules enforced
- [ ] Test coverage for new features

---

## Phase 3 Preview (What's Next)

Once Phase 2 is complete, Phase 3 includes:
- Gamification (streaks, badges, celebrations)
- AI-assisted planning suggestions
- WhatsApp/external nudges
- Calendar view integration
- KPI balance alerts and visualizations

---

*Last Updated: December 27, 2024*
