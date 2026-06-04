<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\User */
class MemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'role' => $this->role,
            'roles' => $this->getRoleNames()->values(),
            'direct_permissions' => $this->getDirectPermissions()->pluck('name')->values(),
            'name' => $this->name,
            'email' => $this->email,
            'is_primary_owner' => $this->whenPivotLoaded(
                'listing_users',
                fn () => (bool) $this->resource->getRelation('pivot')->getAttribute('is_primary_owner')
            ),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
