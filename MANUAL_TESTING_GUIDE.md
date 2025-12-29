# TaskFlow Phase 2 - Complete Manual Testing Guide

## Prerequisites

```bash
# 1. Make sure database is seeded with fresh data
npx prisma db push
npx prisma db seed

# 2. Start the dev server
npm run dev

# 3. Open http://localhost:3000
```

---

## Test Accounts

| Email | Password | Role | Reports To | Subordinates |
|-------|----------|------|------------|--------------|
| `admin@taskflow.com` | password123 | ADMIN | - | - |
| `head@taskflow.com` | password123 | DEPARTMENT_HEAD | - | manager1, manager2 |
| `manager1@taskflow.com` | password123 | MANAGER | head | employee1, employee2, employee3 |
| `manager2@taskflow.com` | password123 | MANAGER | head | employee4, employee5 |
| `employee1@taskflow.com` | password123 | EMPLOYEE | manager1 | - |
| `employee2@taskflow.com` | password123 | EMPLOYEE | manager1 | - |
| `employee3@taskflow.com` | password123 | EMPLOYEE | manager1 | - |
| `employee4@taskflow.com` | password123 | EMPLOYEE | manager2 | - |
| `employee5@taskflow.com` | password123 | EMPLOYEE | manager2 | - |

---

## FEATURE 1: Settings Page (`/settings`)

### Test as Employee1 (`employee1@taskflow.com`)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1.1 | Navigate to settings | Click gear icon in sidebar OR go to `/settings` | Settings page loads with 3 cards: Profile, Organization, Password |
| 1.2 | View profile info | Look at Profile card | Shows: First Name "Neha", Last Name "Gupta", Email (disabled), Role badge "Employee" |
| 1.3 | Update first name | Change "Neha" to "Neha Updated", click "Save Changes" | Toast "Profile updated successfully", name persists on refresh |
| 1.4 | Update last name | Change last name, save | Same success behavior |
| 1.5 | Email is readonly | Try to type in email field | Field should be disabled/grayed out |
| 1.6 | View organization | Look at Organization card | Shows: Department "Procurement", Reports To "Priya Sharma", Member Since date, Last Login |
| 1.7 | Change password - success | Enter current: "password123", new: "newpassword1", confirm: "newpassword1" | Toast "Password changed successfully", form clears |
| 1.8 | Change password - wrong current | Enter wrong current password | Toast error "Current password is incorrect" |
| 1.9 | Change password - mismatch | New and confirm don't match | Toast error "New passwords do not match" |
| 1.10 | Change password - too short | New password < 8 chars | Toast error about minimum length |
| 1.11 | Logout & login with new password | If you changed password, logout and login with new one | Should work |

---

## FEATURE 2: Notifications (`bell icon in header`)

### Test as Manager1 (`manager1@taskflow.com`)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 2.1 | Bell icon visible | Look at header (top right) | Bell icon present next to profile |
| 2.2 | Unread badge | Check bell icon | Red badge with unread count (should show at least 1) |
| 2.3 | Open dropdown | Click bell icon | Dropdown opens showing notifications list |
| 2.4 | Notification content | Look at notifications | Each has: icon, title, message, timestamp ("Just now", "5m ago", etc.) |
| 2.5 | Unread indicator | Check unread notifications | Blue background + blue dot on right side |
| 2.6 | Click notification | Click any notification with entityType=Task | Navigates to `/tasks?taskId=xxx` and opens task modal |
| 2.7 | Mark as read on click | Click unread notification, reopen dropdown | That notification no longer has blue background |
| 2.8 | Mark all as read | Click "Mark all read" button | All notifications lose blue background, badge count becomes 0 |
| 2.9 | Empty state | If no notifications | Shows "No notifications yet" message |

### Generate test notifications:
1. Login as `employee1@taskflow.com`
2. Create a task and move it to "Completed - Pending Review"
3. Login as `manager1@taskflow.com`
4. Check bell - should see "Task Pending Review" notification

---

## FEATURE 3: Manager Reassignment (`/team` page)

