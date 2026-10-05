<?php

namespace App\Contracts;

use App\Models\Contact;
use App\Support\DataTables\DataTableQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface ContactServiceInterface
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function all(string $tenantId, array $filters = []): Collection;

    public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator;

    public function find(string $tenantId, string $contactId): ?Contact;

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(string $tenantId, array $data): Contact;

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(string $tenantId, string $contactId, array $data): ?Contact;

    public function delete(string $tenantId, string $contactId): bool;

    public function countByStatus(string $tenantId): Collection;

    /**
     * @param  array<int, string>  $contactIds
     */
    public function contactsBelongToTenant(string $tenantId, array $contactIds, bool $activeOnly = false): bool;

    /**
     * @param  array<int, string>  $contactIds
     * @return array<int, string>
     */
    public function tenantContactIds(string $tenantId, array $contactIds, bool $activeOnly = false): array;
}
