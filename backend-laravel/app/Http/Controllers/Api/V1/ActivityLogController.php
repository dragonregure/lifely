<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\ActivityRepositoryInterface;
use App\Http\Resources\ActivityLogResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ActivityLogController extends BaseApiController
{
    public function __construct(private readonly ActivityRepositoryInterface $activity)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return ActivityLogResource::collection($this->activity->all($this->tenantId($request)));
    }
}
