<?php

namespace App\Http\Resources;

use App\Models\Contact;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Contact */
class ContactResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $status = (bool) $this->resource->getAttribute('status');
        $source = $this->resource->getAttribute('source');
        $sourceId = is_numeric($source) ? (int) $source : null;

        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'owner_id' => $this->owner_id,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'status' => $status,
            'status_label' => $status ? 'Active' : 'Inactive',
            'budget' => $this->budget === null ? null : (float) $this->budget,
            'source_id' => $sourceId,
            'source' => Contact::sourceLabel($sourceId),
            'last_contacted_at' => $this->last_contacted_at instanceof CarbonInterface
                ? $this->last_contacted_at->toISOString()
                : $this->last_contacted_at,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
