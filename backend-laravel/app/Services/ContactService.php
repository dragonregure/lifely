<?php

namespace App\Services;

use App\Contracts\ContactRepositoryInterface;
use App\Contracts\ContactServiceInterface;
use App\Models\Contact;
use App\Support\DataTables\DataTableQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class ContactService implements ContactServiceInterface
{
    public function __construct(private readonly ContactRepositoryInterface $contacts)
    {
    }

    public function all(string $tenantId, array $filters = []): Collection
    {
        return $this->contacts->all($tenantId, $filters);
    }

    public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator
    {
        return $this->contacts->paginate($tenantId, $dataTable);
    }

    public function find(string $tenantId, string $contactId): ?Contact
    {
        return $this->contacts->find($tenantId, $contactId);
    }

    public function create(string $tenantId, array $data): Contact
    {
        return $this->contacts->create($tenantId, $data);
    }

    public function update(string $tenantId, string $contactId, array $data): ?Contact
    {
        return $this->contacts->update($tenantId, $contactId, $data);
    }

    public function delete(string $tenantId, string $contactId): bool
    {
        return $this->contacts->delete($tenantId, $contactId);
    }

    public function countByStatus(string $tenantId): Collection
    {
        return $this->contacts->countByStatus($tenantId);
    }

    public function contactsBelongToTenant(string $tenantId, array $contactIds, bool $activeOnly = false): bool
    {
        $uniqueIds = array_values(array_unique($contactIds));

        return $uniqueIds === []
            || count($this->contacts->findExistingIds($tenantId, $uniqueIds, $activeOnly)) === count($uniqueIds);
    }

    public function tenantContactIds(string $tenantId, array $contactIds, bool $activeOnly = false): array
    {
        return $this->contacts->findExistingIds($tenantId, $contactIds, $activeOnly);
    }
}
