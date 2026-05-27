<?php

namespace App\Contracts;

use App\Models\Listing;
use Illuminate\Support\Collection;

interface ListingRepositoryInterface
{
    public function all(string $tenantId): Collection;

    public function create(string $tenantId, array $data): Listing;
}
