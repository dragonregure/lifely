<?php

namespace App\Contracts;

use App\Models\Reference;
use App\Support\DataTables\DataTableQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface ReferenceRepositoryInterface
{
    public function all(string $tenantId, array $filters = []): Collection;

    public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator;

    public function findVisible(string $tenantId, string $referenceId): ?Reference;

    public function create(string $tenantId, array $data): Reference;

    public function update(string $tenantId, string $referenceId, array $data): ?Reference;

    public function delete(string $tenantId, string $referenceId): bool;
}
