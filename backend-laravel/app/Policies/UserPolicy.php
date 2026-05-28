<?php

namespace App\Policies;

use App\Models\User;
use App\Support\Rbac\Permissions;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can(Permissions::USERS_VIEW);
    }

    public function view(User $user, User $model): bool
    {
        return $user->id === $model->id || $user->can(Permissions::USERS_VIEW);
    }

    public function assignRoles(User $user, User $model): bool
    {
        return $user->can(Permissions::USERS_ASSIGN_ROLES);
    }

    public function assignPermissions(User $user, User $model): bool
    {
        return $user->can(Permissions::USERS_ASSIGN_PERMISSIONS);
    }
}
