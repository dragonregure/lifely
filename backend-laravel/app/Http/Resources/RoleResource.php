<?php

namespace App\Http\Resources;

use App\Models\Role;
use App\Support\Rbac\Permissions;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Role */
class RoleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $permissions = $this->whenLoaded('permissions', function () use ($request) {
            $permissions = $this->permissions;

            if (! $request->user()?->can(Permissions::ROLES_MANAGE_SYSTEM)) {
                $permissions = $permissions->whereNotIn('name', Permissions::systemOnly())->values();
            }

            return PermissionResource::collection($permissions);
        });

        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'is_system' => $this->is_system,
            'name' => $this->name,
            'guard_name' => $this->guard_name,
            'permissions' => $permissions,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
