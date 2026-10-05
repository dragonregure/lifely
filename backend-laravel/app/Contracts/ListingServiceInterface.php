<?php

namespace App\Contracts;

use App\Models\Listing;
use App\Support\DataTables\DataTableQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface ListingServiceInterface
{
    public function all(string $tenantId): Collection;

    /**
     * @param  array<int, string>  $includes
     */
    public function paginate(string $tenantId, DataTableQuery $dataTable, array $includes = []): LengthAwarePaginator;

    /**
     * @param  array<int, string>  $includes
     */
    public function find(string $tenantId, string $listingId, array $includes = []): ?Listing;

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(string $tenantId, array $data): Listing;

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(string $tenantId, string $listingId, array $data): ?Listing;

    /**
     * @param  array<int, string>  $listingIds
     */
    public function listingsBelongToTenant(string $tenantId, array $listingIds): bool;

    public function markSold(string $tenantId, string $listingId): void;
}
