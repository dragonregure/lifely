<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PipelineDealResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'contact_id' => $this->contact_id,
            'listing_id' => $this->listing_id,
            'user_id' => $this->user_id,
            'stage' => $this->stage,
            'value' => (float) $this->value,
            'next_task' => $this->next_task,
            'due_at' => $this->due_at?->toISOString(),
            'contact' => new ContactResource($this->whenLoaded('contact')),
            'listing' => new ListingResource($this->whenLoaded('listing')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
