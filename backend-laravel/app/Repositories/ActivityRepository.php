<?php

namespace App\Repositories;

use App\Contracts\ActivityRepositoryInterface;
use App\Models\ActivityLog;
use App\Support\DataTables\DataTableQuery;
use App\Support\DataTables\EloquentDataTable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
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

    public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator
    {
        return EloquentDataTable::paginate(
            ActivityLog::query()->where('tenant_id', $tenantId),
            $dataTable,
            ['action_type', 'description', 'user_id'],
            ['action_type' => 'action_type', 'user_id' => 'user_id'],
            [
                'action' => 'action_type',
                'description' => 'description',
                'user' => 'user_id',
                'time' => 'created_at',
                'created_at' => 'created_at',
            ]
        );
    }

    public function record(string $tenantId, ?string $userId, string $actionType, string $description, array $properties = []): ActivityLog
    {
        return ActivityLog::query()->create([
            'tenant_id' => $tenantId,
            'user_id' => $userId,
            'action_type' => $actionType,
            'description' => $description,
            'properties' => $properties === [] ? null : $properties,
        ]);
    }
}