### Test as Manager1 (`manager1@taskflow.com`)

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.1 | Access team page | Click "Team" in sidebar | Team page loads showing your subordinates |
| 3.2 | See pending reviews | Look at "Pending Reviews" section | Lists tasks in COMPLETED_PENDING_REVIEW status |
| 3.3 | Open task review | Click on a pending task | Dialog opens with task details |
| 3.4 | Find reassign button | In task review dialog, look for actions | "Reassign" button visible next to Approve/Reopen |
| 3.5 | Open reassign modal | Click "Reassign" | Modal opens with: task title, assignee dropdown, reason textarea, deadline picker |
| 3.6 | Assignee dropdown | Click dropdown | Shows your other subordinates (NOT current owner) |
| 3.7 | Reason validation - too short | Type < 10 chars, try to submit | Error: "Reason must be at least 10 characters" |
| 3.8 | Reason validation - success | Type 10+ chars reason | No error, can submit |
| 3.9 | Optional deadline | Leave deadline empty | Should be allowed |
| 3.10 | Set new deadline | Pick a future date | Should be allowed |
| 3.11 | Submit reassignment | Fill all required fields, click "Reassign Task" | Modal closes, toast success |
| 3.12 | Verify reassignment | Check the task | New owner should be the selected person |
| 3.13 | Check notifications | Login as OLD owner | Should see "Task reassigned" notification |
| 3.14 | Check notifications | Login as NEW owner | Should see "Task assigned to you" notification |

### Scope tests:

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 3.15 | Can't reassign to non-subordinate | As manager1, try reassigning to employee4 (manager2's subordinate) | Should NOT see employee4 in dropdown |
| 3.16 | Dept head can reassign anyone | Login as `head@taskflow.com`, reassign task | Can see all department employees in dropdown |

---

## FEATURE 4: Carry Forward (`/daily-planning`)

### Setup: First create an overdue task
1. Login as `employee1@taskflow.com`
2. Go to Tasks, create a new task with deadline = yesterday
3. Move task to IN_PROGRESS

### Test as Employee1

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.1 | Navigate to daily planning | Click "Daily Planning" in sidebar | Page loads with today's date |
| 4.2 | Add overdue task to plan | Click "Add Task", select your overdue task | Task appears in "Planned Tasks" |
| 4.3 | See carry forward button | Look at the overdue task card | Arrow icon button visible (only on overdue, non-completed tasks) |
| 4.4 | Open carry forward modal | Click the arrow button | Modal opens with: task title, current deadline, new deadline picker, reason textarea |
| 4.5 | Reason validation | Type < 10 chars, try to submit | Error about minimum 10 characters |
| 4.6 | Deadline validation | Try to pick today or past date | Should not be allowed (must be future) |
| 4.7 | Valid carry forward | Pick future date, write 10+ char reason, submit | Success toast, modal closes |
| 4.8 | Verify task updated | Check the task in Tasks page | Deadline updated to new date |
| 4.9 | Carry forward icon | Check task card | Should show carry-forward indicator if implemented |
| 4.10 | Multiple carry forwards | Carry forward same task again | carryForwardCount increments (check in task detail) |

### Edge cases:

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 4.11 | Task due today | Add a task due TODAY to plan | Should NOT show carry forward button (not overdue yet) |
| 4.12 | Completed task | Complete a task, check daily planning | Should NOT show carry forward button |
| 4.13 | Task due tomorrow | Add future-dated task | Should NOT show carry forward button |

---

## FEATURE 5: Morning Ritual Banner (`/dashboard`)

### Test as Employee1

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 5.1 | See banner | Go to Dashboard (make sure morning ritual NOT done) | Amber banner at top: "Start your day right! Complete your morning planning ritual." |
| 5.2 | Banner has link | Check banner | "Start Planning" button links to `/daily-planning` |
| 5.3 | Banner dismissible | Click X button on banner | Banner disappears |
| 5.4 | Dismiss persists in session | Navigate away and back to dashboard | Banner should NOT reappear (sessionStorage) |
| 5.5 | Dismiss resets on new session | Close browser completely, reopen | Banner should reappear (if morning ritual not done) |
| 5.6 | Complete morning ritual | Go to Daily Planning, complete morning ritual | Return to Dashboard |
| 5.7 | Banner gone after completion | Check dashboard after completing ritual | Banner should NOT appear |

---

## EXISTING FEATURES TO VERIFY

### Dashboard (`/dashboard`)

| # | Test Case | Expected Behavior |
|---|-----------|------------------|
| 6.1 | Stats cards | Show: In Progress, Pending Review, Overdue, Completed counts |
| 6.2 | Daily summary | Due Today, This Week, Completion % |
| 6.3 | Streak display | Current streak and longest streak numbers |
| 6.4 | Recent activity | Timeline of recent task actions |
| 6.5 | KPI distribution | Circles showing task distribution by KPI bucket |
| 6.6 | Manager view | As manager, see "Pending Reviews" section |

### Tasks Page (`/tasks`)

