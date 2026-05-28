<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
class UserPermissionsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $roles = $this->getRoleNames()->values();
        $directPermissions = $this->getDirectPermissions()->pluck('name')->values();
        $allPermissions = $this->getAllPermissions()->pluck('name')->unique()->values();

        return [
            'user_id' => $this->id,
            'roles' => $roles,
            'direct_permissions' => $directPermissions,
            'permissions' => $allPermissions,
        ];
    }
}
