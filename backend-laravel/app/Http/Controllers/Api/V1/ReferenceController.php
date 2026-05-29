<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\ReferenceRepositoryInterface;
use App\Http\Requests\StoreReferenceRequest;
use App\Http\Requests\UpdateReferenceRequest;
use App\Http\Resources\ReferenceResource;
use App\Models\Reference;
use App\Support\DataTables\DataTableQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response as HttpResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ReferenceController extends BaseApiController
{
    public function __construct(private readonly ReferenceRepositoryInterface $references)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Reference::class);

        return ReferenceResource::collection($this->references->paginate(
            $this->tenantId($request),
            DataTableQuery::fromRequest($request, ['group', 'type', 'status', 'scope'])
        ));
    }

    public function referenceTypes(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Reference::class);

        return response()->json([
            'data' => $this->references->referenceTypeOptions($this->tenantId($request)),
        ]);
    }

    public function store(StoreReferenceRequest $request): JsonResponse
    {
        $this->authorize('create', Reference::class);

        return (new ReferenceResource($this->references->create($this->tenantId($request), $request->validated())))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Request $request, string $reference): ReferenceResource
    {
        $model = $this->findReference($request, $reference);
        $this->authorize('view', $model);

        return new ReferenceResource($model);
    }

    public function update(UpdateReferenceRequest $request, string $reference): ReferenceResource
    {
        $model = $this->findReference($request, $reference);
        $this->authorize('update', $model);

        $updated = $this->references->update($this->tenantId($request), $reference, $request->validated());

        if (! $updated) {
            throw new NotFoundHttpException('Reference not found.');
        }

        return new ReferenceResource($updated);
    }

    public function destroy(Request $request, string $reference): HttpResponse
    {
        $model = $this->findReference($request, $reference);
        $this->authorize('delete', $model);

        if (! $this->references->delete($this->tenantId($request), $reference)) {
            throw new NotFoundHttpException('Reference not found.');
        }

        return response()->noContent();
    }

    private function findReference(Request $request, string $reference): Reference
    {
        $model = $this->references->findVisible($this->tenantId($request), $reference);

        if (! $model) {
            throw new NotFoundHttpException('Reference not found.');
        }

        return $model;
    }
}
