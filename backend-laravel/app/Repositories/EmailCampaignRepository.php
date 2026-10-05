<?php

namespace App\Repositories;

use App\Contracts\EmailCampaignRepositoryInterface;
use App\Models\EmailCampaign;
use App\Support\DataTables\DataTableQuery;
use App\Support\DataTables\EloquentDataTable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class EmailCampaignRepository implements EmailCampaignRepositoryInterface
{
    public function all(string $tenantId): Collection
    {
        return EmailCampaign::query()
            ->where('tenant_id', $tenantId)
            ->latest()
            ->get();
    }

    public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator
    {
        return EloquentDataTable::paginate(
            EmailCampaign::query()->where('tenant_id', $tenantId),
            $dataTable,
            ['subject', 'status'],
            ['status' => 'status', 'user_id' => 'user_id'],
            [
                'subject' => 'subject',
                'recipient_count' => 'recipient_count',
                'status' => 'status',
                'created_at' => 'created_at',
            ]
        );
    }

    public function find(string $campaignId): ?EmailCampaign
    {
        return EmailCampaign::query()->find($campaignId);
    }

    public function createQueued(string $tenantId, array $data): EmailCampaign
    {
        return EmailCampaign::query()->create($data + ['tenant_id' => $tenantId]);
    }

    public function updateStatus(EmailCampaign $campaign, string $status): EmailCampaign
    {
        $campaign->update(['status' => $status]);

        return $campaign->refresh();
    }
}
