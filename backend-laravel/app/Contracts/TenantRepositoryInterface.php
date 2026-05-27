<?php

namespace App\Contracts;

use App\Models\Tenant;
use Illuminate\Support\Collection;

interface TenantRepositoryInterface
{
    public function find(string $tenantId): ?Tenant;

    public function members(string $tenantId): Collection;
}
