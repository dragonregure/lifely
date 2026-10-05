<?php

namespace App\Services;

use App\Contracts\RbacRepositoryInterface;
use App\Contracts\RbacServiceInterface;
use App\Models\Role;
use App\Models\User;
use App\Support\Rbac\Permissions;
use App\Support\Rbac\Roles;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;
use Symfony\Component\HttpKernel\Exception\HttpException;

class RbacService implements RbacServiceInterface
{
    public function __construct(private readonly RbacRepositoryInterface $rbac)
    {
    }

    public function roles(string $tenantId, bool $canManageSystem, array $includes = []): Collection
    {
        return $this->rbac->roles($tenantId, $canManageSystem, $includes);
    }

    public function findRole(string $tenantId, string $roleId, bool $canManageSystem, array $includes = []): ?Role
    {
        return $this->rbac->findRole($tenantId, $roleId, $canManageSystem, $includes);
    }

    public function permissions(bool $canManageSystem, array $includes = []): Collection
    {
        return $this->rbac->permissions($canManageSystem, $includes);
    }

    public function permissionWithRelations(Permission $permission, bool $canManageSystem, array $includes = []): ?Permission
    {
        if (! $canManageSystem && in_array($permission->name, Permissions::systemOnly(), true)) {
            return null;
        }

        return $this->rbac->permissionWithRelations($permission, $canManageSystem, $includes);
    }

    public function createRole(string $tenantId, array $data): Role
    {
        $data['tenant_id'] = $this->tenantIdFromPayload($tenantId, $data, $tenantId);

        return DB::transaction(function () use ($data): Role {
            $this->ensureUniqueRole($data['tenant_id'], $data['name'], $data['guard_name'] ?? 'web');

            $role = $this->rbac->createRole([
                'tenant_id' => $data['tenant_id'],
                'name' => $data['name'],
                'guard_name' => $data['guard_name'] ?? 'web',
            ]);

            $this->syncRolePermissions($role, $data['permissions'] ?? []);
            $this->rbac->forgetCache();

            return $role;
        });
    }

    public function updateRole(string $tenantId, Role $role, array $data): Role
    {
        return DB::transaction(function () use ($role, $data, $tenantId): Role {
            if ($role->name === Roles::protectedAdmin() && isset($data['name']) && $data['name'] !== $role->name) {
                throw new HttpException(422, 'The Office Admin role name cannot be changed.');
            }

            if (array_key_exists('tenant_id', $data)) {
                $data['tenant_id'] = $this->tenantIdFromPayload($tenantId, $data, $role->tenant_id);
            }

            $nextTenantId = $data['tenant_id'] ?? $role->tenant_id;
            $nextName = $data['name'] ?? $role->name;
            $nextGuardName = $data['guard_name'] ?? $role->guard_name;

            $this->ensureUniqueRole($nextTenantId, $nextName, $nextGuardName, $role->id);

            $role = $this->rbac->updateRole($role, [
                'tenant_id' => $nextTenantId,
                'name' => $nextName,
                'guard_name' => $nextGuardName,
            ]);

            if (array_key_exists('permissions', $data)) {
                $this->syncRolePermissions($role, $data['permissions']);
            }

            $this->rbac->forgetCache();

            return $role;
        });
    }

    public function deleteRole(Role $role): void
    {
        DB::transaction(function () use ($role): void {
            if ($role->name === Roles::protectedAdmin()) {
                throw new HttpException(422, 'The Office Admin role cannot be deleted.');
            }

            $this->rbac->deleteRole($role);
            $this->rbac->forgetCache();
        });
    }

    public function createPermission(array $data): Permission
    {
        return DB::transaction(function () use ($data): Permission {
            $permission = $this->rbac->createPermission([
                'name' => $data['name'],
                'guard_name' => $data['guard_name'] ?? 'web',
            ]);

            $this->rbac->forgetCache();

            return $permission;
        });
    }

    public function updatePermission(Permission $permission, array $data): Permission
    {
        return DB::transaction(function () use ($permission, $data): Permission {
            if (in_array($permission->name, Permissions::protected(), true) && isset($data['name']) && $data['name'] !== $permission->name) {
                throw new HttpException(422, 'Protected administrative permissions cannot be renamed.');
            }

            $permission = $this->rbac->updatePermission($permission, [
                'name' => $data['name'] ?? $permission->name,
                'guard_name' => $data['guard_name'] ?? $permission->guard_name,
            ]);

            $this->rbac->forgetCache();

            return $permission;
        });
    }

