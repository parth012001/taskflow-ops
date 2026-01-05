# Phase 3 Testing Guide

## Overview

This document covers manual testing procedures for Phase 3 features:
- **Gamification System**: Confetti celebrations, streak badges, recognition widget
- **Company Announcements**: CRUD operations, role-based permissions, dashboard widget

---

## Prerequisites

1. Start the development server:
   ```bash
   npm run dev
   ```
2. Open `http://localhost:3000`
3. Have test accounts ready:
   - ADMIN or DEPARTMENT_HEAD (for announcements management)
   - EMPLOYEE or MANAGER (for permission testing)

---

## 1. Announcements Feature

### 1.1 Sidebar Navigation

| Test | Steps | Expected Result |
|------|-------|-----------------|
| ADMIN sees nav | Login as ADMIN | "Announcements" link visible in sidebar |
| DEPT_HEAD sees nav | Login as DEPARTMENT_HEAD | "Announcements" link visible in sidebar |
| MANAGER hidden | Login as MANAGER | "Announcements" link NOT visible |
| EMPLOYEE hidden | Login as EMPLOYEE | "Announcements" link NOT visible |

### 1.2 Announcements Page Access

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Authorized access | Login as ADMIN → Click "Announcements" | Page loads at `/announcements` |
| Unauthorized redirect | Login as EMPLOYEE → Go to `/announcements` | Redirected to `/dashboard` |

### 1.3 Create Announcement

**Steps:**
1. Login as ADMIN or DEPARTMENT_HEAD
2. Go to `/announcements`
3. Click "Create Announcement" button
4. Fill in the form fields

**Test Cases:**

| Test | Input | Expected Result |
|------|-------|-----------------|
| Valid creation | Title: "Test Announcement", Content: "This is test content for the announcement" | Success toast, announcement appears in table |
| Title too short | Title: "Hi" | Error toast: "Title must be at least 3 characters" |
| Content too short | Content: "Short" | Error toast: "Content must be at least 10 characters" |
| Whitespace bypass | Title: "   " (spaces only) | Error toast: "Title must be at least 3 characters" |
| All types | Create one of each type (General, Birthday, Event, Policy) | Each shows correct badge in table |
| All priorities | Create Low, Normal, High priority | Each shows correct styling |
| With expiry date | Set expiry to tomorrow | Shows expiry date in table |
| No expiry date | Leave expiry empty | Shows "Never" in table |

### 1.4 Edit Announcement

**Steps:**
1. In announcements table, click pencil icon on any row
2. Modify fields
3. Click "Update"

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Edit title | Change title → Save | Success toast, table updates |
| Edit content | Change content → Save | Success toast, table updates |
| Edit priority | Change priority → Save | Priority badge updates |
| Cancel edit | Open modal → Click Cancel | No changes saved |

### 1.5 Delete Announcement

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Delete with confirm | Click trash → Click "Delete" | Success toast, removed from active list |
| Cancel delete | Click trash → Click "Cancel" | Announcement remains |

### 1.6 Dashboard Announcements Widget

**Steps:**
1. Create 1-3 announcements with different priorities
2. Go to `/dashboard`

| Test | Expected Result |
|------|-----------------|
| Widget appears | "Announcements" card visible on dashboard |
| Priority order | HIGH priority announcements appear first |
| HIGH styling | HIGH priority has red left border accent |
| Type badges | Each announcement shows type badge |
| Max display | Only top 5 announcements shown |
| Empty state | If no announcements, widget doesn't appear |

### 1.7 Announcement Expiration

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Future expiry | Create with tomorrow's date | Shows on dashboard |
| Past expiry | Create, then check after expiry | Does NOT show on dashboard |
| No expiry | Create without expiry date | Always shows (until deleted) |

---

## 2. Gamification Feature

### 2.1 Streak Display

**Location:** Dashboard header (top right)

| Test | Condition | Expected Result |
|------|-----------|-----------------|
| No streak | currentStreak = 0 | No streak badge shown |
| Active streak | currentStreak > 0 | Flame icon + "X day streak!" badge |
| Streak count | Complete morning rituals | Count increments each day |

### 2.2 Recognition Badges

**Badge Types:**

| Badge | Trigger | Icon |
|-------|---------|------|
| EFFICIENT_STAR | 5-day morning ritual streak | Star (amber) |
| CONSISTENCY_KING | 20-day morning ritual streak | Crown (purple) |
| STAR_OF_DAY | Manual award | Trophy (gold) |
| HIGH_PERFORMER_WEEK | Manual award | Award (blue) |
| BEST_TEAM_PLAYER | Manual award | Users (green) |
| MOST_IMPROVED | Manual award | TrendingUp (emerald) |

### 2.3 Recognition Widget

**Location:** Dashboard (below stats grid)

