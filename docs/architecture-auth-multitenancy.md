# Authentication & Multi-Tenancy Architecture

> **Source of Truth Document**
> Last Updated: January 2026
> Status: Production-ready for single-tenant, future-proofed for multi-tenant and Clerk migration

---

## Table of Contents

1. [Current State](#current-state)
2. [Database Schema](#database-schema)
3. [Authentication Abstraction Layer](#authentication-abstraction-layer)
4. [Migration to Clerk](#migration-to-clerk)
5. [Migration to Multi-Tenancy](#migration-to-multi-tenancy)
6. [File Reference](#file-reference)

---

## Current State

### What's Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| NextAuth with Credentials | ✅ Active | JWT-based sessions, 8-hour expiry |
| Password Authentication | ✅ Active | bcrypt with cost factor 12 |
| Force Password Change | ✅ Active | `mustChangePassword` flag |
| Auth Abstraction Hook | ✅ Active | `useAuth()` wraps NextAuth |
| Multi-tenant DB Fields | ✅ Ready | `organizationId` field exists but unused |
| Clerk Integration | ⏳ Not Started | Architecture supports migration |

### Authentication Flow (Current)

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Login     │────▶│   NextAuth   │────▶│   Prisma    │
│   Page      │     │  Credentials │     │   User DB   │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  JWT Token   │
                    │  (8 hours)   │
                    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   useAuth()  │◀──── All components use this
                    │     Hook     │
                    └──────────────┘
```

---

## Database Schema

### User Model (Prisma)

```prisma
model User {
  id           String  @id @default(cuid())
  email        String  @unique
  passwordHash String
  firstName    String
  lastName     String
  role         Role    @default(EMPLOYEE)
  avatarUrl    String?
  isActive     Boolean @default(true)

  // ══════════════════════════════════════════════════════
  // MULTI-TENANT SUPPORT (Future)
  // ══════════════════════════════════════════════════════
  organizationId String? @db.VarChar(50)  // NULL for single-tenant

  // ══════════════════════════════════════════════════════
  // PASSWORD MANAGEMENT
  // ══════════════════════════════════════════════════════
  mustChangePassword Boolean   @default(false)  // Force password change on login
  passwordChangedAt  DateTime?                   // Last password change timestamp

  // ... other fields ...

  @@index([organizationId])  // Index ready for multi-tenant queries
}
```

### Key Fields Explained

| Field | Type | Purpose | Current Usage |
|-------|------|---------|---------------|
| `organizationId` | `String?` | Links user to an organization/tenant | Always `NULL` (single-tenant) |
| `mustChangePassword` | `Boolean` | Forces password change on next login | Set `true` when admin resets password |
| `passwordChangedAt` | `DateTime?` | Tracks when user last changed password | Set when user changes own password |

---

## Authentication Abstraction Layer

### The `useAuth()` Hook

**File:** `src/hooks/use-auth.ts`

This hook is the **single point of contact** for authentication in all React components. It wraps NextAuth today but is designed to be swapped for Clerk with minimal changes.

```typescript
// src/hooks/use-auth.ts

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  managerId: string | null;
  departmentId: string | null;
  mustChangePassword: boolean;
}

export interface AuthSession {
  user: AuthUser;
  expires: string;
}

export function useAuth(): {
  session: AuthSession | null;
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManagerOrAbove: boolean;
  isDepartmentHeadOrAbove: boolean;
  mustChangePassword: boolean;
  update: () => Promise<void>;
}
```

### Usage Rules

**DO:**
```typescript
// ✅ Correct - Use the abstraction
import { useAuth } from "@/hooks/use-auth";

function MyComponent() {
  const { user, isAdmin, isLoading } = useAuth();
  // ...
}
```

**DON'T:**
```typescript
// ❌ Incorrect - Direct NextAuth usage in components
import { useSession } from "next-auth/react";

function MyComponent() {
  const { data: session } = useSession();
  // ...
}
```

### Where Direct NextAuth Is Allowed

Direct NextAuth imports are only allowed in:

1. `src/lib/auth-options.ts` - NextAuth configuration
2. `src/hooks/use-auth.ts` - The abstraction layer itself
3. `src/app/api/auth/[...nextauth]/route.ts` - NextAuth route handler
4. API routes using `getServerSession()` - Server-side auth checks

---

## Migration to Clerk

### Prerequisites

1. Create Clerk account and application
2. Install Clerk SDK: `npm install @clerk/nextjs`
3. Configure environment variables

### Migration Steps

#### Step 1: Update Environment Variables

```env
# Remove NextAuth variables
- NEXTAUTH_SECRET=...
- NEXTAUTH_URL=...

# Add Clerk variables
+ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
+ CLERK_SECRET_KEY=sk_...
+ NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
+ NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
+ NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
+ NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

#### Step 2: Update `useAuth()` Hook

Replace the NextAuth implementation with Clerk:

```typescript
// src/hooks/use-auth.ts - AFTER CLERK MIGRATION

"use client";

import { useUser, useAuth as useClerkAuth } from "@clerk/nextjs";
import { Role } from "@prisma/client";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  managerId: string | null;
  departmentId: string | null;
  mustChangePassword: boolean;
}

export interface AuthSession {
  user: AuthUser;
  expires: string;
}

export function useAuth() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerkAuth();

  // Map Clerk user to our AuthUser interface
  // Role and other custom fields come from Clerk publicMetadata or your DB
  const user: AuthUser | null = clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress || "",
    firstName: clerkUser.firstName || "",
    lastName: clerkUser.lastName || "",
    role: (clerkUser.publicMetadata?.role as Role) || "EMPLOYEE",
    managerId: (clerkUser.publicMetadata?.managerId as string) || null,
    departmentId: (clerkUser.publicMetadata?.departmentId as string) || null,
    mustChangePassword: false, // Clerk handles password management
  } : null;

  return {
    session: user ? { user, expires: "" } : null,
    user,
    isLoading: !isLoaded,
    isAuthenticated: isSignedIn ?? false,
    isAdmin: user?.role === "ADMIN",
    isManagerOrAbove: ["MANAGER", "DEPARTMENT_HEAD", "ADMIN"].includes(user?.role || ""),
    isDepartmentHeadOrAbove: ["DEPARTMENT_HEAD", "ADMIN"].includes(user?.role || ""),
    mustChangePassword: false,
    update: async () => {
      // Clerk handles session updates automatically
    },
    signOut,
  };
}
```

#### Step 3: Update Middleware

```typescript
// src/middleware.ts - AFTER CLERK MIGRATION

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/login(.*)", "/api/webhooks(.*)"]);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

#### Step 4: Update API Routes

Replace `getServerSession()` with Clerk's `auth()`:

```typescript
// Before (NextAuth)
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

const session = await getServerSession(authOptions);
if (!session?.user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// After (Clerk)
import { auth } from "@clerk/nextjs/server";

const { userId } = auth();
if (!userId) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

#### Step 5: Remove NextAuth Files

After migration is complete and tested:

```bash
# Files to remove
rm src/lib/auth-options.ts
rm src/app/api/auth/[...nextauth]/route.ts
rm src/types/next-auth.d.ts

# Dependencies to remove
npm uninstall next-auth
```

#### Step 6: User Data Sync

Clerk manages user authentication, but your database still needs user records for:
- Role assignments
- Manager relationships
- Department assignments
- Task ownership

Set up a Clerk webhook to sync user data:

```typescript
// src/app/api/webhooks/clerk/route.ts

import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const payload = await req.json();
  const headersList = headers();

  // Verify webhook signature
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  const evt = wh.verify(JSON.stringify(payload), {
    "svix-id": headersList.get("svix-id")!,
    "svix-timestamp": headersList.get("svix-timestamp")!,
    "svix-signature": headersList.get("svix-signature")!,
  }) as WebhookEvent;

  if (evt.type === "user.created") {
    await prisma.user.create({
      data: {
        id: evt.data.id,
        email: evt.data.email_addresses[0].email_address,
        firstName: evt.data.first_name || "",
        lastName: evt.data.last_name || "",
        passwordHash: "", // Not used with Clerk
        role: "EMPLOYEE",
      },
    });
  }

  return new Response("OK", { status: 200 });
}
```

---

## Migration to Multi-Tenancy

### Overview

Multi-tenancy allows multiple organizations to use the same TaskFlow instance with complete data isolation.

### Database Changes Required

#### 1. Create Organization Model

```prisma
model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique  // e.g., "acme-corp"
  plan      String   @default("free")  // free, pro, enterprise

  users     User[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([slug])
}
```

#### 2. Update User Model

```prisma
model User {
  // ... existing fields ...

  organizationId String?       // Make required: String
  organization   Organization? @relation(fields: [organizationId], references: [id])

  // ... rest of model ...
}
```

#### 3. Add organizationId to All Tenant-Scoped Models

Models that need `organizationId`:
- `Department`
- `Task`
- `KpiBucket`
- `Announcement`
- `Notification`

```prisma
model Task {
  // ... existing fields ...

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  @@index([organizationId])
  @@index([organizationId, ownerId])
  @@index([organizationId, status])
}
```

### Code Changes Required

#### 1. Update Auth Hook

```typescript
// src/hooks/use-auth.ts

export interface AuthUser {
  // ... existing fields ...
  organizationId: string;
  organizationSlug: string;
}
```

#### 2. Create Organization Context

```typescript
// src/contexts/organization-context.tsx

"use client";

import { createContext, useContext } from "react";
import { useAuth } from "@/hooks/use-auth";

interface OrganizationContextValue {
  organizationId: string;
  organizationSlug: string;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user?.organizationId) {
    return null; // Or redirect to org selection
  }

  return (
    <OrganizationContext.Provider
      value={{
        organizationId: user.organizationId,
        organizationSlug: user.organizationSlug,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization must be used within OrganizationProvider");
  }
  return context;
}
```

#### 3. Update All API Routes

Every API route that queries tenant data must filter by `organizationId`:

```typescript
// Before (single-tenant)
const tasks = await prisma.task.findMany({
  where: { ownerId: session.user.id },
});

// After (multi-tenant)
const tasks = await prisma.task.findMany({
  where: {
    ownerId: session.user.id,
    organizationId: session.user.organizationId, // ADD THIS
  },
});
```

#### 4. Create Helper Functions

```typescript
// src/lib/utils/tenant.ts

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function getOrganizationId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    throw new Error("No organization context");
  }
  return session.user.organizationId;
}

export function withOrgFilter<T extends Record<string, unknown>>(
  where: T,
  organizationId: string
): T & { organizationId: string } {
  return { ...where, organizationId };
}
```

### URL Structure Options

**Option A: Subdomain-based (Recommended for SaaS)**
```
https://acme.taskflow.com/dashboard
https://widgets.taskflow.com/dashboard
```

**Option B: Path-based**
```
https://taskflow.com/org/acme/dashboard
https://taskflow.com/org/widgets/dashboard
```

**Option C: Single domain with org context in session**
```
https://taskflow.com/dashboard  (org determined by logged-in user)
```

---

## File Reference

### Authentication Files

| File | Purpose | Modify for Clerk? |
|------|---------|-------------------|
| `src/lib/auth-options.ts` | NextAuth configuration | DELETE after Clerk migration |
| `src/hooks/use-auth.ts` | Auth abstraction hook | UPDATE implementation |
| `src/middleware.ts` | Route protection | UPDATE to use Clerk middleware |
| `src/types/next-auth.d.ts` | TypeScript types for NextAuth | DELETE after Clerk migration |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth API route | DELETE after Clerk migration |

### User Management Files

| File | Purpose |
|------|---------|
| `src/app/api/admin/users/route.ts` | List/Create users |
| `src/app/api/admin/users/[id]/route.ts` | Get/Update user |
| `src/app/api/admin/users/[id]/reset-password/route.ts` | Reset user password |
| `src/app/api/admin/users/potential-managers/route.ts` | Get users eligible to be managers |
| `src/app/api/admin/departments/route.ts` | Get departments |
| `src/app/api/users/me/route.ts` | Current user profile & password change |
| `src/components/user-management/users-panel.tsx` | User management UI |
| `src/components/user-management/user-form-modal.tsx` | Create/Edit user modal |
| `src/components/user-management/reset-password-modal.tsx` | Reset password modal |
| `src/app/(dashboard)/settings/users/page.tsx` | User management page |
| `src/lib/validations/user-management.ts` | Zod validation schemas |

### Database Schema

| Field | Location | Purpose |
|-------|----------|---------|
| `User.organizationId` | `prisma/schema.prisma` | Multi-tenant org link |
| `User.mustChangePassword` | `prisma/schema.prisma` | Force password change flag |
| `User.passwordChangedAt` | `prisma/schema.prisma` | Password change timestamp |

---

## Checklist for Migrations

### Clerk Migration Checklist

- [ ] Create Clerk application
- [ ] Install `@clerk/nextjs`
- [ ] Set environment variables
- [ ] Update `src/hooks/use-auth.ts`
- [ ] Update `src/middleware.ts`
- [ ] Update all API routes to use `auth()`
- [ ] Set up Clerk webhook for user sync
- [ ] Update login/logout UI components
- [ ] Test all authentication flows
- [ ] Remove NextAuth dependencies and files
- [ ] Update documentation

### Multi-Tenancy Migration Checklist

- [ ] Create `Organization` model
- [ ] Make `User.organizationId` required
- [ ] Add `organizationId` to all tenant-scoped models
- [ ] Create database migration
- [ ] Create `OrganizationProvider` context
- [ ] Update `useAuth()` to include org info
- [ ] Update all API routes with org filter
- [ ] Update all Prisma queries with org filter
- [ ] Implement org selection/switching UI
- [ ] Set up org-based URL routing (if needed)
- [ ] Test data isolation between orgs
- [ ] Update documentation

---

## Security Considerations

### Current Security Measures

1. **Password Hashing:** bcrypt with cost factor 12
2. **Session Management:** JWT with 8-hour expiry
3. **Role-Based Access:** Admin-only routes protected
4. **Soft Delete:** Users are deactivated, not deleted
5. **Self-Protection:** Admins cannot deactivate self or change own role

### Multi-Tenancy Security (Future)

1. **Data Isolation:** All queries MUST include `organizationId`
2. **Cross-Tenant Prevention:** Middleware validates org membership
3. **Admin Scoping:** Org admins only manage their org's users
4. **Audit Logging:** Track cross-org access attempts

---

## Questions & Support

For questions about this architecture:
1. Check this document first
2. Review the referenced source files
3. Consult the testing guide: `docs/testing.md`
