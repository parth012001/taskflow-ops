# Kanban Board Architecture

This document provides a complete picture of how the Kanban board works in TaskFlow, covering all levels, hierarchies, and implementation details.

---

## Table of Contents

1. [File Structure](#1-file-structure)
2. [Data Model](#2-data-model)
3. [Task Status Flow](#3-task-status-flow)
4. [Role Hierarchy & Permissions](#4-role-hierarchy--permissions)
5. [Kanban Board Display](#5-kanban-board-display)
6. [Drag-and-Drop Implementation](#6-drag-and-drop-implementation)
7. [State Management](#7-state-management)
8. [API Endpoints](#8-api-endpoints)
9. [Filtering & Search](#9-filtering--search)
10. [Additional Features](#10-additional-features)
11. [Current Pain Points](#11-current-pain-points)

---

## 1. File Structure

### Core Components

| File | Purpose |
|------|---------|
| `src/app/(dashboard)/tasks/page.tsx` | Main tasks page, orchestrates everything |
| `src/components/tasks/kanban-board.tsx` | Kanban board with drag-drop |
| `src/components/tasks/kanban-column.tsx` | Individual status column |
| `src/components/tasks/task-card.tsx` | Draggable task card |
| `src/components/tasks/task-detail-modal.tsx` | Full task details view |
| `src/components/tasks/create-task-form.tsx` | Task creation dialog |

### API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/tasks` | GET, POST | List tasks, create task |
| `/api/tasks/[taskId]` | GET, PUT, DELETE | Single task CRUD |
| `/api/tasks/[taskId]/transition` | POST | Status changes |
| `/api/tasks/[taskId]/comments` | GET, POST | Task comments |
| `/api/tasks/[taskId]/reassign` | POST | Reassign to different user |
| `/api/tasks/[taskId]/carry-forward` | POST | Extend deadline |
| `/api/tasks/assignees` | GET | Get users you can assign to |

### Business Logic

| File | Purpose |
|------|---------|
| `src/lib/utils/task-state-machine.ts` | Transition validation rules |
| `src/lib/utils/permissions.ts` | Role-based access control |
| `src/lib/validations/task.ts` | Zod schemas |

---

## 2. Data Model

### Task Entity (Core Fields)

```
Task
├── id, title, description
├── status (TaskStatus enum)
├── priority (TaskPriority enum)
├── size (TaskSize enum)
├── ownerId (who owns the task)
├── assignerId (who assigned it, if manager-assigned)
├── assignedByType (SELF, MANAGER, EA, LEADERSHIP)
├── kpiBucketId (required - every task contributes to a KPI)
├── estimatedMinutes, actualMinutes
├── deadline, startDate, completedAt
├── onHoldReason (when ON_HOLD)
├── rejectionReason (when REOPENED)
├── isCarriedForward, originalDeadline, carryForwardCount
└── deletedAt, deletedById (soft delete)
```

### Status Enum Values

```typescript
enum TaskStatus {
  NEW = "NEW",
  ACCEPTED = "ACCEPTED",
  IN_PROGRESS = "IN_PROGRESS",
  ON_HOLD = "ON_HOLD",
  COMPLETED_PENDING_REVIEW = "COMPLETED_PENDING_REVIEW",
  REOPENED = "REOPENED",
  CLOSED_APPROVED = "CLOSED_APPROVED"
}
```

### Priority Enum (Eisenhower Matrix)

```typescript
enum TaskPriority {
  URGENT_IMPORTANT = "URGENT_IMPORTANT",
  URGENT_NOT_IMPORTANT = "URGENT_NOT_IMPORTANT",
  NOT_URGENT_IMPORTANT = "NOT_URGENT_IMPORTANT",
  NOT_URGENT_NOT_IMPORTANT = "NOT_URGENT_NOT_IMPORTANT"
}
```

### Size Enum

```typescript
enum TaskSize {
  EASY = "EASY",
  MEDIUM = "MEDIUM",
  DIFFICULT = "DIFFICULT"
}
```

---

## 3. Task Status Flow

### State Diagram

```
                    ┌─────────────────────────────────────────┐
                    │                                         │
                    v                                         │
┌─────┐    ┌──────────┐    ┌─────────────┐    ┌───────────────────────────┐    ┌─────────────────┐
│ NEW │───>│ ACCEPTED │───>│ IN_PROGRESS │───>│ COMPLETED_PENDING_REVIEW  │───>│ CLOSED_APPROVED │
└─────┘    └──────────┘    └─────────────┘    └───────────────────────────┘    └─────────────────┘
   │                              │  ^                   │
   │                              │  │                   │
   │                              v  │                   v
   │                         ┌─────────┐            ┌──────────┐
   │                         │ ON_HOLD │            │ REOPENED │
   │                         └─────────┘            └──────────┘
   │                                                     │
   └─────────────────────────────────────────────────────┘
         (Can skip ACCEPTED for self-assigned tasks)
```

### Transition Rules

| From | To | Who Can Do It | Requires Reason |
|------|----|---------------|-----------------|
| NEW | ACCEPTED | Task owner only | No |
| NEW | IN_PROGRESS | Task owner only | No |
| ACCEPTED | IN_PROGRESS | Task owner only | No |
| IN_PROGRESS | ON_HOLD | Task owner only | **Yes** (min 10 chars) |
| ON_HOLD | IN_PROGRESS | Task owner only | No |
| IN_PROGRESS | COMPLETED_PENDING_REVIEW | Task owner only | No |
| COMPLETED_PENDING_REVIEW | CLOSED_APPROVED | Manager+ of owner | No |
| COMPLETED_PENDING_REVIEW | REOPENED | Manager+ of owner | **Yes** (min 10 chars) |
| REOPENED | IN_PROGRESS | Task owner only | No |

### Key Behaviors

- **CLOSED_APPROVED** is terminal - no further transitions allowed
- Moving to **IN_PROGRESS** sets `startDate` if not already set
- Moving to **CLOSED_APPROVED** sets `completedAt` timestamp
- **ON_HOLD** and **REOPENED** require a reason (minimum 10 characters)

---

## 4. Role Hierarchy & Permissions

### Role Levels (Low to High)

```
EMPLOYEE → MANAGER → DEPARTMENT_HEAD → ADMIN
```

### Task Visibility

| Role | Can See |
|------|---------|
| Employee | Only their own tasks |
| Manager | Own tasks + direct subordinates' tasks |
| Department Head | All tasks in their department |
| Admin | All tasks in the system |

### Task Actions by Role

| Action | Employee | Manager | Dept Head | Admin |
|--------|:--------:|:-------:|:---------:|:-----:|
| Create task | ✓ | ✓ | ✓ | ✓ |
| View own tasks | ✓ | ✓ | ✓ | ✓ |
| View team tasks | ✗ | ✓ | ✓ | ✓ |
| Edit own tasks | ✓ | ✓ | ✓ | ✓ |
| Assign to others | ✗ | ✓ (subordinates) | ✓ (dept) | ✓ (any) |
| Approve/Reject tasks | ✗ | ✓ (subordinates) | ✓ (dept) | ✓ (any) |
| Delete tasks | ✗ | ✗ | ✗ | ✓ |
| Reassign tasks | ✗ | ✓ (subordinates) | ✓ (dept) | ✓ (any) |

### Scoping Rules

**Managers:**
- Can only assign tasks to their direct subordinates
- Can only approve/reject their subordinates' tasks
- Cannot see tasks of users outside their reporting chain

**Department Heads:**
- Can assign to anyone in their department
- Can approve/reject any task within their department
- Full visibility within department only

**Admins:**
- No restrictions - full access to everything

---

## 5. Kanban Board Display

### Column Order (Left to Right)

| # | Column | Status Value | Label Shown |
|---|--------|--------------|-------------|
| 1 | NEW | `NEW` | "New" |
| 2 | ACCEPTED | `ACCEPTED` | "Accepted" |
| 3 | IN_PROGRESS | `IN_PROGRESS` | "In Progress" |
| 4 | ON_HOLD | `ON_HOLD` | "On Hold" |
| 5 | COMPLETED_PENDING_REVIEW | `COMPLETED_PENDING_REVIEW` | "Pending Review" |
| 6 | REOPENED | `REOPENED` | "Reopened" |
| 7 | CLOSED_APPROVED | `CLOSED_APPROVED` | "Completed" |

### Task Card Display

Each card shows:
- Title
- Priority badge (color-coded)
- Size indicator
- Owner name (if viewing as manager)
- Deadline
- KPI bucket name

---

## 6. Drag-and-Drop Implementation

### Technology

Uses `@dnd-kit` library:
- `DndContext` - Wrapper for drag-drop functionality
- `DragOverlay` - Renders preview while dragging
- `useDroppable()` - Makes columns accept drops
- `useSortable()` - Makes cards draggable
- `closestCorners` - Collision detection strategy
- `PointerSensor` - 8px activation distance

### Valid Drop Targets

Not all transitions are allowed via drag-drop. This is because **ON_HOLD** and **REOPENED** require a reason which can't be provided in a drag action.

```
NEW           → [ACCEPTED, IN_PROGRESS]
ACCEPTED      → [IN_PROGRESS]
IN_PROGRESS   → [COMPLETED_PENDING_REVIEW]  ← Note: Cannot drag to ON_HOLD
ON_HOLD       → [IN_PROGRESS]
COMPLETED_PENDING_REVIEW → [CLOSED_APPROVED] ← Note: Cannot drag to REOPENED
REOPENED      → [IN_PROGRESS]
CLOSED_APPROVED → [] (no drops allowed - terminal)
```

### Drag-Drop Flow

1. **Start drag**: `handleDragStart()` sets active task for overlay preview
2. **During drag**: Visual feedback (opacity change, drag overlay)
3. **On drop**: `handleDragEnd()` validates:
   - Is this a valid transition?
   - Does user have permission?
   - Is it a different column?
4. **If valid**:
   - Optimistic update (immediate UI change)
   - API call to `/api/tasks/{id}/transition`
   - On error: refetch all tasks (revert)
5. **Toast notification**: Success or error message

### Transitions Requiring Modal

These cannot be done via drag-drop:

| Transition | Reason |
|------------|--------|
| IN_PROGRESS → ON_HOLD | Requires `onHoldReason` |
| COMPLETED_PENDING_REVIEW → REOPENED | Requires `rejectionReason` |

User must click the task card, open the detail modal, and use the action button there.

---

## 7. State Management

### Frontend State (React)

Located in `src/app/(dashboard)/tasks/page.tsx`:

```typescript
const [tasks, setTasks] = useState<TaskCardData[]>([]);
const [kpiBuckets, setKpiBuckets] = useState<KpiBucket[]>([]);
const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [searchQuery, setSearchQuery] = useState("");
const [showCreateForm, setShowCreateForm] = useState(false);
const [selectedTask, setSelectedTask] = useState<TaskCardData | null>(null);
```

### Data Fetching Strategy

| Action | Strategy |
|--------|----------|
| Initial load | Fetch tasks, KPI buckets, assignable users |
| Search | Debounced (300ms) API call with query param |
| Task creation | POST → add to local state |
| Task transition | Optimistic update → POST → revert on error |
| Task deletion | DELETE → remove from local state |
| Modal close | Refetch all tasks (in case of changes) |

### Optimistic Updates

For drag-drop transitions:

```typescript
// 1. Immediately update UI
setTasks((prev) =>
  prev.map((task) =>
    task.id === taskId ? { ...task, status: newStatus } : task
  )
);

// 2. Call API
const response = await fetch(...);

// 3. On error, refetch to revert
if (!response.ok) {
  await fetchTasks();
}
```

---

## 8. API Endpoints

### GET /api/tasks

Returns tasks filtered by user's role/permissions.

**Query Parameters:**
- `search` - Search in title/description
- `status` - Filter by status
- `priority` - Filter by priority
- `kpiBucketId` - Filter by KPI bucket
- `ownerId` - Filter by owner (admin/dept head only)
- `fromDate`, `toDate` - Date range for deadline
- `sortBy` - createdAt, deadline, priority, status, updatedAt
- `sortOrder` - asc, desc
- `page`, `limit` - Pagination (default: 1, 20)

### POST /api/tasks

Create a new task.

**Required Fields:**
- `title` (3-200 chars)
- `priority` (TaskPriority enum)
- `size` (TaskSize enum)
- `kpiBucketId` (must be assigned to user)
- `estimatedMinutes` (5-480)
- `deadline` (future date)

### POST /api/tasks/[taskId]/transition

Change task status.

**Body:**
```json
{
  "toStatus": "IN_PROGRESS",
  "reason": "optional, required for ON_HOLD/REOPENED"
}
```

### POST /api/tasks/[taskId]/reassign

Reassign task to different user.

**Body:**
```json
{
  "newOwnerId": "user-uuid",
  "newDeadline": "2024-01-15T00:00:00Z" // optional
}
```

### POST /api/tasks/[taskId]/carry-forward

Extend deadline.

**Body:**
```json
{
  "newDeadline": "2024-01-20T00:00:00Z",
  "reason": "Need more time due to dependencies"
}
```

---

## 9. Filtering & Search

### Currently Implemented in UI

- **Search bar**: Searches title and description
- **Filter button**: Exists but not connected

### Available in API but NOT in UI

- Filter by status
- Filter by priority
- Filter by KPI bucket
- Filter by owner
- Filter by date range
- Sorting (by various fields)
- Pagination controls

---

## 10. Additional Features

### Comments (Threaded)

- Any viewer can add comments
- Replies supported (parentId field)
- Task owner gets notified

### Audit Trail

- **TaskStatusHistory**: Every status change logged
- **TaskEditHistory**: Field-level changes logged
- **CarryForwardLog**: Deadline extensions tracked

### Carry Forward

- Owner can extend deadline
- Maximum 10 extensions per task
- Tracks original deadline
- Requires reason

### Reassignment

- Manager+ can reassign tasks
- Can change deadline too
- Notifications sent to old and new owners

### Time Tracking

- `estimatedMinutes`: Set at creation (5-480 min)
- `actualMinutes`: Updated when editing task

### Notifications Sent

| Event | Recipients |
|-------|------------|
| Task submitted for review | Owner's manager |
| Task approved | Task owner |
| Task reopened | Task owner |
| Task reassigned | Old owner, new owner |
| Comment added | Task owner |

---

## 11. Current Pain Points

Based on the architecture analysis, here are potential areas causing confusion:

### 1. Seven Columns May Be Overwhelming

- Users see 7 status columns which might be too many
- ACCEPTED and NEW serve similar purposes
- ON_HOLD and REOPENED are edge cases that clutter the main view

### 2. Inconsistent Drag-Drop Behavior

- Some transitions work via drag (NEW → IN_PROGRESS)
- Some don't work via drag (IN_PROGRESS → ON_HOLD)
- Users don't know which is which until they try

### 3. Role-Based Visibility Complexity

- Different users see different tasks
- No clear visual indicator of "whose tasks am I seeing?"
- Managers juggle their own tasks + team's tasks in one view

### 4. Missing UI for Available Filters

- Powerful filtering exists in API but not exposed in UI
- No way to filter by status, priority, KPI, date range
- No pagination controls visible

### 5. No Visual Distinction for Approval-Needed Tasks

- Tasks in COMPLETED_PENDING_REVIEW need manager action
- No special highlighting or separate queue for these

### 6. KPI Bucket Requirement Not Obvious

- Every task requires a KPI bucket
- Users must have KPI assigned to them first
- Can cause confusion during task creation

---

## Summary

The Kanban board is a full-featured implementation with:
- 7 status columns
- Role-based access control
- Drag-and-drop with validation
- Optimistic updates
- Comprehensive audit trail
- Manager approval workflow

The complexity exists to support organizational hierarchy and proper task lifecycle management, but this complexity may be contributing to user confusion.
