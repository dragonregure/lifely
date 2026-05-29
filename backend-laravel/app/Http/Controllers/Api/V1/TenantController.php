<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\TenantRepositoryInterface;
use App\Http\Resources\MemberResource;
use App\Http\Resources\TenantResource;
use App\Support\Rbac\Permissions;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class TenantController extends BaseApiController
{
    public function __construct(private readonly TenantRepositoryInterface $tenants)
    {
    }

    public function show(Request $request): TenantResource
    {
        $this->authorize(Permissions::TENANT_VIEW);

        $tenant = $this->tenants->find($this->tenantId($request));

        if (! $tenant) {
            throw new NotFoundHttpException('Tenant not found.');
        }

        return new TenantResource($tenant);
    }

    public function members(Request $request): AnonymousResourceCollection
    {
        $this->authorize(Permissions::USERS_VIEW);

        return MemberResource::collection($this->tenants->members($this->tenantId($request)));
    }
}
