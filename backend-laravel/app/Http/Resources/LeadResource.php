<?php

namespace App\Http\Resources;

use App\Models\Lead;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Lead */
class LeadResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'contact_id' => $this->contact_id,
            'listing_id' => $this->listing_id,
            'user_id' => $this->user_id,
            'stage' => Lead::stageLabel((int) $this->stage),
            'source_id' => (int) $this->source,
            'source' => Lead::sourceLabel((int) $this->source),
            'is_active' => (bool) $this->is_active,
            'value' => $this->listingValue(),
            'next_task' => $this->next_task,
            'due_at' => $this->due_at instanceof CarbonInterface
                ? $this->due_at->toISOString()
                : $this->due_at,
            'contact' => new ContactResource($this->whenLoaded('contact')),
            'listing' => new ListingResource($this->whenLoaded('listing')),
            'user' => new MemberResource($this->whenLoaded('user')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }

    private function listingValue(): float
    {
        if (array_key_exists('listing_value', $this->resource->getAttributes())) {
            return (float) ($this->resource->getAttribute('listing_value') ?? 0);
        }

        return $this->value();
    }
}
