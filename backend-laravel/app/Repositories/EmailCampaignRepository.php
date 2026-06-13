<?php

namespace App\Repositories;

use App\Contracts\EmailCampaignRepositoryInterface;
use App\Jobs\SendBulkEmailCampaign;
use App\Models\Contact;
use App\Models\EmailCampaign;
use App\Models\Listing;
use App\Models\User;
use App\Services\Email\DemoEmailLimiter;
use App\Support\DataTables\DataTableQuery;
use App\Support\DataTables\EloquentDataTable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

class EmailCampaignRepository implements EmailCampaignRepositoryInterface
{
    public function __construct(private readonly DemoEmailLimiter $demoEmailLimiter)
    {
    }

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

        $campaign = DB::transaction(function () use ($tenantId, $data, $contactIds): EmailCampaign {
            $this->demoEmailLimiter->reserve($tenantId, count($contactIds));

            return EmailCampaign::query()->create([
                'tenant_id' => $tenantId,
                'user_id' => $this->tenantUserId($tenantId, $data['user_id'] ?? null),
                'listing_id' => $this->tenantListingId($tenantId, $data['listing_id'] ?? null),
                'subject' => $data['subject'],
                'body' => $data['body'],
                'contact_ids' => $contactIds,
                'recipient_count' => count($contactIds),
                'status' => 'Queued',
            ]);
        });

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
            $includedContactIds = collect($data['included_contact_ids'] ?? [])
                ->filter(fn (mixed $contactId): bool => is_string($contactId))
                ->unique()
                ->values()
                ->all();

            return $this->tenantContactIds($tenantId, $includedContactIds, true);
        }

        $contactIds = collect($data['contact_ids'] ?? [])
            ->filter(fn (mixed $contactId): bool => is_string($contactId))
            ->unique()
            ->values()
            ->all();

        return $this->tenantContactIds($tenantId, $contactIds);
    }

    private function tenantUserId(string $tenantId, mixed $userId): ?string
    {
        if (! is_string($userId) || $userId === '') {
            return null;
        }

        $tenantUserId = User::query()
            ->where('tenant_id', $tenantId)
            ->whereKey($userId)
            ->value('id');

        return is_string($tenantUserId) ? $tenantUserId : null;
    }

    private function tenantListingId(string $tenantId, mixed $listingId): ?string
    {
        if (! is_string($listingId) || $listingId === '') {
            return null;
        }

        $tenantListingId = Listing::query()
            ->where('tenant_id', $tenantId)
            ->whereKey($listingId)
            ->value('id');

        return is_string($tenantListingId) ? $tenantListingId : null;
    }

    /**
     * @param  array<int, string>  $contactIds
     * @return array<int, string>
     */
    private function tenantContactIds(string $tenantId, array $contactIds, bool $activeOnly = false): array
    {
        if ($contactIds === []) {
            return [];
        }

        $query = Contact::query()
            ->where('tenant_id', $tenantId)
            ->whereIn('id', $contactIds);

        if ($activeOnly) {
            $query->where('status', true);
        }

        $allowedContactIds = $query->pluck('id')
            ->filter(fn (mixed $contactId): bool => is_string($contactId))
            ->all();

        return array_values(array_intersect($contactIds, $allowedContactIds));
    }
}
