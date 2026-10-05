<?php

namespace App\Services;

use App\Contracts\TenantRepositoryInterface;
use App\Contracts\TenantServiceInterface;
use App\Models\Tenant;
use App\Support\DataTables\DataTableQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class TenantService implements TenantServiceInterface
{
    public function __construct(private readonly TenantRepositoryInterface $tenants)
    {
    }

    public function find(string $tenantId): ?Tenant
    {
        return $this->tenants->find($tenantId);
    }

    public function members(string $tenantId): Collection
    {
        return $this->tenants->members($tenantId);
    }

    public function paginateMembers(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator
    {
        return $this->tenants->paginateMembers($tenantId, $dataTable);
    }

    public function usersBelongToTenant(string $tenantId, array $userIds): bool
    {
        $uniqueIds = array_values(array_unique($userIds));

        return $uniqueIds === []
            || count($this->tenants->findExistingMemberIds($tenantId, $uniqueIds)) === count($uniqueIds);
    }

    public function userBelongsToTenant(string $tenantId, string $userId): bool
    {
        return $this->usersBelongToTenant($tenantId, [$userId]);
    }
}
