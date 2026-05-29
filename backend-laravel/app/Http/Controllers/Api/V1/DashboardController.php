<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\ReportingServiceInterface;
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

        return response()->json([
            'data' => $this->reports->dashboard($this->tenantId($request)),
        ]);
    }
}
