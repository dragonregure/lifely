<?php

namespace App\Repositories;

use App\Contracts\RbacRepositoryInterface;
use App\Models\Role;
use App\Models\User;
use App\Support\Rbac\Permissions;
use App\Support\Rbac\Roles;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Collection;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class RbacRepository implements RbacRepositoryInterface
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

    public function permissionWithRelations(Permission $permission, bool $canManageSystem, array $includes = []): Permission
    {
        return $permission->load($this->permissionRelations($canManageSystem, $includes));
    }

    public function roleExists(?string $tenantId, string $name, string $guardName, ?int $ignoreId = null): bool
    {
        return Role::query()
            ->where('name', $name)
            ->where('guard_name', $guardName)
            ->when($tenantId === null, fn ($query) => $query, function ($query) use ($tenantId): void {
                $query->where(function ($query) use ($tenantId): void {
                    $query->whereNull('tenant_id')->orWhere('tenant_id', $tenantId);
                });
            })
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists();
    }

    public function findOrCreateRole(string $name, string $guardName): Role
    {
        /** @var Role $role */
        $role = Role::findOrCreate($name, $guardName);

        return $role;
    }

    public function createRole(array $attributes): Role
    {
        return Role::query()->create($attributes);
    }

    public function updateRole(Role $role, array $attributes): Role
    {
        $role->fill($attributes)->save();

        return $role->refresh();
    }

    public function deleteRole(Role $role): void
    {
        $role->delete();
    }

    public function createPermission(array $attributes): Permission
    {
        return Permission::query()->create($attributes);
    }

    public function updatePermission(Permission $permission, array $attributes): Permission
    {
        $permission->fill($attributes)->save();

        return $permission;
    }

    public function deletePermission(Permission $permission): void
    {
        $permission->delete();
    }

    public function permissionIsAssignedToRole(Permission $permission, string $roleName): bool
    {
        return $permission->roles()->where('name', $roleName)->exists();
    }

    public function rolesVisibleToTenant(string $tenantId, array $roleNames): Collection
    {
        return Role::query()
            ->visibleToTenant($tenantId)
            ->whereIn('name', $roleNames)
            ->get();
    }

    public function syncRolePermissions(Role $role, array $permissionNames): void
    {
        $role->syncPermissions($permissionNames);
    }

    public function syncUserRoles(User $user, array $roles): void
    {
        $user->syncRoles($roles);
    }

    public function syncUserPermissions(User $user, array $permissionNames): void
    {
        $user->syncPermissions($permissionNames);
    }

    public function saveUserRoleLabel(User $user, string $role): void
    {
        $user->forceFill(['role' => $role])->save();
    }

    public function loadUserAccess(User $user): User
    {
        return $user->load('roles.permissions', 'permissions');
    }

    public function protectedAdminUserCount(): int
    {
        return User::role(Roles::protectedAdmin())->count();
    }

    public function forgetCache(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

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
}
