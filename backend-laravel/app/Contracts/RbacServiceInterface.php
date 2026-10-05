<?php

namespace App\Contracts;

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Collection;
use Spatie\Permission\Models\Permission;

interface RbacServiceInterface
{
    public function roles(string $tenantId, bool $canManageSystem, array $includes = []): Collection;

    public function findRole(string $tenantId, string $roleId, bool $canManageSystem, array $includes = []): ?Role;

    public function permissions(bool $canManageSystem, array $includes = []): Collection;

    public function permissionWithRelations(Permission $permission, bool $canManageSystem, array $includes = []): ?Permission;

    /**
     * @param  array<string, mixed>  $data
     */
    public function createRole(string $tenantId, array $data): Role;

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateRole(string $tenantId, Role $role, array $data): Role;

    public function deleteRole(Role $role): void;

    /**
     * @param  array<string, mixed>  $data
     */
    public function createPermission(array $data): Permission;

    /**
     * @param  array<string, mixed>  $data
     */
    public function updatePermission(Permission $permission, array $data): Permission;

    public function deletePermission(Permission $permission): void;

    /**
     * @param  array<int, string>  $roleNames
     */
    public function syncUserRoles(string $tenantId, User $user, array $roleNames): User;

    /**
     * @param  array<int, string>  $permissionNames
     */
    public function syncUserPermissions(string $tenantId, User $user, array $permissionNames): User;

    public function ensureRoleExists(string $name, string $guardName = 'web', ?string $tenantId = null): Role;
}
