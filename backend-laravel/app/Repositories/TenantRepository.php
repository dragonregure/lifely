<?php

namespace App\Repositories;

use App\Contracts\TenantRepositoryInterface;
use App\Models\Tenant;
use App\Models\User;
use App\Support\DataTables\DataTableQuery;
use App\Support\DataTables\EloquentDataTable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
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

    public function paginateMembers(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator
    {
        return EloquentDataTable::paginate(
            User::query()->where('tenant_id', $tenantId),
            $dataTable,
            ['name', 'email', 'role'],
            [],
            [
                'name' => 'name',
                'email' => 'email',
                'role' => 'role',
                'created_at' => 'created_at',
            ],
            'name',
            'asc'
        );
    }
}
