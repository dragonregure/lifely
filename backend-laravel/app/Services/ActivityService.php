<?php

namespace App\Services;

use App\Contracts\ActivityRepositoryInterface;
use App\Contracts\ActivityServiceInterface;
use App\Models\ActivityLog;
use App\Support\DataTables\DataTableQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class ActivityService implements ActivityServiceInterface
{
    public function __construct(private readonly ActivityRepositoryInterface $activity)
    {
    }

    public function all(string $tenantId): Collection
    {
        return $this->activity->all($tenantId);
    }

    public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator
    {
        return $this->activity->paginate($tenantId, $dataTable);
    }

    public function record(string $tenantId, ?string $userId, string $actionType, string $description, array $properties = []): ActivityLog
    {
        return $this->activity->record($tenantId, $userId, $actionType, $description, $properties);
    }
}
