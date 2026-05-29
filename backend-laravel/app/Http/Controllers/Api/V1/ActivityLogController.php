<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\ActivityRepositoryInterface;
use App\Http\Resources\ActivityLogResource;
use App\Support\DataTables\DataTableQuery;
use App\Support\Rbac\Permissions;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ActivityLogController extends BaseApiController
{
    public function __construct(private readonly ActivityRepositoryInterface $activity)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize(Permissions::ACTIVITY_LOGS_VIEW);

        return ActivityLogResource::collection($this->activity->paginate(
            $this->tenantId($request),
            DataTableQuery::fromRequest($request, ['action_type', 'user_id'])
        ));
    }
}
