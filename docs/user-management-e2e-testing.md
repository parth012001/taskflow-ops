# User Management E2E Testing Guide

This guide walks through manually testing the Admin User Management feature end-to-end.

## Prerequisites

1. Application is running locally (`npm run dev`)
2. Database is seeded with at least one ADMIN user
3. You have access to admin credentials (e.g., `admin@taskflow.com`)

---

## Test 1: Admin Access Control

### 1.1 Verify Non-Admin Cannot Access User Management

1. Log in as a non-admin user (EMPLOYEE, MANAGER, or DEPARTMENT_HEAD)
2. Try navigating directly to `/settings/users`
3. **Expected:** Redirected to `/dashboard`
4. **Verify:** "User Management" link is NOT visible in the sidebar

### 1.2 Verify Admin Can Access User Management

1. Log in as an ADMIN user
2. **Verify:** "User Management" link is visible in the sidebar (between KPI Management and Settings)
3. Click "User Management" in the sidebar
4. **Expected:** Navigate to `/settings/users` and see the User Management panel

---

## Test 2: View Users List

### 2.1 View All Users

1. Navigate to `/settings/users` as admin
2. **Verify:** Table shows list of users with columns:
   - User (Name + Email)
   - Role
   - Department
   - Reports To
   - Status
   - Actions

### 2.2 Search Users

1. Type a name or email in the search box
2. **Verify:** Table filters to show only matching users
3. Clear the search box
4. **Verify:** All users are shown again

### 2.3 Filter by Role

1. Click the "All Roles" dropdown
2. Select "Employee"
3. **Verify:** Only users with EMPLOYEE role are shown
4. Select "All Roles" to reset

### 2.4 Filter by Department

1. Click the "All Depts" dropdown
2. Select a department
3. **Verify:** Only users in that department are shown
4. Select "All Departments" to reset

### 2.5 Filter by Status

1. Click the "All Status" dropdown
2. Select "Active"
3. **Verify:** Only active users are shown
4. Select "Inactive"
5. **Verify:** Only inactive users are shown
6. Select "All Status" to reset

### 2.6 Pagination (if more than 20 users)

1. **Verify:** Pagination controls appear at bottom
2. Click next page arrow
3. **Verify:** Next page of users is shown
4. **Verify:** "Showing X to Y of Z users" text updates correctly

---

## Test 3: Create User

### 3.1 Create User with Auto-Generated Password

1. Click "Create User" button
2. Fill in the form:
   - Email: `testuser1@example.com`
   - First Name: `Test`
   - Last Name: `User One`
   - Role: `Employee`
   - Department: (select any or leave empty)
   - Reports To: (select any manager or leave empty)
   - Auto-generate Password: ON (default)
3. Click "Create User"
4. **Verify:** Success modal appears showing:
   - Email
   - Name
   - Temporary password (random string)
5. Click the copy button next to password
6. **Verify:** Toast shows "Password copied to clipboard"
7. Click "Done"
8. **Verify:** Modal closes and new user appears in the table
9. **Verify:** New user has "Pending" badge (indicates must change password)

### 3.2 Create User with Manual Password

1. Click "Create User" button
2. Fill in the form:
   - Email: `testuser2@example.com`
   - First Name: `Test`
   - Last Name: `User Two`
   - Role: `Manager`
   - Auto-generate Password: OFF (toggle it)
3. Enter password: `TestPass123`
4. Click "Create User"
5. **Verify:** Success toast appears
6. **Verify:** Modal closes and new user appears in the table

### 3.3 Validation Errors

1. Click "Create User" button
2. Try to submit with empty fields
3. **Verify:** Browser validation prevents submission
4. Enter an existing email (e.g., `admin@taskflow.com`)
5. Fill other required fields and submit
6. **Verify:** Error toast: "A user with this email already exists"

---

## Test 4: Edit User

### 4.1 Edit User Details

1. Find a user in the table
2. Click the pencil (Edit) icon
3. **Verify:** Edit modal opens with pre-filled data
4. **Verify:** Email field is disabled and shows "Email cannot be changed"
5. Change First Name to "Updated"
6. Change Role to "Manager"
7. Select a different Department
8. Click "Update"
9. **Verify:** Success toast appears
10. **Verify:** User details are updated in the table

### 4.2 Cannot Edit Own Role (as Admin)

1. Find your own admin account in the table
2. Click Edit
3. Try to change the Role dropdown
4. Click "Update"
5. **Verify:** Error toast: "You cannot change your own role"

---

## Test 5: Deactivate/Reactivate User

### 5.1 Deactivate a User

1. Find an active user (not yourself)
2. Click the power icon (amber color)
3. **Verify:** Confirmation dialog appears
4. Click "Deactivate"
5. **Verify:** Success toast appears
6. **Verify:** User status changes to "Inactive" in the table

### 5.2 Reactivate a User

1. Find the inactive user from step 5.1
2. Click the power icon (green color)
3. **Verify:** Confirmation dialog appears
4. Click "Reactivate"
5. **Verify:** Success toast appears
6. **Verify:** User status changes to "Active" in the table

