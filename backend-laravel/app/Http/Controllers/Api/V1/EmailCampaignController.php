<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\EmailCampaignRepositoryInterface;
use App\Http\Requests\SendBulkEmailRequest;
use App\Http\Resources\EmailCampaignResource;
use App\Support\Rbac\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class EmailCampaignController extends BaseApiController
{
    public function __construct(private readonly EmailCampaignRepositoryInterface $campaigns)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize(Permissions::EMAIL_CAMPAIGNS_VIEW);

        return EmailCampaignResource::collection($this->campaigns->all($this->tenantId($request)));
    }

    public function store(SendBulkEmailRequest $request): JsonResponse
    {
        $this->authorize(Permissions::EMAIL_CAMPAIGNS_CREATE);

        return (new EmailCampaignResource($this->campaigns->queue($this->tenantId($request), $request->validated())))
            ->response()
            ->setStatusCode(Response::HTTP_ACCEPTED);
    }
}
