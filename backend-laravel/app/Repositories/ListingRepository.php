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
            ->with($this->relations($tenantId))
            ->latest()
            ->get();
    }

    public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator
    {
        return EloquentDataTable::paginate(
            Listing::query()
                ->where('tenant_id', $tenantId)
                ->with($this->relations($tenantId)),
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

    public function find(string $tenantId, string $listingId): ?Listing
    {
        return Listing::query()
            ->where('tenant_id', $tenantId)
            ->with($this->relations($tenantId))
            ->find($listingId);
    }

    public function create(string $tenantId, array $data): Listing
    {
        $contactIds = array_values((array) (Arr::pull($data, 'contact_ids', []) ?? []));

        return DB::transaction(function () use ($tenantId, $data, $contactIds): Listing {
            $listing = Listing::query()->create($data + ['tenant_id' => $tenantId]);
            $listing->contacts()->sync($contactIds);

            return $listing->load($this->relations($tenantId));
        });
    }

    public function update(string $tenantId, string $listingId, array $data): ?Listing
    {
        $hasContactIds = array_key_exists('contact_ids', $data);
        $contactIds = array_values((array) (Arr::pull($data, 'contact_ids', []) ?? []));
        $listing = $this->find($tenantId, $listingId);

        if (! $listing) {
            return null;
        }

        return DB::transaction(function () use ($tenantId, $listing, $data, $hasContactIds, $contactIds): Listing {
            $listing->update($data);

            if ($hasContactIds) {
                $listing->contacts()->sync($contactIds);
            }

            return $listing->refresh()->load($this->relations($tenantId));
        });
    }

    private function relations(string $tenantId): array
    {
        return [
            'documents' => fn ($query) => $query->where('tenant_id', $tenantId),
            'contacts' => fn ($query) => $query->where('tenant_id', $tenantId)->orderBy('first_name')->orderBy('last_name'),
        ];
    }
}