### 5.3 Cannot Deactivate Self

1. Find your own admin account in the table
2. Click the power icon
3. Click "Deactivate" in the confirmation dialog
4. **Verify:** Error toast: "You cannot deactivate your own account"

---

## Test 6: Reset Password

### 6.1 Reset Password with Auto-Generate

1. Find a user in the table
2. Click the key icon (Reset Password)
3. **Verify:** Reset password modal opens
4. Keep "Auto-generate Password" ON
5. Click "Reset Password"
6. **Verify:** Success modal shows new temporary password
7. Click copy button
8. **Verify:** Password copied to clipboard
9. Click "Done"
10. **Verify:** User now has "Pending" badge in the table

### 6.2 Reset Password with Manual Entry

1. Find a user in the table
2. Click the key icon
3. Toggle "Auto-generate Password" OFF
4. Enter new password: `NewPass456`
5. Click "Reset Password"
6. **Verify:** Success toast appears
7. **Verify:** Modal closes

---

## Test 7: Force Password Change Flow

### 7.1 New User First Login

1. Log out of admin account
2. Log in with the test user created in Test 3.1 using the temporary password
3. **Verify:** Redirected to `/settings?passwordChange=required`
4. **Verify:** Yellow alert banner shows "Password Change Required"
5. Try navigating to `/dashboard`
6. **Verify:** Redirected back to `/settings?passwordChange=required`

### 7.2 Change Password

1. On the Settings page, scroll to "Change Password" section
2. Enter current password (the temporary password)
3. Enter new password: `MyNewSecurePass1`
4. Confirm new password: `MyNewSecurePass1`
5. Click "Change Password"
6. **Verify:** Success toast: "Password changed successfully"
7. **Verify:** Automatically redirected to `/dashboard`

### 7.3 Verify Password Changed

1. Log out
2. Try logging in with the old temporary password
3. **Verify:** Login fails with "Invalid email or password"
4. Log in with the new password
5. **Verify:** Login succeeds and navigates to dashboard
6. **Verify:** No forced redirect to settings page
7. Navigate to Settings
8. **Verify:** No "Password Change Required" alert

---

## Test 8: Edge Cases

### 8.1 Inactive User Cannot Login

1. As admin, deactivate a test user
2. Log out
3. Try to log in as the deactivated user
4. **Verify:** Login fails with "Invalid email or password"
5. Log back in as admin and reactivate the user
6. **Verify:** User can now log in again

### 8.2 Manager Assignment Validation

1. Click "Create User" or edit an existing user
2. In "Reports To" dropdown
3. **Verify:** Only users with MANAGER, DEPARTMENT_HEAD, or ADMIN roles appear
4. **Verify:** EMPLOYEEs do not appear in the dropdown

### 8.3 Self-Reference Prevention

1. Edit a user
2. Check "Reports To" dropdown
3. **Verify:** The user being edited does not appear in their own manager dropdown

---

## Test 9: API Security (Optional - Browser DevTools)

### 9.1 Unauthorized Access

1. Log out
2. Open browser DevTools > Network tab
3. Try accessing `GET /api/admin/users` directly
4. **Verify:** Returns 401 Unauthorized

### 9.2 Forbidden Access (Non-Admin)

1. Log in as non-admin user
2. In DevTools Console, run:
   ```javascript
   fetch('/api/admin/users').then(r => r.json()).then(console.log)
   ```
3. **Verify:** Returns 403 Forbidden

---

## Checklist Summary

| Test | Description | Pass/Fail |
|------|-------------|-----------|
| 1.1 | Non-admin cannot access user management | |
| 1.2 | Admin can access user management | |
| 2.1 | View all users | |
| 2.2 | Search users | |
| 2.3 | Filter by role | |
| 2.4 | Filter by department | |
| 2.5 | Filter by status | |
| 2.6 | Pagination works | |
| 3.1 | Create user with auto-generated password | |
| 3.2 | Create user with manual password | |
| 3.3 | Validation errors shown | |
| 4.1 | Edit user details | |
| 4.2 | Cannot edit own role | |
| 5.1 | Deactivate user | |
| 5.2 | Reactivate user | |
| 5.3 | Cannot deactivate self | |
| 6.1 | Reset password (auto-generate) | |
| 6.2 | Reset password (manual) | |
| 7.1 | Force password change redirect | |
| 7.2 | Change password clears flag | |
| 7.3 | New password works | |
| 8.1 | Inactive user cannot login | |
| 8.2 | Manager dropdown only shows managers+ | |
| 8.3 | Cannot set self as own manager | |
| 9.1 | API rejects unauthorized requests | |
| 9.2 | API rejects non-admin requests | |

---

## Notes

- All password changes set `mustChangePassword: true` for admin-initiated resets
- Users changing their own password clear the `mustChangePassword` flag
- The `passwordChangedAt` timestamp is updated when users change their own password
- Email addresses cannot be changed after user creation
- Soft delete is used (isActive flag) - users are never hard deleted
