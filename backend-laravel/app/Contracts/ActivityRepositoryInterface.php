<?php

namespace App\Contracts;

use App\Models\ActivityLog;
use App\Support\DataTables\DataTableQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface ActivityRepositoryInterface
{
    public function all(string $tenantId): Collection;

    public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator;

    public function record(string $tenantId, ?string $userId, string $actionType, string $description): ActivityLog;
}
