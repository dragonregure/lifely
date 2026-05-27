<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContactResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'owner_id' => $this->owner_id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'status' => $this->status,
            'budget' => $this->budget === null ? null : (float) $this->budget,
            'source' => $this->source,
            'last_contacted_at' => $this->last_contacted_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
