<?php

namespace App\Repositories;

use App\Contracts\ListingRepositoryInterface;
use App\Models\Listing;
use App\Support\DataTables\DataTableQuery;
use App\Support\DataTables\EloquentDataTable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class ListingRepository implements ListingRepositoryInterface
{
    public function all(string $tenantId): Collection
    {
        return Listing::query()
            ->where('tenant_id', $tenantId)
            ->with(['documents' => fn ($query) => $query->where('tenant_id', $tenantId)])
            ->latest()
            ->get();
    }

    public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator
    {
        return EloquentDataTable::paginate(
            Listing::query()
                ->where('tenant_id', $tenantId)
                ->with(['documents' => fn ($query) => $query->where('tenant_id', $tenantId)]),
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
            ->with(['documents' => fn ($query) => $query->where('tenant_id', $tenantId)])
            ->find($listingId);
    }

    public function create(string $tenantId, array $data): Listing
    {
        return Listing::query()->create($data + ['tenant_id' => $tenantId])->load([
            'documents' => fn ($query) => $query->where('tenant_id', $tenantId),
        ]);
    }

    public function update(string $tenantId, string $listingId, array $data): ?Listing
    {
        $listing = $this->find($tenantId, $listingId);

        if (! $listing) {
            return null;
        }

        $listing->update($data);

        return $listing->refresh()->load([
            'documents' => fn ($query) => $query->where('tenant_id', $tenantId),
        ]);
    }
}
