<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\EmailCampaign */
class EmailCampaignResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'user_id' => $this->user_id,
            'subject' => $this->subject,
            'recipient_count' => $this->recipient_count,
            'status' => $this->status,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
