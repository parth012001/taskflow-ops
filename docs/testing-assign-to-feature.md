# Testing Guide: "Assign To" Feature

This guide covers manual testing of the task assignment feature that allows managers and admins to assign tasks to other users.

## Prerequisites

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Ensure the database is seeded with test users:
   ```bash
   npx prisma db seed
   ```

3. Have the following test accounts ready (from seed data):
   - **Admin**: admin1@taskflow.com
   - **Manager**: manager1@taskflow.com
   - **Employee**: employee1@taskflow.com

---

## Test Cases

### Test 1: Employee Should NOT See "Assign To" Dropdown

**Steps:**
1. Login as `employee1@taskflow.com`
2. Navigate to **Tasks** page
3. Click **"New Task"** button
4. Observe the form fields

**Expected Result:**
- The form should show: Title, Description, KPI Bucket, Priority, Size, Time Estimate, Deadline
- **"Assign To" dropdown should NOT be visible**
- Employee can only create tasks for themselves

---

### Test 2: Manager Should See Subordinates Only

**Steps:**
1. Login as `manager1@taskflow.com`
2. Navigate to **Tasks** page
3. Click **"New Task"** button
4. Look for the **"Assign To"** dropdown (after KPI Bucket)

**Expected Result:**
- "Assign To" dropdown IS visible
- Dropdown shows "Myself (default)" as the first option
- Dropdown shows ONLY direct subordinates (employees reporting to this manager)
- Should NOT show other managers, department heads, or admins

**Verify Assignment:**
1. Fill in required fields (Title, KPI Bucket, Deadline)
2. Select a subordinate from "Assign To" dropdown
3. Click **"Create Task"**
4. Logout and login as the assigned employee
5. Navigate to Tasks page
6. Verify the new task appears in their task list

---

### Test 3: Admin Should See All Users

**Steps:**
1. Login as `admin1@taskflow.com`
2. Navigate to **Tasks** page
3. Click **"New Task"** button
4. Click the **"Assign To"** dropdown

**Expected Result:**
- "Assign To" dropdown IS visible
- Dropdown shows "Myself (default)" as the first option
- Dropdown shows ALL active users in the system (except the admin themselves)
- Users are sorted alphabetically by first name, then last name

**Verify Assignment:**
1. Fill in required fields (Title, KPI Bucket, Deadline)
2. Select any user from "Assign To" dropdown
3. Click **"Create Task"**
4. Task should be created successfully
5. Verify task appears in the assigned user's task list

---

### Test 4: Self-Assignment (Default Behavior)

**Steps:**
1. Login as `manager1@taskflow.com` or `admin1@taskflow.com`
2. Click **"New Task"**
3. Leave "Assign To" as "Myself (default)"
4. Fill in other required fields
5. Click **"Create Task"**

**Expected Result:**
- Task is created and assigned to the current user (self)
- Task appears in your own task list

---

### Test 5: Switching Between Self and Other User

**Steps:**
1. Login as `admin1@taskflow.com`
2. Click **"New Task"**
3. Select a user from "Assign To" dropdown
4. Change back to "Myself (default)"
5. Submit the form

**Expected Result:**
- Task is created and assigned to yourself
- Switching back to "Myself (default)" clears the assigneeId

---

## Database Verification (Optional)

After creating an assigned task, verify in the database:

```bash
npx prisma studio
```

Check the `Task` table for the newly created task:
- `ownerId` should be the assigned user's ID (not the creator)
- `assignerId` should be the creator's ID
- `assignedByType` should be "MANAGER" or "LEADERSHIP" (not "SELF")

---

## Troubleshooting

### "Assign To" dropdown not appearing for manager/admin

1. Check browser console for errors
2. Verify the user has `canAssignTasks` permission
3. Check `/api/tasks/assignees` response in Network tab

### Dropdown is empty (no users)

1. For MANAGER: Verify subordinates exist (`managerId` set to this manager)
2. For DEPARTMENT_HEAD: Verify department members exist
3. For ADMIN: Verify active users exist in the system
4. Check that users have `isActive: true` and `deletedAt: null`

### Task not appearing for assigned user

1. Verify the task was created (check Tasks page as admin)
2. Verify the correct user was selected
3. Check database for `ownerId` value

---

## Quick Checklist

| Role | "Assign To" Visible | Can Assign To |
|------|---------------------|---------------|
| EMPLOYEE | No | Only self |
| MANAGER | Yes | Self + subordinates |
| DEPARTMENT_HEAD | Yes | Self + department members |
| ADMIN | Yes | Self + all users |
