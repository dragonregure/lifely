<?php

namespace App\Services;

use App\Contracts\ReferenceRepositoryInterface;
use App\Contracts\ReferenceServiceInterface;
use App\Models\Reference;
use App\Support\DataTables\DataTableQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class ReferenceService implements ReferenceServiceInterface
{
    public function __construct(private readonly ReferenceRepositoryInterface $references)
    {
    }

    public function all(string $tenantId, array $filters = []): Collection
    {
        return $this->references->all($tenantId, $filters);
    }

    public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator
    {
        return $this->references->paginate($tenantId, $dataTable);
    }

    public function referenceTypeOptions(string $tenantId): Collection
    {
        return $this->references->referenceTypeOptions($tenantId);
    }

    public function groupOptions(string $tenantId): Collection
    {
        return $this->references->groupOptions($tenantId);
    }

    public function findVisible(string $tenantId, string $referenceId): ?Reference
    {
        return $this->references->findVisible($tenantId, $referenceId);
    }

    public function create(string $tenantId, array $data): Reference
    {
        return $this->references->create($tenantId, $data);
    }

    public function update(string $tenantId, string $referenceId, array $data): ?Reference
    {
        return $this->references->update($tenantId, $referenceId, $data);
    }

    public function delete(string $tenantId, string $referenceId): bool
    {
        return $this->references->delete($tenantId, $referenceId);
    }
}
