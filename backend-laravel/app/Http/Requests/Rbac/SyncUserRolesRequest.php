<?php

namespace App\Http\Requests\Rbac;

use App\Models\Role;
use App\Support\Rbac\Permissions;
use App\Support\TenantResolver;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class SyncUserRolesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'roles' => ['required', 'array'],
            'roles.*' => ['string'],
            'guard_name' => ['sometimes', 'string', 'max:125'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $tenantId = app(TenantResolver::class)->resolve($this);
            $roles = $this->input('roles', []);
            $roleNames = is_array($roles) ? array_values(array_unique($roles)) : [];

            if (! is_string($tenantId) || $roleNames === []) {
                return;
            }

            $availableCount = Role::query()
                ->visibleToTenant($tenantId)
                ->where('guard_name', $this->input('guard_name', 'web'))
                ->whereIn('name', $roleNames)
                ->distinct()
                ->count('name');

            if ($availableCount !== count($roleNames)) {
                $validator->errors()->add('roles', 'One or more selected roles are not available to this tenant.');
            }

            if ($this->user()?->can(Permissions::ROLES_MANAGE_SYSTEM)) {
                return;
            }

            $blockedRoles = Role::query()
                ->visibleToTenant($tenantId)
                ->where('guard_name', $this->input('guard_name', 'web'))
                ->whereIn('name', $roleNames)
                ->whereHas('permissions', function ($query): void {
                    $query->whereIn('name', Permissions::systemOnly());
                })
                ->pluck('name')
                ->all();

            if ($blockedRoles !== []) {
                $validator->errors()->add('roles', 'System roles require roles.manage_system.');
            }
        });
    }
}
