<?php

namespace App\Repositories;

use App\Contracts\ActivityRepositoryInterface;
use App\Models\ActivityLog;
use Illuminate\Support\Collection;

class ActivityRepository implements ActivityRepositoryInterface
{
    public function all(string $tenantId): Collection
    {
        return ActivityLog::query()
            ->where('tenant_id', $tenantId)
            ->latest()
            ->get();
    }

    public function record(string $tenantId, ?string $userId, string $actionType, string $description): ActivityLog
    {
        return ActivityLog::query()->create([
            'tenant_id' => $tenantId,
            'user_id' => $userId,
            'action_type' => $actionType,
            'description' => $description,
        ]);
    }
}
