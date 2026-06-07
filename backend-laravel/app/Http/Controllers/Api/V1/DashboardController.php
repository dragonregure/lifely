<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\ReportingServiceInterface;
use App\Support\DataTables\DataTableQuery;
use App\Support\Rbac\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends BaseApiController
{
    public function __construct(private readonly ReportingServiceInterface $reports)
    {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $this->authorize(Permissions::REPORTS_VIEW);
        $filters = DataTableQuery::fromRequest($request, ['date_from', 'date_to', 'owner_id', 'source', 'stage'])->filters;

        return response()->json([
            'data' => $this->reports->dashboard($this->tenantId($request), $filters),
        ]);
    }
}