| # | Test Case | Expected Behavior |
|---|-----------|------------------|
| 7.1 | Kanban columns | 7 columns: New, Accepted, In Progress, On Hold, Pending Review, Closed, Reopened |
| 7.2 | Create task | Click "+", fill form, submit -> task appears in "New" |
| 7.3 | Drag & drop | Drag task between valid columns -> status updates |
| 7.4 | Invalid transitions | Drag to invalid column -> should snap back |
| 7.5 | Task detail modal | Click task card -> modal with Details, Comments, History tabs |
| 7.6 | Add comment | In modal, add comment -> appears in list |
| 7.7 | Status history | History tab shows all status changes |
| 7.8 | Search | Type in search -> filters tasks by title |
| 7.9 | Priority filter | Select priority -> only matching tasks shown |

### Task State Transitions

| From | To | Who Can Do It | Extra Requirement |
|------|----|--------------|--------------------|
| NEW | ACCEPTED | Owner only | - |
| ACCEPTED | IN_PROGRESS | Owner only | - |
| IN_PROGRESS | ON_HOLD | Owner only | Reason required |
| IN_PROGRESS | COMPLETED_PENDING_REVIEW | Owner only | - |
| ON_HOLD | IN_PROGRESS | Owner only | - |
| COMPLETED_PENDING_REVIEW | CLOSED_APPROVED | Manager+ (not owner) | - |
| COMPLETED_PENDING_REVIEW | REOPENED | Manager+ (not owner) | Reason required |
| REOPENED | IN_PROGRESS | Owner only | - |
| CLOSED_APPROVED | REOPENED | Manager+ | Reason required |

### Daily Planning (`/daily-planning`)

| # | Test Case | Expected Behavior |
|---|-----------|------------------|
| 8.1 | Date navigation | Arrows change date, "Today" button returns to current |
| 8.2 | Add task to plan | Click "Add Task", pick from available tasks |
| 8.3 | Remove task | Click X on planned task -> removed from plan |
| 8.4 | Morning ritual | Write notes, click "Complete Morning Ritual" -> timestamp saved |
| 8.5 | Evening ritual | Only enabled after morning done |
| 8.6 | Time estimate | Shows total estimated time for planned tasks |
| 8.7 | Past dates | Can view past days' plans (read-only rituals) |

### Team Page (`/team`) - Manager only

| # | Test Case | Expected Behavior |
|---|-----------|------------------|
| 9.1 | Employee redirect | Login as employee, go to /team -> redirect to dashboard |
| 9.2 | Team members list | Shows subordinates with their task stats |
| 9.3 | Pending reviews | Shows tasks needing your approval |
| 9.4 | Approve task | Click task, click Approve -> status changes to CLOSED_APPROVED |
| 9.5 | Reopen task | Click task, write reason, click Reopen -> status changes to REOPENED |

---

## CROSS-FEATURE TESTS

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 10.1 | Notification from reassignment | Reassign task as manager | Both old and new owner get notifications |
| 10.2 | Notification from approval | Approve a task | Task owner gets notification |
| 10.3 | Notification from reopen | Reopen a task with reason | Task owner gets notification |
| 10.4 | Navigation from notification | Click task notification | Opens task modal on /tasks page |
| 10.5 | Carry forward + notifications | Carry forward overdue task | Check if any notification created |

---

## QUICK SMOKE TEST (5 minutes)

If you're short on time, do these:

1. **Login** as `employee1@taskflow.com` / password123
2. **Dashboard**: See stats, see morning banner
3. **Settings**: Change first name, save, verify toast
4. **Tasks**: Create a task, drag it through: New -> Accepted -> In Progress -> Pending Review
5. **Switch user** to `manager1@taskflow.com`
6. **Notifications**: See unread badge, click notification, verify navigation
7. **Team**: Find pending task, click Approve
8. **Switch back** to employee1
9. **Notifications**: See "Task Approved" notification
10. **Daily Planning**: Add a task, complete morning ritual

---

## CURRENT DATABASE STATE

Run this to check your database status:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const users = await prisma.user.count();
  const tasks = await prisma.task.count();
  const notifications = await prisma.notification.count();
  console.log('Users:', users, '| Tasks:', tasks, '| Notifications:', notifications);
  await prisma.\$disconnect();
}
check();
"
```

Expected: Users: 9 | Tasks: 9 | Notifications: 2

---

## KNOWN LIMITATIONS

1. **Component tests only** - No E2E/integration tests with real browser
2. **API routes not unit tested** - Would require Prisma mocking
3. **No real-time updates** - Notifications require manual refresh
4. **Carry forward button** only shows on tasks with deadline BEFORE today (not today)

---

*Last Updated: December 28, 2024*
