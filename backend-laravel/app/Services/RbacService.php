<?php

namespace App\Services;

use App\Models\User;
use App\Support\Rbac\Permissions;
use App\Support\Rbac\Roles;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Symfony\Component\HttpKernel\Exception\HttpException;

class RbacService
{
    public function createRole(array $data): Role
    {
        return DB::transaction(function () use ($data): Role {
            $role = Role::query()->create([
                'name' => $data['name'],
                'guard_name' => $data['guard_name'] ?? 'web',
            ]);

            $this->syncRolePermissions($role, $data['permissions'] ?? []);
            $this->forgetCache();

            return $role->load('permissions');
        });
    }

    public function updateRole(Role $role, array $data): Role
    {
        return DB::transaction(function () use ($role, $data): Role {
            if ($role->name === Roles::protectedAdmin() && isset($data['name']) && $data['name'] !== $role->name) {
                throw new HttpException(422, 'The Office Admin role name cannot be changed.');
            }

            $role->fill([
                'name' => $data['name'] ?? $role->name,
                'guard_name' => $data['guard_name'] ?? $role->guard_name,
            ])->save();

            if (array_key_exists('permissions', $data)) {
                $this->syncRolePermissions($role, $data['permissions']);
            }

            $this->forgetCache();

            return $role->load('permissions');
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

    public function syncUserRoles(User $user, array $roleNames): User
    {
        return DB::transaction(function () use ($user, $roleNames): User {
            $this->ensureOfficeAdminCanBeRemoved($user, $roleNames);

            $user->syncRoles($roleNames);
            $user->forceFill(['role' => $roleNames[0] ?? Roles::SIMPLE_AGENT])->save();
            $this->forgetCache();

            return $user->load('roles.permissions', 'permissions');
        });
    }

    public function syncUserPermissions(User $user, array $permissionNames): User
    {
        return DB::transaction(function () use ($user, $permissionNames): User {
            $user->syncPermissions($permissionNames);
            $this->forgetCache();

            return $user->load('roles.permissions', 'permissions');
        });
    }

    private function syncRolePermissions(Role $role, array $permissionNames): void
    {
        if ($role->name === Roles::protectedAdmin()) {
            $permissionNames = array_values(array_unique(array_merge($permissionNames, Permissions::protected())));
        }

        $role->syncPermissions($permissionNames);
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

    private function forgetCache(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
