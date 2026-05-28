<?php

namespace App\Policies;

use App\Models\User;
use App\Support\Rbac\Permissions;
use Spatie\Permission\Models\Role;

class RolePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can(Permissions::ROLES_VIEW);
    }

    public function view(User $user, Role $role): bool
    {
        return $user->can(Permissions::ROLES_VIEW);
    }

    public function create(User $user): bool
    {
        return $user->can(Permissions::ROLES_CREATE);
    }

    public function update(User $user, Role $role): bool
    {
        return $user->can(Permissions::ROLES_UPDATE);
    }

    public function delete(User $user, Role $role): bool
    {
        return $user->can(Permissions::ROLES_DELETE);
    }
}
