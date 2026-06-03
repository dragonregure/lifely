<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\ListingRepositoryInterface;
use App\Http\Requests\StoreListingRequest;
use App\Http\Requests\UpdateListingRequest;
use App\Http\Resources\ListingResource;
use App\Support\DataTables\DataTableQuery;
use App\Support\Rbac\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ListingController extends BaseApiController
{
    public function __construct(private readonly ListingRepositoryInterface $listings)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize(Permissions::LISTINGS_VIEW);

        return ListingResource::collection($this->listings->paginate(
            $this->tenantId($request),
            DataTableQuery::fromRequest($request, ['status', 'property_type'])
        ));
    }

    public function store(StoreListingRequest $request): JsonResponse
    {
        $this->authorize(Permissions::LISTINGS_CREATE);

        return (new ListingResource($this->listings->create($this->tenantId($request), $request->validated())))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateListingRequest $request, string $listing): ListingResource
    {
        $this->authorize(Permissions::LISTINGS_UPDATE);

        $model = $this->listings->update($this->tenantId($request), $listing, $request->validated());

        if (! $model) {
            throw new NotFoundHttpException('Listing not found.');
        }

        return new ListingResource($model);
    }
}
