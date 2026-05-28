<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Rbac\StorePermissionRequest;
use App\Http\Requests\Rbac\UpdatePermissionRequest;
use App\Http\Resources\PermissionResource;
use App\Services\RbacService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response as HttpResponse;
use Spatie\Permission\Models\Permission;
use Symfony\Component\HttpFoundation\Response;

class PermissionController extends BaseApiController
{
    public function __construct(private readonly RbacService $rbac)
    {
    }

    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Permission::class);

        return PermissionResource::collection(Permission::query()->orderBy('name')->get());
    }

    public function store(StorePermissionRequest $request): JsonResponse
    {
        $this->authorize('create', Permission::class);

        return (new PermissionResource($this->rbac->createPermission($request->validated())))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Permission $permission): PermissionResource
    {
        $this->authorize('view', $permission);

        return new PermissionResource($permission);
    }

    public function update(UpdatePermissionRequest $request, Permission $permission): PermissionResource
    {
        $this->authorize('update', $permission);

        return new PermissionResource($this->rbac->updatePermission($permission, $request->validated()));
    }

    public function destroy(Permission $permission): HttpResponse
    {
        $this->authorize('delete', $permission);

        $this->rbac->deletePermission($permission);

        return response()->noContent();
    }
}