    public function deletePermission(Permission $permission): void
    {
        DB::transaction(function () use ($permission): void {
            if (in_array($permission->name, Permissions::protected(), true)) {
                throw new HttpException(422, 'Protected administrative permissions cannot be deleted.');
            }

            if ($this->rbac->permissionIsAssignedToRole($permission, Roles::protectedAdmin())) {
                throw new HttpException(422, 'Permissions assigned to Office Admin cannot be deleted.');
            }

            $this->rbac->deletePermission($permission);
            $this->rbac->forgetCache();
        });
    }

    public function syncUserRoles(string $tenantId, User $user, array $roleNames): User
    {
        return DB::transaction(function () use ($user, $roleNames, $tenantId): User {
            $this->ensureUserBelongsToTenant($tenantId, $user);
            $this->ensureOfficeAdminCanBeRemoved($user, $roleNames);

            $roles = $this->rolesVisibleToTenant($tenantId, $roleNames);

            $this->rbac->syncUserRoles($user, $roles);
            $this->rbac->saveUserRoleLabel($user, $roleNames[0] ?? Roles::SIMPLE_AGENT);
            $this->rbac->forgetCache();

            return $this->rbac->loadUserAccess($user);
        });
    }

    public function syncUserPermissions(string $tenantId, User $user, array $permissionNames): User
    {
        return DB::transaction(function () use ($user, $permissionNames, $tenantId): User {
            $this->ensureUserBelongsToTenant($tenantId, $user);
            $this->rbac->syncUserPermissions($user, $permissionNames);
            $this->rbac->forgetCache();

            return $this->rbac->loadUserAccess($user);
        });
    }

    public function ensureRoleExists(string $name, string $guardName = 'web', ?string $tenantId = null): Role
    {
        if (! $this->rbac->roleExists($tenantId, $name, $guardName)) {
            return $this->rbac->createRole([
                'tenant_id' => $tenantId,
                'name' => $name,
                'guard_name' => $guardName,
            ]);
        }

        return $this->rbac->findOrCreateRole($name, $guardName);
    }

    private function syncRolePermissions(Role $role, array $permissionNames): void
    {
        if ($role->name === Roles::protectedAdmin()) {
            $permissionNames = array_values(array_unique(array_merge($permissionNames, Permissions::tenantAdminProtected())));
        }

        $this->rbac->syncRolePermissions($role, $permissionNames);
    }

    private function rolesVisibleToTenant(string $tenantId, array $roleNames): array
    {
        $roles = $this->rbac->rolesVisibleToTenant($tenantId, $roleNames);

        $foundNames = $roles->pluck('name')->all();
        $missing = array_values(array_diff($roleNames, $foundNames));

        if ($missing !== []) {
            throw ValidationException::withMessages([
                'roles' => ['One or more selected roles are not available to this tenant.'],
            ]);
        }

        return $roles->all();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function tenantIdFromPayload(string $currentTenantId, array $data, ?string $defaultTenantId): ?string
    {
        $tenantId = array_key_exists('tenant_id', $data) ? $data['tenant_id'] : $defaultTenantId;

        if ($tenantId !== null && $tenantId !== $currentTenantId) {
            throw new HttpException(403, 'Role tenant does not match the current tenant context.');
        }

        return $tenantId;
    }

    private function ensureUniqueRole(?string $tenantId, string $name, string $guardName, ?int $ignoreId = null): void
    {
        if ($this->rbac->roleExists($tenantId, $name, $guardName, $ignoreId)) {
            throw ValidationException::withMessages([
                'name' => ['A role with this name already exists for this role scope.'],
            ]);
        }
    }

    private function ensureOfficeAdminCanBeRemoved(User $user, array $newRoleNames): void
    {
        if (! $user->hasRole(Roles::protectedAdmin()) || in_array(Roles::protectedAdmin(), $newRoleNames, true)) {
            return;
        }

        if ($this->rbac->protectedAdminUserCount() <= 1) {
            throw ValidationException::withMessages([
                'roles' => ['At least one Office Admin must remain active.'],
            ]);
        }
    }

    private function ensureUserBelongsToTenant(string $tenantId, User $user): void
    {
        if ($user->tenant_id !== $tenantId) {
            throw new HttpException(403, 'User does not belong to the current tenant context.');
        }
    }
}
