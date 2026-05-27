<?php

namespace App\Contracts;

use App\Models\PipelineDeal;
use Illuminate\Support\Collection;

interface PipelineRepositoryInterface
{
    public function all(string $tenantId): Collection;

    public function create(string $tenantId, array $data): PipelineDeal;

    public function updateStage(string $tenantId, string $dealId, string $stage): ?PipelineDeal;

    public function pendingTaskCount(string $tenantId): int;

    public function totalValue(string $tenantId): float;

    public function valueByStage(string $tenantId): Collection;
}
