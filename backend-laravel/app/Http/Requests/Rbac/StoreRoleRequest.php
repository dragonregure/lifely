<?php

namespace App\Http\Requests\Rbac;

use App\Support\Rbac\Permissions;
use App\Support\TenantResolver;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tenant_id' => ['sometimes', 'nullable', 'uuid', Rule::exists('tenants', 'id')],
            'name' => ['required', 'string', 'max:125'],
            'guard_name' => ['sometimes', 'string', 'max:125'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')->where('guard_name', $this->input('guard_name', 'web'))],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->has('tenant_id') && $this->input('tenant_id') === null && ! $this->user()?->can(Permissions::ROLES_MANAGE_SYSTEM)) {
                $validator->errors()->add('tenant_id', 'Only users with roles.manage_system can create system roles.');
            }

            $tenantId = app(TenantResolver::class)->resolve($this);

            if ($this->filled('tenant_id') && $this->input('tenant_id') !== $tenantId) {
                $validator->errors()->add('tenant_id', 'Role tenant does not match the current tenant context.');
            }

            $permissions = $this->input('permissions', []);

            if ($this->user()?->can(Permissions::ROLES_MANAGE_SYSTEM) || ! is_array($permissions)) {
                return;
            }

            $blocked = array_intersect($permissions, Permissions::systemOnly());

            if ($blocked !== []) {
                $validator->errors()->add('permissions', 'System permissions require roles.manage_system.');
            }
        });
    }
}
