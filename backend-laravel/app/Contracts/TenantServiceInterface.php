<?php

namespace App\Contracts;

use App\Models\Tenant;
use App\Support\DataTables\DataTableQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface TenantServiceInterface
{
    public function find(string $tenantId): ?Tenant;

    public function members(string $tenantId): Collection;

    public function paginateMembers(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator;

    /**
     * @param  array<int, string>  $userIds
     */
    public function usersBelongToTenant(string $tenantId, array $userIds): bool;

    public function userBelongsToTenant(string $tenantId, string $userId): bool;
}
