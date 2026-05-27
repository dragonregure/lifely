<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\ListingRepositoryInterface;
use App\Http\Requests\StoreListingRequest;
use App\Http\Resources\ListingResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class ListingController extends BaseApiController
{
    public function __construct(private readonly ListingRepositoryInterface $listings)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return ListingResource::collection($this->listings->all($this->tenantId($request)));
    }

    public function store(StoreListingRequest $request): JsonResponse
    {
        return (new ListingResource($this->listings->create($this->tenantId($request), $request->validated())))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }
}
