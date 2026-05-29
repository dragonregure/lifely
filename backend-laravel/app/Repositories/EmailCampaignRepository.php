<?php

namespace App\Repositories;

use App\Contracts\EmailCampaignRepositoryInterface;
use App\Jobs\SendBulkEmailCampaign;
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

        SendBulkEmailCampaign::dispatch($campaign->id);

        return $campaign;
    }
}
