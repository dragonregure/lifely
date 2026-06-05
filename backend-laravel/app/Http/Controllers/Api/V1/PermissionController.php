<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Rbac\StorePermissionRequest;
use App\Http\Requests\Rbac\UpdatePermissionRequest;
use App\Http\Resources\PermissionResource;
use App\Services\RbacService;
use App\Support\Rbac\Permissions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Spatie\Permission\Models\Permission;
use Symfony\Component\HttpFoundation\Response;

class PermissionController extends BaseApiController
{
    protected const ALLOWED_INCLUDES = ['roles'];

    public function __construct(private readonly RbacService $rbac)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Permission::class);

        $query = Permission::query()->orderBy('name');

        if (! $request->user()?->can(Permissions::ROLES_MANAGE_SYSTEM)) {
            $query->whereNotIn('name', Permissions::systemOnly());
        }

        $query->with($this->relations($request));

        return PermissionResource::collection($query->get());
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

        return new PermissionResource($permission->load($this->relations($request)));
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

    private function relations(Request $request): array
    {
        if (! in_array('roles', $this->includes($request), true)) {
            return [];
        }

        return [
            'roles' => function (BelongsToMany $query) use ($request): void {
                if (! $request->user()?->can(Permissions::ROLES_MANAGE_SYSTEM)) {
                    $query->whereDoesntHave('permissions', function (Builder $query): void {
                        $query->whereIn('name', Permissions::systemOnly());
                    });
                }

                $query->orderBy('tenant_id')->orderBy('name');
            },
        ];
    }
}
