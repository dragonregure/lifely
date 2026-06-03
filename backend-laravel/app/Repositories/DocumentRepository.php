<?php

namespace App\Repositories;

use App\Contracts\DocumentRepositoryInterface;
use App\Models\Document;
use Illuminate\Support\Collection;

class DocumentRepository implements DocumentRepositoryInterface
{
    public function allForModel(string $tenantId, string $model, string $modelId, ?string $type = null): Collection
    {
        return Document::query()
            ->where('tenant_id', $tenantId)
            ->where('model', $model)
            ->where('model_id', $modelId)
            ->when($type, fn ($query) => $query->where('type', $type))
            ->orderBy('order')
            ->latest()
            ->get();
    }

    public function create(string $tenantId, array $data): Document
    {
        return Document::query()->create($data + ['tenant_id' => $tenantId]);
    }

    public function delete(string $tenantId, string $documentId): bool
    {
        $document = Document::query()
            ->where('tenant_id', $tenantId)
            ->find($documentId);

        if (! $document) {
            return false;
        }

        return (bool) $document->delete();
    }
}
