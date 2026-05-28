<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Rbac\StoreRoleRequest;
use App\Http\Requests\Rbac\UpdateRoleRequest;
use App\Http\Resources\RoleResource;
use App\Services\RbacService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response as HttpResponse;
use Spatie\Permission\Models\Role;
use Symfony\Component\HttpFoundation\Response;

class RoleController extends BaseApiController
{
    public function __construct(private readonly RbacService $rbac)
    {
    }

    public function index(): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Role::class);

        return RoleResource::collection(Role::query()->with('permissions')->orderBy('name')->get());
    }

    public function store(StoreRoleRequest $request): JsonResponse
    {
        $this->authorize('create', Role::class);

        return (new RoleResource($this->rbac->createRole($request->validated())))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Role $role): RoleResource
    {
        $this->authorize('view', $role);

        return new RoleResource($role->load('permissions'));
    }

    public function update(UpdateRoleRequest $request, Role $role): RoleResource
    {
        $this->authorize('update', $role);

        return new RoleResource($this->rbac->updateRole($role, $request->validated()));
    }

    public function destroy(Role $role): HttpResponse
    {
        $this->authorize('delete', $role);

        $this->rbac->deleteRole($role);

        return response()->noContent();
    }
}
