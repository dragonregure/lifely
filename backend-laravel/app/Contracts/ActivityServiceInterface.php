<?php

namespace App\Contracts;

use App\Models\ActivityLog;
use App\Support\DataTables\DataTableQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface ActivityServiceInterface
{
    public function all(string $tenantId): Collection;

    public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator;

    /**
     * @param  array<string, mixed>  $properties
     */
    public function record(string $tenantId, ?string $userId, string $actionType, string $description, array $properties = []): ActivityLog;
}
