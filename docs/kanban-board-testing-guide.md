# Kanban Board UX Overhaul - Testing Guide

This guide provides step-by-step instructions to manually test all the new Kanban board features.

## Prerequisites

1. Start the development server:
   ```bash
   npm run dev
   ```
2. Open http://localhost:3000 in your browser
3. Log in with different user roles to test role-specific features:
   - **Employee** account (for basic features)
   - **Manager** account (for approval features)
   - **Admin** account (for all features)

---

## Phase 1: 4-Column Consolidation + Visual Badges

### Test 1.1: Verify 4 Columns Display
1. Navigate to `/tasks`
2. **Expected**: Board shows exactly 4 columns:
   - [ ] "To Do" (gray header)
   - [ ] "In Progress" (indigo header)
   - [ ] "In Review" (purple header)
   - [ ] "Done" (green header)

### Test 1.2: Verify Status Grouping
1. Create or find tasks with these statuses:
   - NEW, ACCEPTED, REOPENED → should appear in "To Do"
   - IN_PROGRESS, ON_HOLD → should appear in "In Progress"
   - COMPLETED_PENDING_REVIEW → should appear in "In Review"
   - CLOSED_APPROVED → should appear in "Done"
2. **Expected**: Each status appears in its correct column
   - [ ] NEW tasks in "To Do"
   - [ ] ACCEPTED tasks in "To Do"
   - [ ] REOPENED tasks in "To Do"
   - [ ] IN_PROGRESS tasks in "In Progress"
   - [ ] ON_HOLD tasks in "In Progress"
   - [ ] COMPLETED_PENDING_REVIEW tasks in "In Review"
   - [ ] CLOSED_APPROVED tasks in "Done"

### Test 1.3: ON_HOLD Badge
1. Find or create a task that is ON_HOLD
2. **Expected**:
   - [ ] Yellow badge with pause icon showing "On Hold" appears on the card

### Test 1.4: REOPENED Badge
1. Find or create a task that was REOPENED
2. **Expected**:
   - [ ] Red badge with rotate icon showing "Reopened" appears on the card

### Test 1.5: Overdue Badge
1. Find or create a task with a deadline in the past (not CLOSED_APPROVED)
2. **Expected**:
   - [ ] Red pulsing badge with alert icon showing "Overdue" appears on the card
   - [ ] Badge should NOT appear on completed (CLOSED_APPROVED) tasks

---

## Phase 2: Inline Reason Collection for Drag-Drop

### Test 2.1: Drag to ON_HOLD (Requires Reason)
1. Find a task in IN_PROGRESS status
2. Drag it within the "In Progress" column (simulating pause action) OR use quick action
3. **Expected**:
   - [ ] "Put Task On Hold" modal appears
   - [ ] Modal shows task title
   - [ ] Textarea for reason with character count (0/500, min 10)
   - [ ] "Put On Hold" button is disabled until 10+ characters entered
4. Enter a reason with less than 10 characters
   - [ ] Button remains disabled
5. Enter a reason with 10+ characters
   - [ ] Button becomes enabled
6. Click "Put On Hold"
   - [ ] Modal closes
   - [ ] Task shows yellow "On Hold" badge
   - [ ] Toast notification appears

### Test 2.2: Drag to REOPENED (Requires Reason) - Manager Only
1. Log in as a **Manager** or **Admin**
2. Find a task in COMPLETED_PENDING_REVIEW status (owned by someone else)
3. Attempt to reject via drag or quick action
4. **Expected**:
   - [ ] "Reopen Task" modal appears
   - [ ] Modal has red "Reopen Task" button (destructive style)
   - [ ] Reason is required (min 10 characters)
5. Submit with valid reason
   - [ ] Task moves to "To Do" column with "Reopened" badge

### Test 2.3: Drag Without Reason (Normal Transitions)
1. Find a NEW task, drag to "In Progress" column
   - [ ] Task moves immediately, no modal appears
2. Find an IN_PROGRESS task, drag to "In Review" column
   - [ ] Task moves immediately, no modal appears
3. (As Manager) Find a COMPLETED_PENDING_REVIEW task, drag to "Done"
   - [ ] Task moves immediately, no modal appears

### Test 2.4: Cancel Reason Modal
1. Trigger the ON_HOLD modal (drag IN_PROGRESS task)
2. Click "Cancel" button
   - [ ] Modal closes
   - [ ] Task remains in original position

---

## Phase 3: View Tabs (Role-Based)

### Test 3.1: Employee View
1. Log in as an **Employee**
2. Navigate to `/tasks`
3. **Expected**:
   - [ ] NO tabs visible above the board
   - [ ] Only sees their own tasks

### Test 3.2: Manager View
1. Log in as a **Manager**
2. Navigate to `/tasks`
3. **Expected**:
   - [ ] Tabs visible: "My Tasks" | "Team Tasks"
   - [ ] "My Tasks" is selected by default
