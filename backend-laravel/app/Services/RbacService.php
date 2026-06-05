<?php

namespace App\Services;

use App\Models\Role;
use App\Models\User;
use App\Support\Rbac\Permissions;
use App\Support\Rbac\Roles;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Symfony\Component\HttpKernel\Exception\HttpException;

class RbacService
{
    public function roles(string $tenantId, bool $canManageSystem, array $includes = []): Collection
    {
        $query = Role::query()->visibleToTenant($tenantId);

        $this->applySystemOnlyRoleVisibility($query, $canManageSystem);

        return $query
            ->with(array_intersect(['permissions'], $includes))
            ->orderBy('tenant_id')
            ->orderBy('name')
            ->get();
    }

    public function findRole(string $tenantId, string $roleId, bool $canManageSystem, array $includes = []): ?Role
    {
        $query = Role::query()->visibleToTenant($tenantId);

        $this->applySystemOnlyRoleVisibility($query, $canManageSystem);

        return $query
            ->with(array_intersect(['permissions'], $includes))
            ->find($roleId);
    }

    public function permissions(bool $canManageSystem, array $includes = []): Collection
    {
        $query = Permission::query()->orderBy('name');

        $this->applySystemOnlyPermissionVisibility($query, $canManageSystem);
        $query->with($this->permissionRelations($canManageSystem, $includes));

        return $query->get();
    }

    public function permissionWithRelations(Permission $permission, bool $canManageSystem, array $includes = []): ?Permission
    {
        if (! $canManageSystem && in_array($permission->name, Permissions::systemOnly(), true)) {
            return null;
        }

        return $permission->load($this->permissionRelations($canManageSystem, $includes));
    }

    public function createRole(string $tenantId, array $data): Role
    {
        $data['tenant_id'] = $this->tenantIdFromPayload($tenantId, $data, $tenantId);

        return DB::transaction(function () use ($data): Role {
            $this->ensureUniqueRole($data['tenant_id'], $data['name'], $data['guard_name'] ?? 'web');

            $role = Role::query()->create([
                'tenant_id' => $data['tenant_id'],
                'name' => $data['name'],
                'guard_name' => $data['guard_name'] ?? 'web',
            ]);

            $this->syncRolePermissions($role, $data['permissions'] ?? []);
            $this->forgetCache();

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

            $role->fill([
                'tenant_id' => $nextTenantId,
                'name' => $nextName,
                'guard_name' => $nextGuardName,
            ])->save();

            if (array_key_exists('permissions', $data)) {
                $this->syncRolePermissions($role, $data['permissions']);
            }

            $this->forgetCache();

            return $role->refresh();
        });
    }

    public function deleteRole(Role $role): void
    {
        DB::transaction(function () use ($role): void {
            if ($role->name === Roles::protectedAdmin()) {
                throw new HttpException(422, 'The Office Admin role cannot be deleted.');
            }

            $role->delete();
            $this->forgetCache();
        });
    }

    public function createPermission(array $data): Permission
    {
        return DB::transaction(function () use ($data): Permission {
            $permission = Permission::query()->create([
                'name' => $data['name'],
                'guard_name' => $data['guard_name'] ?? 'web',
            ]);

            $this->forgetCache();

            return $permission;
        });
    }

    public function updatePermission(Permission $permission, array $data): Permission
    {
        return DB::transaction(function () use ($permission, $data): Permission {
            if (in_array($permission->name, Permissions::protected(), true) && isset($data['name']) && $data['name'] !== $permission->name) {
                throw new HttpException(422, 'Protected administrative permissions cannot be renamed.');
            }

            $permission->fill([
                'name' => $data['name'] ?? $permission->name,
                'guard_name' => $data['guard_name'] ?? $permission->guard_name,
            ])->save();

            $this->forgetCache();

            return $permission;
        });
    }

    public function deletePermission(Permission $permission): void
    {
        DB::transaction(function () use ($permission): void {
            if (in_array($permission->name, Permissions::protected(), true)) {
                throw new HttpException(422, 'Protected administrative permissions cannot be deleted.');
            }

            if ($permission->roles()->where('name', Roles::protectedAdmin())->exists()) {
                throw new HttpException(422, 'Permissions assigned to Office Admin cannot be deleted.');
            }

            $permission->delete();
            $this->forgetCache();
        });
    }

    public function syncUserRoles(string $tenantId, User $user, array $roleNames): User
    {
        return DB::transaction(function () use ($user, $roleNames, $tenantId): User {
            $this->ensureUserBelongsToTenant($tenantId, $user);
            $this->ensureOfficeAdminCanBeRemoved($user, $roleNames);

            $roles = $this->rolesVisibleToTenant($tenantId, $roleNames);

            $user->syncRoles($roles);
            $user->forceFill(['role' => $roleNames[0] ?? Roles::SIMPLE_AGENT])->save();
            $this->forgetCache();

            return $user->load('roles.permissions', 'permissions');
        });
    }

    public function syncUserPermissions(string $tenantId, User $user, array $permissionNames): User
    {
        return DB::transaction(function () use ($user, $permissionNames, $tenantId): User {
            $this->ensureUserBelongsToTenant($tenantId, $user);
            $user->syncPermissions($permissionNames);
            $this->forgetCache();

            return $user->load('roles.permissions', 'permissions');
        });
    }

    private function syncRolePermissions(Role $role, array $permissionNames): void
    {
        if ($role->name === Roles::protectedAdmin()) {
            $permissionNames = array_values(array_unique(array_merge($permissionNames, Permissions::tenantAdminProtected())));
        }

        $role->syncPermissions($permissionNames);
    }

    private function rolesVisibleToTenant(string $tenantId, array $roleNames): array
    {
        $roles = Role::query()
            ->visibleToTenant($tenantId)
            ->whereIn('name', $roleNames)
            ->get();

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
     * @param  Builder<Role>  $query
     */
    private function applySystemOnlyRoleVisibility(Builder|BelongsToMany $query, bool $canManageSystem): void
    {
        if ($canManageSystem) {
            return;
        }

        $query->whereDoesntHave('permissions', function (Builder $query): void {
            $query->whereIn('name', Permissions::systemOnly());
        });
    }

    /**
     * @param  Builder<Permission>  $query
     */
    private function applySystemOnlyPermissionVisibility(Builder $query, bool $canManageSystem): void
    {
        if (! $canManageSystem) {
            $query->whereNotIn('name', Permissions::systemOnly());
        }
    }

    private function permissionRelations(bool $canManageSystem, array $includes): array
    {
        if (! in_array('roles', $includes, true)) {
            return [];
        }

        return [
            'roles' => function (BelongsToMany $query) use ($canManageSystem): void {
                $this->applySystemOnlyRoleVisibility($query, $canManageSystem);
                $query->orderBy('tenant_id')->orderBy('name');
            },
        ];
    }

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
        $exists = Role::query()
            ->where('name', $name)
            ->where('guard_name', $guardName)
            ->when($tenantId === null, fn ($query) => $query, function ($query) use ($tenantId): void {
                $query->where(function ($query) use ($tenantId): void {
                    $query->whereNull('tenant_id')->orWhere('tenant_id', $tenantId);
                });
            })
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists();

        if ($exists) {
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

        if (User::role(Roles::protectedAdmin())->count() <= 1) {
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

    private function forgetCache(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
