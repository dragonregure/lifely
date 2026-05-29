<?php

namespace App\Policies;

use App\Models\Reference;
use App\Models\User;
use App\Support\Rbac\Permissions;

class ReferencePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can(Permissions::REFERENCES_VIEW);
    }

    public function view(User $user, Reference $reference): bool
    {
        return $user->can(Permissions::REFERENCES_VIEW);
    }

    public function create(User $user): bool
    {
        return $user->can(Permissions::REFERENCES_CREATE);
    }

    public function update(User $user, Reference $reference): bool
    {
        if ($reference->tenant_id === null) {
            return $user->can(Permissions::REFERENCES_MANAGE_SYSTEM);
        }

        return $user->can(Permissions::REFERENCES_UPDATE);
    }

    public function delete(User $user, Reference $reference): bool
    {
        if ($reference->tenant_id === null) {
            return $user->can(Permissions::REFERENCES_MANAGE_SYSTEM);
        }

        return $user->can(Permissions::REFERENCES_DELETE);
    }
}
