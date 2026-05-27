<?php

namespace App\Contracts;

use App\Models\ActivityLog;
use Illuminate\Support\Collection;

interface ActivityRepositoryInterface
{
    public function all(string $tenantId): Collection;

    public function record(string $tenantId, ?string $userId, string $actionType, string $description): ActivityLog;
}
