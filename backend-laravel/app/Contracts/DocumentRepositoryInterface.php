<?php

namespace App\Contracts;

use App\Models\Document;
use Illuminate\Support\Collection;

interface DocumentRepositoryInterface
{
    public function allForModel(string $tenantId, string $model, string $modelId, ?string $type = null): Collection;

    public function create(string $tenantId, array $data): Document;

    public function delete(string $tenantId, string $documentId): bool;
}
