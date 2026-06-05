<?php

namespace App\Policies;

use App\Models\User;
use App\Support\Rbac\Permissions;
use Spatie\Permission\Models\Permission;

class PermissionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can(Permissions::PERMISSIONS_VIEW);
    }

    public function view(User $user, Permission $permission): bool
    {
        return $user->can(Permissions::PERMISSIONS_VIEW);
    }

    public function create(User $user): bool
    {
        return $user->hasSystemBypass();
    }

    public function update(User $user, Permission $permission): bool
    {
        return $user->hasSystemBypass();
    }

    public function delete(User $user, Permission $permission): bool
    {
        return $user->hasSystemBypass();
    }
}
