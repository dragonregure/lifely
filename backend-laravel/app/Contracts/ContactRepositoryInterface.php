<?php

namespace App\Contracts;

use App\Models\Contact;
use App\Support\DataTables\DataTableQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface ContactRepositoryInterface
{
    public function all(string $tenantId, array $filters = []): Collection;

    public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator;

    public function find(string $tenantId, string $contactId): ?Contact;

    public function create(string $tenantId, array $data): Contact;

    public function update(string $tenantId, string $contactId, array $data): ?Contact;

    public function delete(string $tenantId, string $contactId): bool;

    public function countByStatus(string $tenantId): Collection;
}
