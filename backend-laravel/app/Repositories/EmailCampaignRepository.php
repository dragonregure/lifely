<?php

namespace App\Repositories;

use App\Contracts\ActivityRepositoryInterface;
use App\Contracts\EmailCampaignRepositoryInterface;
use App\Jobs\SendBulkEmailCampaign;
use App\Models\EmailCampaign;
use Illuminate\Support\Collection;

class EmailCampaignRepository implements EmailCampaignRepositoryInterface
{
    public function __construct(private readonly ActivityRepositoryInterface $activity)
    {
    }

    public function all(string $tenantId): Collection
    {
        return EmailCampaign::query()
            ->where('tenant_id', $tenantId)
            ->latest()
            ->get();
    }

    public function queue(string $tenantId, array $data): EmailCampaign
    {
        $campaign = EmailCampaign::query()->create([
            'tenant_id' => $tenantId,
            'user_id' => $data['user_id'] ?? null,
            'subject' => $data['subject'],
            'body' => $data['body'],
            'contact_ids' => $data['contact_ids'],
            'recipient_count' => count($data['contact_ids']),
            'status' => 'Queued',
        ]);

        $this->activity->record(
            $tenantId,
            $data['user_id'] ?? null,
            'email.queued',
            "Queued bulk email '{$campaign->subject}' to {$campaign->recipient_count} contacts."
        );

        SendBulkEmailCampaign::dispatch($campaign->id);

        return $campaign;
    }
}
