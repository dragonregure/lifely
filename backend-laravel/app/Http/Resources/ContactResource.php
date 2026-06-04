<?php

namespace App\Http\Resources;

use App\Models\Reference;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Contact */
class ContactResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $statusReference = $this->statusReference;

        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'owner_id' => $this->owner_id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'status_id' => $this->status_id,
            'status' => $statusReference instanceof Reference ? $statusReference->value : null,
            'budget' => $this->budget === null ? null : (float) $this->budget,
            'source' => $this->source,
            'last_contacted_at' => $this->last_contacted_at instanceof CarbonInterface
                ? $this->last_contacted_at->toISOString()
                : $this->last_contacted_at,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
