<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\ActivityLog */
class ActivityLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $this->resource->relationLoaded('user') ? $this->resource->getRelation('user') : null;

        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'user_id' => $this->user_id,
            'user_name' => $user instanceof User ? $user->name : null,
            'action_type' => $this->action_type,
            'description' => $this->description,
            'properties' => $this->properties,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
