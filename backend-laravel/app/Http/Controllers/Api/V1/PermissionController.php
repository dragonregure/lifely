<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Rbac\StorePermissionRequest;
use App\Http\Requests\Rbac\UpdatePermissionRequest;
use App\Http\Resources\PermissionResource;
use App\Services\RbacService;
use App\Support\Rbac\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Spatie\Permission\Models\Permission;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class PermissionController extends BaseApiController
{
    protected const ALLOWED_INCLUDES = ['roles'];

    public function __construct(private readonly RbacService $rbac)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Permission::class);

        return PermissionResource::collection($this->rbac->permissions(
            $this->canManageSystemRoles($request),
            $this->includes($request)
        ));
    }

    public function store(StorePermissionRequest $request): JsonResponse
    {
        $this->authorize('create', Permission::class);

        return (new PermissionResource($this->rbac->createPermission($request->validated())))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Request $request, Permission $permission): PermissionResource
    {
        $this->authorize('view', $permission);

        $permission = $this->rbac->permissionWithRelations(
            $permission,
            $this->canManageSystemRoles($request),
            $this->includes($request)
        );

        if (! $permission) {
            throw new NotFoundHttpException('Permission not found.');
        }

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

    private function canManageSystemRoles(Request $request): bool
    {
        return $request->user()?->can(Permissions::ROLES_MANAGE_SYSTEM) ?? false;
    }
}
