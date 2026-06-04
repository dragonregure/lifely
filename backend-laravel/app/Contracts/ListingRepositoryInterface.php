<?php

namespace App\Contracts;

use App\Models\Listing;
use App\Support\DataTables\DataTableQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface ListingRepositoryInterface
{
    public function all(string $tenantId): Collection;

    public function paginate(string $tenantId, DataTableQuery $dataTable, array $includes = []): LengthAwarePaginator;

    public function find(string $tenantId, string $listingId, array $includes = []): ?Listing;

    public function create(string $tenantId, array $data): Listing;

    public function update(string $tenantId, string $listingId, array $data): ?Listing;
}
