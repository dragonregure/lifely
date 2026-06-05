<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Rbac\StoreRoleRequest;
use App\Http\Requests\Rbac\UpdateRoleRequest;
use App\Http\Resources\RoleResource;
use App\Models\Role;
use App\Services\RbacService;
use App\Support\Rbac\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response as HttpResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class RoleController extends BaseApiController
{
    protected const ALLOWED_INCLUDES = ['permissions'];

    public function __construct(private readonly RbacService $rbac)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Role::class);

        return RoleResource::collection($this->rbac->roles(
            $this->tenantId($request),
            $this->canManageSystemRoles($request),
            $this->includes($request)
        ));
    }

    public function store(StoreRoleRequest $request): JsonResponse
    {
        $this->authorize('create', Role::class);

        return (new RoleResource($this->rbac->createRole($this->tenantId($request), $request->validated())))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Request $request, string $role): RoleResource
    {
        $model = $this->findRole($request, $role);
        $this->authorize('view', $model);

        return new RoleResource($model);
    }

    public function update(UpdateRoleRequest $request, string $role): RoleResource
    {
        $model = $this->findRole($request, $role);
        $this->authorize('update', $model);

        return new RoleResource($this->rbac->updateRole($this->tenantId($request), $model, $request->validated()));
    }

    public function destroy(Request $request, string $role): HttpResponse
    {
        $model = $this->findRole($request, $role);
        $this->authorize('delete', $model);

        $this->rbac->deleteRole($model);

        return response()->noContent();
    }

    private function findRole(Request $request, string $role): Role
    {
        $model = $this->rbac->findRole(
            $this->tenantId($request),
            $role,
            $this->canManageSystemRoles($request),
            $this->includes($request)
        );

        if (! $model) {
            throw new NotFoundHttpException('Role not found.');
        }

        return $model;
    }

    private function canManageSystemRoles(Request $request): bool
    {
        return $request->user()?->can(Permissions::ROLES_MANAGE_SYSTEM) ?? false;
    }
}
