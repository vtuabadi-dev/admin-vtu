# ADR-0011: Multi-Role & Secondary Access Assignment for User Management

## Status
APPROVED (Product Owner & Architecture Review)

## Date
2026-09-02

## Context
In operational workflows for PT VAUZA TAMMA ABADI, operational managers often fulfill dual or multiple operational responsibilities. For example, a primary "Admin Operasional" or "Admin Dokumen" may also require secondary access privileges to "Admin Pembayaran" or "Admin Badal Umroh & Wakaf".

Previously, users could only be assigned a single scalar `role: OperationalRole`. This limited flexibility when an employee needed to handle tasks across multiple functional areas without elevating them to full `super_admin`.

## Decision
1. **Database Schema**:
   - Extend the `User` model in `prisma/schema.prisma` with `secondaryRoles String[] @default([])`.
   - `role` remains the **Primary Role (Role Utama)**.
   - `secondaryRoles` stores an array of **Secondary Roles (Akses Tambahan)** assigned to the user.

2. **User Invitation & Editing Workflow**:
   - In the **Tambah Admin Baru** & **Edit User** modal UI (`/admin/users`), Super Admins can select 1 Primary Role via dropdown and select 1 or more Secondary Roles via interactive checkboxes.

3. **Role & Permission Matrix Union**:
   - Update permission check functions in `src/shared/lib/rbac-utils.ts` and `useSession` to evaluate permission capability as the union of `primaryRole` and all `secondaryRoles`. If any assigned role grants a permission action, access is granted.

4. **UI Representation**:
   - On the `/admin/users` management table, display both the Primary Role badge and Secondary Role badges so administrators have full visibility over multi-role assignments.

## Consequences
- Flexible role delegation without over-privileging users to `super_admin`.
- Backward-compatible: existing users default to an empty `secondaryRoles` array (`[]`).
- Fully compliant with EEOS Baseline v1.2 ADR trigger policy for authorization & schema changes.