4. Click "Team Tasks"
   - [ ] Board refreshes to show team's tasks
   - [ ] Tab highlight moves to "Team Tasks"

### Test 3.3: Admin/Department Head View
1. Log in as an **Admin** or **Department Head**
2. Navigate to `/tasks`
3. **Expected**:
   - [ ] Tabs visible: "My Tasks" | "Team Tasks" | "All Tasks"
4. Click through each tab
   - [ ] "My Tasks" → shows only your tasks
   - [ ] "Team Tasks" → shows your team's tasks
   - [ ] "All Tasks" → shows all tasks in the system

---

## Phase 4: Filter Bar

### Test 4.1: Filter Dropdowns Exist
1. Navigate to `/tasks`
2. **Expected**: Four filter buttons visible:
   - [ ] "Status" with tag icon
   - [ ] "Priority" with flag icon
   - [ ] "KPI Bucket" with folder icon
   - [ ] "Due Date" with calendar icon

### Test 4.2: Status Filter
1. Click "Status" button
2. **Expected**:
   - [ ] Dropdown opens with checkboxes for all statuses
   - [ ] Statuses listed: New, Accepted, In Progress, On Hold, Pending Review, Reopened, Completed
3. Check "In Progress" and "On Hold"
   - [ ] Badge shows "2" on Status button
   - [ ] Board filters to show only those statuses
   - [ ] Filter chips appear below: "In Progress" and "On Hold"

### Test 4.3: Priority Filter
1. Click "Priority" button
2. **Expected**:
   - [ ] Dropdown shows: P1 - Urgent & Important, P2 - Urgent, P3 - Important, P4 - Low Priority
   - [ ] Each has a colored dot indicator
3. Select "P1 - Urgent & Important"
   - [ ] Board filters to P1 tasks only
   - [ ] Chip shows "P1"

### Test 4.4: KPI Bucket Filter
1. Click "KPI Bucket" button
2. **Expected**:
   - [ ] Dropdown shows "All Buckets" plus your KPI buckets
3. Select a specific bucket
   - [ ] Board filters to tasks in that bucket
   - [ ] Chip shows bucket name

### Test 4.5: Due Date Filter
1. Click "Due Date" button
2. **Expected**:
   - [ ] Presets: Any Date, Overdue, Due Today, This Week, This Month
3. Select "Overdue"
   - [ ] Board shows only overdue tasks
   - [ ] Chip shows "Overdue"

### Test 4.6: Multiple Filters Combined
1. Select Status: "In Progress"
2. Select Priority: "P1"
3. Select Due Date: "This Week"
4. **Expected**:
   - [ ] All three filters applied (AND logic)
   - [ ] Three filter chips visible
   - [ ] Badges show counts on respective buttons

### Test 4.7: Remove Individual Filter
1. With filters active, click X on a filter chip
2. **Expected**:
   - [ ] That filter is removed
   - [ ] Board updates immediately
   - [ ] Other filters remain active

### Test 4.8: Clear All Filters
1. With multiple filters active, click "Clear all"
2. **Expected**:
   - [ ] All filters removed
   - [ ] All chips disappear
   - [ ] "Clear all" button disappears
   - [ ] Board shows all tasks

---

## Phase 5: Manager Review Queue Banner

### Test 5.1: Banner Visibility - Employee
1. Log in as an **Employee**
2. Navigate to `/tasks`
3. **Expected**:
   - [ ] NO purple review banner visible

### Test 5.2: Banner Visibility - Manager
1. Log in as a **Manager** (with team members who have pending reviews)
2. Navigate to `/tasks`
3. **Expected**:
   - [ ] Purple banner appears: "X tasks need your review"
   - [ ] Subtext: "Team members are waiting for your approval"
   - [ ] "View" button on the right

### Test 5.3: Banner Count Accuracy
1. Count tasks in COMPLETED_PENDING_REVIEW status for your team
2. Compare with banner count
3. **Expected**:
   - [ ] Count matches exactly
   - [ ] Singular form used for 1 task: "1 task needs your review"
   - [ ] Plural form for 2+: "3 tasks need your review"

### Test 5.4: Banner Click Action
1. Click "View" button on the banner
2. **Expected**:
   - [ ] View switches to "Team Tasks" (if was on "My Tasks")
   - [ ] Status filter set to "Pending Review"
   - [ ] Board shows only tasks awaiting review

### Test 5.5: Banner Hidden When No Reviews
1. Approve/reject all pending review tasks
2. Refresh the page
3. **Expected**:
   - [ ] Banner no longer appears (count is 0)

---

## Phase 6: Quick Actions + Collapsible Done

### Test 6.1: Quick Actions on Hover - NEW/ACCEPTED Task
1. Hover over a task in NEW or ACCEPTED status (that you own)
2. **Expected**:
   - [ ] "Start" button appears (play icon)