| Test | Condition | Expected Result |
|------|-----------|-----------------|
| No badges | User has no recognitions | Widget doesn't appear |
| Has badges | User has 1+ recognitions | "Your Achievements" card appears |
| Badge display | Each recognition | Shows icon, name, date earned |
| Hover tooltip | Hover over badge | Shows description |

### 2.4 Earning EFFICIENT_STAR Badge

**Steps:**
1. Complete morning ritual for 5 consecutive days
2. On day 5, after completing morning ritual:

| Expected Result |
|-----------------|
| Badge awarded automatically |
| Confetti celebration fires |
| Badge appears in Recognition Widget |

### 2.5 Earning CONSISTENCY_KING Badge

**Steps:**
1. Complete morning ritual for 20 consecutive days
2. On day 20, after completing morning ritual:

| Expected Result |
|-----------------|
| Badge awarded automatically |
| Confetti celebration fires |
| Badge appears in Recognition Widget |

### 2.6 Confetti Celebration

**Triggers:**
1. Streak milestone reached (5 or 20 days)
2. All daily planned tasks marked as CLOSED_APPROVED

| Test | Expected Result |
|------|-----------------|
| Streak milestone | Full-screen confetti from both sides, ~3 seconds |
| Task completion | Burst confetti from center, ~1.5 seconds |
| No memory leak | Navigate away during confetti → No console errors |

---

## 3. Quick Database Testing (Prisma Studio)

To manually add test data:

```bash
npx prisma studio
```

### Add Test Announcement
1. Open `Announcement` table
2. Click "Add record"
3. Fill: title, content, type, priority, authorId, isActive=true
4. Save

### Add Test Recognition
1. Open `UserRecognition` table
2. Click "Add record"
3. Fill: userId, type (e.g., EFFICIENT_STAR), awardedDate
4. Save

### Modify Streak (for testing)
1. Open `UserStreak` table
2. Find user's record
3. Set `currentStreak` to 4 (then complete ritual to trigger badge)
4. Save

---

## 4. API Testing (Optional)

### Announcements API

```bash
# Get announcements (requires auth cookie)
curl http://localhost:3000/api/announcements

# Get with params
curl "http://localhost:3000/api/announcements?activeOnly=true&limit=5"
```

### Recognitions API

```bash
# Get current user's badges
curl http://localhost:3000/api/recognitions
```

---

## 5. Test Checklist

### Announcements
- [ ] ADMIN can see Announcements in sidebar
- [ ] DEPARTMENT_HEAD can see Announcements in sidebar
- [ ] EMPLOYEE cannot see Announcements in sidebar
- [ ] MANAGER cannot see Announcements in sidebar
- [ ] Can create announcement with valid data
- [ ] Title validation works (min 3 chars, trimmed)
- [ ] Content validation works (min 10 chars, trimmed)
- [ ] Can set type (General, Birthday, Event, Policy)
- [ ] Can set priority (Low, Normal, High)
- [ ] Can set optional expiry date
- [ ] Can edit existing announcement
- [ ] Can delete announcement
- [ ] Announcements appear on dashboard
- [ ] HIGH priority shown first on dashboard
- [ ] Expired announcements don't show on dashboard
- [ ] Empty state handled (no widget if no announcements)

### Gamification
- [ ] Streak badge shows on dashboard when streak > 0
- [ ] Streak count is accurate
- [ ] Recognition widget shows when user has badges
- [ ] Badge icons and colors display correctly
- [ ] Badge tooltips show on hover
- [ ] EFFICIENT_STAR awarded at 5-day streak
- [ ] CONSISTENCY_KING awarded at 20-day streak
- [ ] Confetti fires on streak milestone
- [ ] Confetti cleans up on unmount (no memory leak)
- [ ] No duplicate badges awarded

### Integration
- [ ] Dashboard loads without errors
- [ ] All existing features still work
- [ ] Build completes successfully
- [ ] All tests pass

---

## 6. Known Limitations

1. **Badge Testing**: EFFICIENT_STAR requires 5 real days of streaks (can use Prisma Studio to shortcut)
2. **Confetti Testing**: Best tested by modifying streak in database to 4, then completing ritual
3. **Timezone**: Expiry dates use end-of-day in user's local timezone

---

## 7. Troubleshooting

| Issue | Solution |
|-------|----------|
| Announcements not showing | Check `isActive=true` and `expiresAt` not in past |
| Badge not awarded | Check `UserRecognition` table for existing badge (unique constraint) |
| Confetti not firing | Check browser console for errors, ensure `trigger` state is true |
| Sidebar not updating | Hard refresh (Cmd+Shift+R) to clear cache |
| API 403 error | Verify user role is ADMIN or DEPARTMENT_HEAD |

---

*Last Updated: Phase 3 Implementation*
