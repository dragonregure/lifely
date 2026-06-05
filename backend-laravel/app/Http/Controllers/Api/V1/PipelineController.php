<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\PipelineRepositoryInterface;
use App\Http\Requests\UpdatePipelineRequest;
use App\Http\Requests\StorePipelineRequest;
use App\Http\Requests\UpdatePipelineStageRequest;
use App\Http\Resources\PipelineResource;
use App\Support\DataTables\DataTableQuery;
use App\Support\Rbac\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class PipelineController extends BaseApiController
{
    protected const ALLOWED_INCLUDES = ['contact', 'listing', 'user'];

    public function __construct(private readonly PipelineRepositoryInterface $pipeline)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize(Permissions::PIPELINE_VIEW);

        return PipelineResource::collection($this->pipeline->paginate(
            $this->tenantId($request),
            DataTableQuery::fromRequest($request, ['stage', 'source', 'user_id', 'contact_id', 'listing_id']),
            $this->includes($request)
        ));
    }

    public function store(StorePipelineRequest $request): JsonResponse
    {
        $this->authorize(Permissions::PIPELINE_CREATE);

        return (new PipelineResource($this->pipeline->create($this->tenantId($request), $request->validated())))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function updateStage(UpdatePipelineStageRequest $request, string $pipeline): PipelineResource
    {
        $deal = $this->pipeline->updateStage($this->tenantId($request), $pipeline, $request->validated('stage'));

        if (! $deal) {
            throw new NotFoundHttpException('Pipeline deal not found.');
        }

        return new PipelineResource($deal);
    }

    public function update(UpdatePipelineRequest $request, string $pipeline): PipelineResource
    {
        $tenantId = $this->tenantId($request);

        $data = $request->validated();

        $updatedDeal = $this->pipeline->update($tenantId, $pipeline, $data);

        if (! $updatedDeal) {
            throw new NotFoundHttpException('Pipeline deal not found.');
        }

        return new PipelineResource($updatedDeal);
    }
}
