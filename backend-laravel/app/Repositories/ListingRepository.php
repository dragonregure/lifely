<?php

namespace App\Repositories;

use App\Contracts\ActivityRepositoryInterface;
use App\Contracts\ListingRepositoryInterface;
use App\Models\Listing;
use App\Support\DataTables\DataTableQuery;
use App\Support\DataTables\EloquentDataTable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class ListingRepository implements ListingRepositoryInterface
{
    public function __construct(private readonly ActivityRepositoryInterface $activity)
    {
    }

    public function all(string $tenantId): Collection
    {
        return Listing::query()
            ->where('tenant_id', $tenantId)
            ->latest()
            ->get();
    }

    public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator
    {
        return EloquentDataTable::paginate(
            Listing::query()->where('tenant_id', $tenantId),
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

    public function create(string $tenantId, array $data): Listing
    {
        $listing = Listing::query()->create($data + ['tenant_id' => $tenantId]);
        $this->activity->record($tenantId, null, 'listing.created', "Created listing {$listing->title}.");

        return $listing;
    }
}
