# Permission System

Lifely uses Spatie Laravel Permission on the backend and a matching React permission model for route and UI visibility.

## Source Of Truth

Backend authorization is the source of truth. React permissions only hide or show navigation, routes, buttons, cards, icons, and other UI affordances.

## Backend Files

- Permission constants: `backend-laravel/app/Support/Rbac/Permissions.php`
- Role defaults: `backend-laravel/app/Support/Rbac/Roles.php`
- Seeder: `backend-laravel/database/seeders/RbacSeeder.php`
- Policies: `backend-laravel/app/Policies`
- Gates: `backend-laravel/app/Providers/AppServiceProvider.php`
- User access API: `UserAccessController`

Do not hardcode permission strings in controllers, requests, policies, or services. Add constants to `Permissions` first, then use the constant everywhere.

## Roles

Default roles include:

- System Admin
- Office Admin
- Master
- Sales
- Property Manager
- Senior Agent
- Simple Agent
- Marketing Coordinator
- Transaction Coordinator

`System Admin` receives all permissions, including `system.bypass` and system-reference management. `Office Admin` and `Master` receive tenant-admin permissions, excluding system-only permissions.

## System Bypass

`Permissions::SYSTEM_BYPASS` bypasses normal authorization checks through `Gate::before` and `User::can()`. Prefer permission checks over role-name checks for consistency.

## Protected Rules

- Protected admin access cannot be broken.
- Office Admin role deletion is protected.
- The last Office Admin cannot be removed.
- Protected/admin permissions cannot be deleted when that would break RBAC administration.
- System references require the system reference permission, not a direct role-name check.

## Frontend Files

- Permission constants: `frontend/src/rbac/permissions.ts`
- Navigation and route permission matrix: `frontend/src/rbac/accessMatrix.ts`
- Authorization hook: `frontend/src/rbac/useAuthorization.ts`
- Route guard: `frontend/src/components/rbac/PermissionRoute.tsx`
- UI gate: `frontend/src/components/rbac/PermissionGate.tsx`

When adding a backend permission, mirror it in `frontend/src/rbac/permissions.ts` only if the frontend needs to hide or show UI for it.

## API Endpoints

RBAC endpoints are under `/api/v1` and require Sanctum access tokens:

- `GET /me/permissions`
- `apiResource /roles`
- `apiResource /permissions`
- `PUT /users/{user}/roles`
- `PUT /users/{user}/permissions`

Role and permission mutations must clear Spatie permission cache.

## Testing

Feature tests should cover authorized and unauthorized behavior for sensitive endpoints. Prefer direct permission assignment in tests over relying on a broad role unless the test is specifically about role seeding.

`User::factory()` sets the user's `role` column only. Use `withAssignedRole()` when factory-created users must also receive a Spatie role assignment, such as seeded demo users.
