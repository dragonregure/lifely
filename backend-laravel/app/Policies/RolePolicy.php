<?php

namespace App\Policies;

use App\Models\Role;
use App\Models\User;
use App\Support\Rbac\Permissions;

class RolePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can(Permissions::ROLES_VIEW);
    }

    public function view(User $user, Role $role): bool
    {
        return $user->can(Permissions::ROLES_VIEW) && $this->visibleToUserTenant($user, $role);
    }

    public function create(User $user): bool
    {
        return $user->can(Permissions::ROLES_CREATE);
    }

    public function update(User $user, Role $role): bool
    {
        if (! $this->visibleToUserTenant($user, $role)) {
            return false;
        }

        if ($role->is_system) {
            return $user->can(Permissions::ROLES_MANAGE_SYSTEM);
        }

        return $user->can(Permissions::ROLES_UPDATE);
    }

    public function delete(User $user, Role $role): bool
    {
        if (! $this->visibleToUserTenant($user, $role)) {
            return false;
        }

        if ($role->is_system) {
            return $user->can(Permissions::ROLES_MANAGE_SYSTEM);
        }

        return $user->can(Permissions::ROLES_DELETE);
    }

    private function visibleToUserTenant(User $user, Role $role): bool
    {
        return $role->tenant_id === null || $role->tenant_id === $user->tenant_id;
    }
}