3. Click "Start"
   - [ ] Task moves to IN_PROGRESS status
   - [ ] Task stays in "In Progress" column

### Test 6.2: Quick Actions - IN_PROGRESS Task
1. Hover over a task in IN_PROGRESS status (that you own)
2. **Expected**:
   - [ ] "Complete" button (green, checkmark icon)
   - [ ] "Pause" button (yellow, pause icon)
3. Click "Complete"
   - [ ] Task moves to "In Review" column
4. (Separate test) Click "Pause"
   - [ ] Reason modal appears (see Phase 2)

### Test 6.3: Quick Actions - ON_HOLD Task
1. Hover over a task in ON_HOLD status (that you own)
2. **Expected**:
   - [ ] "Resume" button appears (play icon)
3. Click "Resume"
   - [ ] Task goes back to IN_PROGRESS
   - [ ] "On Hold" badge disappears

### Test 6.4: Quick Actions - REOPENED Task
1. Hover over a task in REOPENED status (that you own)
2. **Expected**:
   - [ ] "Resume" button appears
3. Click "Resume"
   - [ ] Task goes to IN_PROGRESS
   - [ ] "Reopened" badge disappears

### Test 6.5: Quick Actions - Manager Review
1. Log in as **Manager**
2. Hover over a COMPLETED_PENDING_REVIEW task (owned by team member)
3. **Expected**:
   - [ ] "Approve" button (green, checkmark)
   - [ ] "Reject" button (red, rotate icon)
4. Click "Approve"
   - [ ] Task moves to "Done" column
5. (Separate test) Click "Reject"
   - [ ] Reason modal appears

### Test 6.6: Quick Actions - Not Visible for Non-Owners
1. Hover over a task you don't own (and aren't manager of)
2. **Expected**:
   - [ ] No quick action buttons appear

### Test 6.7: Quick Actions - Not Visible for CLOSED_APPROVED
1. Hover over a completed task in "Done" column
2. **Expected**:
   - [ ] No quick action buttons appear (terminal state)

### Test 6.8: Collapsible Done Column
1. Locate the "Done" column header
2. **Expected**:
   - [ ] Collapse/expand icon visible (chevron up/down)
3. Click the header or collapse icon
   - [ ] Column collapses to narrow width
   - [ ] Only shows count badge
   - [ ] Tasks hidden

### Test 6.9: Expand Done Column
1. With Done column collapsed, click header or expand icon
2. **Expected**:
   - [ ] Column expands to full width
   - [ ] Tasks become visible again

### Test 6.10: Collapse State Persistence
1. Collapse the Done column
2. Refresh the page (F5)
3. **Expected**:
   - [ ] Done column remains collapsed
4. Expand and refresh again
   - [ ] Done column remains expanded

### Test 6.11: Drag to Collapsed Done Column
1. Collapse the Done column
2. Drag a COMPLETED_PENDING_REVIEW task (as manager) towards collapsed Done
3. **Expected**:
   - [ ] Drop zone highlights
   - [ ] Task is accepted and approved
   - [ ] Count in Done column increases

---

## Summary Checklist

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | 4 Columns display | [ ] |
| 1 | Status grouping correct | [ ] |
| 1 | ON_HOLD badge | [ ] |
| 1 | REOPENED badge | [ ] |
| 1 | OVERDUE badge | [ ] |
| 2 | ON_HOLD reason modal | [ ] |
| 2 | REOPENED reason modal | [ ] |
| 2 | Normal drag works | [ ] |
| 3 | Employee - no tabs | [ ] |
| 3 | Manager - 2 tabs | [ ] |
| 3 | Admin - 3 tabs | [ ] |
| 4 | Status filter | [ ] |
| 4 | Priority filter | [ ] |
| 4 | KPI Bucket filter | [ ] |
| 4 | Due Date filter | [ ] |
| 4 | Filter chips | [ ] |
| 4 | Clear all | [ ] |
| 5 | Banner visible for managers | [ ] |
| 5 | Banner hidden for employees | [ ] |
| 5 | Banner click filters | [ ] |
| 6 | Quick actions on hover | [ ] |
| 6 | Collapsible Done column | [ ] |
| 6 | Collapse state persists | [ ] |

---

## Troubleshooting

### Tasks not appearing in correct column
- Check the task's actual status in the database
- Verify the status-to-column mapping in `src/lib/utils/kanban-columns.ts`

### Quick actions not showing
- Verify you're the task owner (or manager for review actions)
- Check that you're hovering over the card (not just the column)

### Filters not working
- Check browser console for API errors
- Verify the API supports the filter parameters

### Collapse state not persisting
- Check localStorage for `kanban-done-collapsed` key
- Try clearing localStorage and testing again
