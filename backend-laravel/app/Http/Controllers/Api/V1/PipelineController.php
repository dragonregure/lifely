<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\PipelineRepositoryInterface;
use App\Http\Requests\StorePipelineDealRequest;
use App\Http\Requests\UpdatePipelineStageRequest;
use App\Http\Resources\PipelineDealResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class PipelineController extends BaseApiController
{
    public function __construct(private readonly PipelineRepositoryInterface $pipeline)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return PipelineDealResource::collection($this->pipeline->all($this->tenantId($request)));
    }

    public function store(StorePipelineDealRequest $request): JsonResponse
    {
        return (new PipelineDealResource($this->pipeline->create($this->tenantId($request), $request->validated())))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function updateStage(UpdatePipelineStageRequest $request, string $pipeline): PipelineDealResource
    {
        $deal = $this->pipeline->updateStage($this->tenantId($request), $pipeline, $request->validated('stage'));

        if (! $deal) {
            throw new NotFoundHttpException('Pipeline deal not found.');
        }

        return new PipelineDealResource($deal);
    }
}
