<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\PipelineRepositoryInterface;
use App\Http\Requests\UpdatePipelineRequest;
use App\Http\Requests\StorePipelineRequest;
use App\Http\Requests\UpdatePipelineStageRequest;
use App\Http\Resources\PipelineResource;
use App\Models\Pipeline;
use App\Models\User;
use App\Support\DataTables\DataTableQuery;
use App\Support\Rbac\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class PipelineController extends BaseApiController
{
    private const ASSIGNEE_FIELDS = ['stage', 'is_active', 'next_task'];
    private const MANUAL_SOURCE_FIELDS = ['contact_id', 'listing_id'];

    public function __construct(private readonly PipelineRepositoryInterface $pipeline)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize(Permissions::PIPELINE_VIEW);

        return PipelineResource::collection($this->pipeline->paginate(
            $this->tenantId($request),
            DataTableQuery::fromRequest($request, ['stage', 'source', 'user_id', 'contact_id', 'listing_id'])
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
        $this->authorize(Permissions::PIPELINE_UPDATE);

        $existingDeal = $this->pipeline->find($this->tenantId($request), $pipeline);

        if (! $existingDeal) {
            throw new NotFoundHttpException('Pipeline deal not found.');
        }

        $this->authorizePipelineUpdate($request->user(), $existingDeal, $request->validated());

        $deal = $this->pipeline->updateStage($this->tenantId($request), $pipeline, $request->validated('stage'));

        if (! $deal) {
            throw new NotFoundHttpException('Pipeline deal not found.');
        }

        return new PipelineResource($deal);
    }

    public function update(UpdatePipelineRequest $request, string $pipeline): PipelineResource
    {
        $tenantId = $this->tenantId($request);
        $deal = $this->pipeline->find($tenantId, $pipeline);

        if (! $deal) {
            throw new NotFoundHttpException('Pipeline deal not found.');
        }

        $data = $request->validated();

        $this->authorizePipelineUpdate($request->user(), $deal, $data);

        $updatedDeal = $this->pipeline->update($tenantId, $pipeline, $data);

        if (! $updatedDeal) {
            throw new NotFoundHttpException('Pipeline deal not found.');
        }

        return new PipelineResource($updatedDeal);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function authorizePipelineUpdate(?User $user, Pipeline $pipeline, array $data): void
    {
        abort_unless($user instanceof User, Response::HTTP_FORBIDDEN);

        if ($user->can(Permissions::SYSTEM_BYPASS)) {
            return;
        }

        if ($this->hasAnyField($data, self::ASSIGNEE_FIELDS)) {
            abort_unless(
                $user->can(Permissions::PIPELINE_UPDATE) && (string) $pipeline->user_id === (string) $user->id,
                Response::HTTP_FORBIDDEN,
                'Only the assigned user can update pipeline progress fields.'
            );
        }

        if ($this->hasAnyField($data, self::MANUAL_SOURCE_FIELDS)) {
            abort_unless(
                $user->can(Permissions::PIPELINE_UPDATE) && (int) $pipeline->source === Pipeline::SOURCE_MANUAL_ENTRY,
                Response::HTTP_FORBIDDEN,
                'Contact and listing can only be changed for manual-entry pipeline deals.'
            );
        }

        if (! array_key_exists('user_id', $data) || (string) $data['user_id'] === (string) $pipeline->user_id) {
            return;
        }

        $isAssigningToSelf = (string) $data['user_id'] === (string) $user->id;

        abort_unless(
            $user->can(Permissions::PIPELINE_CHANGE_ASSIGNEE)
                || ($isAssigningToSelf && $user->can(Permissions::PIPELINE_ASSIGN_TO_SELF)),
            Response::HTTP_FORBIDDEN,
            'You do not have permission to change this pipeline assignee.'
        );
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array<int, string>  $fields
     */
    private function hasAnyField(array $data, array $fields): bool
    {
        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                return true;
            }
        }

        return false;
    }
}
