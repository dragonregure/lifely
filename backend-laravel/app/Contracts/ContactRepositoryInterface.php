<?php

namespace App\Contracts;

use App\Models\Contact;
use Illuminate\Support\Collection;

interface ContactRepositoryInterface
{
    public function all(string $tenantId, array $filters = []): Collection;

    public function find(string $tenantId, string $contactId): ?Contact;

    public function create(string $tenantId, array $data): Contact;

    public function update(string $tenantId, string $contactId, array $data): ?Contact;

    public function countByStatus(string $tenantId): Collection;
}
