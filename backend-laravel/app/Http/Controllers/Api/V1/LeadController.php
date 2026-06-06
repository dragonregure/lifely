<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\LeadRepositoryInterface;
use App\Http\Requests\UpdateLeadRequest;
use App\Http\Requests\StoreLeadRequest;
use App\Http\Requests\UpdateLeadStageRequest;
use App\Http\Resources\LeadResource;
use App\Support\DataTables\DataTableQuery;
use App\Support\Rbac\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class LeadController extends BaseApiController
{
    protected const ALLOWED_INCLUDES = ['contact', 'listing', 'user'];

    public function __construct(private readonly LeadRepositoryInterface $leads)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize(Permissions::LEADS_VIEW);

        return LeadResource::collection($this->leads->paginate(
            $this->tenantId($request),
            DataTableQuery::fromRequest($request, ['stage', 'source', 'user_id', 'contact_id', 'listing_id']),
            $this->includes($request)
        ));
    }

    public function store(StoreLeadRequest $request): JsonResponse
    {
        $this->authorize(Permissions::LEADS_CREATE);

        return (new LeadResource($this->leads->create($this->tenantId($request), $request->validated())))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function updateStage(UpdateLeadStageRequest $request, string $lead): LeadResource
    {
        $deal = $this->leads->updateStage($this->tenantId($request), $lead, $request->validated('stage'));

        if (! $deal) {
            throw new NotFoundHttpException('Lead not found.');
        }

        return new LeadResource($deal);
    }

    public function update(UpdateLeadRequest $request, string $lead): LeadResource
    {
        $tenantId = $this->tenantId($request);

        $data = $request->validated();

        $updatedDeal = $this->leads->update($tenantId, $lead, $data);

        if (! $updatedDeal) {
            throw new NotFoundHttpException('Lead not found.');
        }

        return new LeadResource($updatedDeal);
    }
}
