<?php

namespace App\Repositories;

use App\Contracts\EmailCampaignRepositoryInterface;
use App\Jobs\SendBulkEmailCampaign;
use App\Models\Contact;
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
        $contactIds = $this->recipientContactIds($tenantId, $data);

        $campaign = EmailCampaign::query()->create([
            'tenant_id' => $tenantId,
            'user_id' => $data['user_id'] ?? null,
            'subject' => $data['subject'],
            'body' => $data['body'],
            'contact_ids' => $contactIds,
            'recipient_count' => count($contactIds),
            'status' => 'Queued',
        ]);

        SendBulkEmailCampaign::dispatch($campaign->id);

        return $campaign;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<int, string>
     */
    private function recipientContactIds(string $tenantId, array $data): array
    {
        if (($data['all_active_contacts'] ?? false) === true) {
            $query = Contact::query()
                ->where('tenant_id', $tenantId)
                ->where('status', true)
                ->latest('created_at');

            $excludedContactIds = collect($data['excluded_contact_ids'] ?? [])
                ->filter(fn (mixed $contactId): bool => is_string($contactId))
                ->unique()
                ->values()
                ->all();

            if ($excludedContactIds !== []) {
                $query->whereNotIn('id', $excludedContactIds);
            }

            return $query->pluck('id')->all();
        }

        return collect($data['contact_ids'] ?? [])
            ->filter(fn (mixed $contactId): bool => is_string($contactId))
            ->unique()
            ->values()
            ->all();
    }
}
