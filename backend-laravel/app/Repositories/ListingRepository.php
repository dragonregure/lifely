<?php

namespace App\Repositories;

use App\Contracts\ListingRepositoryInterface;
use App\Models\Listing;
use App\Support\DataTables\DataTableQuery;
use App\Support\DataTables\EloquentDataTable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ListingRepository implements ListingRepositoryInterface
{
    public function all(string $tenantId): Collection
    {
        return Listing::query()
            ->where('tenant_id', $tenantId)
            ->latest()
            ->get();
    }

    public function paginate(string $tenantId, DataTableQuery $dataTable, array $includes = []): LengthAwarePaginator
    {
        return EloquentDataTable::paginate(
            Listing::query()
                ->where('tenant_id', $tenantId)
                ->with($this->relations($tenantId, $includes)),
            $dataTable,
            ['title', 'address', 'status', 'property_type'],
            ['status' => 'status', 'property_type' => 'property_type'],
            [
                'title' => 'title',
                'address' => 'address',
                'price' => 'price',
                'status' => 'status',
                'bedrooms' => 'bedrooms',
                'bathrooms' => 'bathrooms',
                'type' => 'property_type',
                'property_type' => 'property_type',
                'created_at' => 'created_at',
            ]
        );
    }

    public function find(string $tenantId, string $listingId, array $includes = []): ?Listing
    {
        return Listing::query()
            ->where('tenant_id', $tenantId)
            ->with($this->relations($tenantId, $includes))
            ->find($listingId);
    }

    public function create(string $tenantId, array $data): Listing
    {
        $contactIds = array_values((array) (Arr::pull($data, 'contact_ids', []) ?? []));
        $userIds = array_values((array) (Arr::pull($data, 'user_ids', []) ?? []));
        $primaryOwnerUserId = Arr::pull($data, 'primary_owner_user_id');

        return DB::transaction(function () use ($tenantId, $data, $contactIds, $userIds, $primaryOwnerUserId): Listing {
            $listing = Listing::query()->create($data + ['tenant_id' => $tenantId]);
            $listing->contacts()->sync($contactIds);
            $listing->users()->sync($this->userSyncPayload($userIds, $primaryOwnerUserId));

            return $listing;
        });
    }

    public function update(string $tenantId, string $listingId, array $data): ?Listing
    {
        $hasContactIds = array_key_exists('contact_ids', $data);
        $hasUserIds = array_key_exists('user_ids', $data);
        $contactIds = array_values((array) (Arr::pull($data, 'contact_ids', []) ?? []));
        $userIds = array_values((array) (Arr::pull($data, 'user_ids', []) ?? []));
        $primaryOwnerUserId = Arr::pull($data, 'primary_owner_user_id');
        $listing = $this->find($tenantId, $listingId);

        if (! $listing) {
            return null;
        }

        return DB::transaction(function () use ($listing, $data, $hasContactIds, $contactIds, $hasUserIds, $userIds, $primaryOwnerUserId): Listing {
            $listing->update($data);

            if ($hasContactIds) {
                $listing->contacts()->sync($contactIds);
            }

            if ($hasUserIds) {
                DB::table('listing_users')
                    ->where('listing_id', $listing->id)
                    ->update(['is_primary_owner' => null]);

                $listing->users()->sync($this->userSyncPayload($userIds, $primaryOwnerUserId));
            }

            return $listing->refresh();
        });
    }

    private function relations(string $tenantId, array $includes): array
    {
        $relations = [
            'documents' => fn ($query) => $query->where('tenant_id', $tenantId),
            'contacts' => fn ($query) => $query->where('tenant_id', $tenantId)
                ->with('statusReference')
                ->orderBy('first_name')
                ->orderBy('last_name'),
            'users' => fn ($query) => $query->where('tenant_id', $tenantId)
                ->orderByDesc('listing_users.is_primary_owner')
                ->orderBy('name'),
        ];

        return array_intersect_key($relations, array_flip($includes));
    }

    private function userSyncPayload(array $userIds, ?string $primaryOwnerUserId): array
    {
        return collect($userIds)
            ->mapWithKeys(fn (string $userId): array => [
                $userId => ['is_primary_owner' => $userId === $primaryOwnerUserId ? true : null],
            ])
            ->all();
    }
}
