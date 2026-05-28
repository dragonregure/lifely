<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\Rbac\SyncUserPermissionsRequest;
use App\Http\Requests\Rbac\SyncUserRolesRequest;
use App\Http\Resources\MemberResource;
use App\Http\Resources\UserPermissionsResource;
use App\Models\User;
use App\Services\RbacService;
use Illuminate\Http\Request;

class UserAccessController extends BaseApiController
{
    public function __construct(private readonly RbacService $rbac)
    {
    }

    public function syncRoles(SyncUserRolesRequest $request, User $user): MemberResource
    {
        $this->authorize('assignRoles', $user);
        $this->ensureSameTenant($request, $user);

        return new MemberResource($this->rbac->syncUserRoles($user, $request->validated('roles')));
    }

    public function syncPermissions(SyncUserPermissionsRequest $request, User $user): MemberResource
    {
        $this->authorize('assignPermissions', $user);
        $this->ensureSameTenant($request, $user);

        return new MemberResource($this->rbac->syncUserPermissions($user, $request->validated('permissions')));
    }

    public function mePermissions(Request $request): UserPermissionsResource
    {
        return new UserPermissionsResource($request->user()->load('roles.permissions', 'permissions'));
    }

    private function ensureSameTenant(Request $request, User $user): void
    {
        $tenantId = $this->tenantId($request);

        if ($user->tenant_id !== $tenantId) {
            abort(404, 'User not found.');
        }
    }
}
