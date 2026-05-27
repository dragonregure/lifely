<?php

namespace App\Repositories;

use App\Contracts\TenantRepositoryInterface;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Collection;

class TenantRepository implements TenantRepositoryInterface
{
    public function find(string $tenantId): ?Tenant
    {
        return Tenant::query()->find($tenantId);
    }

    public function members(string $tenantId): Collection
    {
        return User::query()
            ->where('tenant_id', $tenantId)
            ->orderBy('name')
            ->get();
    }
}
