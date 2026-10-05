<?php

namespace App\Contracts;

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Collection;
use Spatie\Permission\Models\Permission;

interface RbacRepositoryInterface
{
    public function roles(string $tenantId, bool $canManageSystem, array $includes = []): Collection;

    public function findRole(string $tenantId, string $roleId, bool $canManageSystem, array $includes = []): ?Role;

    public function permissions(bool $canManageSystem, array $includes = []): Collection;

    public function permissionWithRelations(Permission $permission, bool $canManageSystem, array $includes = []): Permission;

    public function roleExists(?string $tenantId, string $name, string $guardName, ?int $ignoreId = null): bool;

    public function findOrCreateRole(string $name, string $guardName): Role;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createRole(array $attributes): Role;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateRole(Role $role, array $attributes): Role;

    public function deleteRole(Role $role): void;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function createPermission(array $attributes): Permission;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updatePermission(Permission $permission, array $attributes): Permission;

    public function deletePermission(Permission $permission): void;

    public function permissionIsAssignedToRole(Permission $permission, string $roleName): bool;

    /**
     * @param  array<int, string>  $roleNames
     */
    public function rolesVisibleToTenant(string $tenantId, array $roleNames): Collection;

    /**
     * @param  array<int, string>  $permissionNames
     */
    public function syncRolePermissions(Role $role, array $permissionNames): void;

    /**
     * @param  array<int, Role>  $roles
     */
    public function syncUserRoles(User $user, array $roles): void;

    /**
     * @param  array<int, string>  $permissionNames
     */
    public function syncUserPermissions(User $user, array $permissionNames): void;

    public function saveUserRoleLabel(User $user, string $role): void;

    public function loadUserAccess(User $user): User;

    public function protectedAdminUserCount(): int;

    public function forgetCache(): void;
}
