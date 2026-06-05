<?php

namespace App\Http\Requests\Rbac;

use App\Models\Role;
use App\Support\TenantResolver;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $routeRole = $this->route('role');
        $role = $routeRole instanceof Role ? $routeRole : Role::query()->find($routeRole);
        $guardName = $this->input('guard_name', $role?->guard_name ?? 'web');

        return [
            'tenant_id' => ['sometimes', 'nullable', 'uuid', Rule::exists('tenants', 'id')],
            'name' => [
                'sometimes',
                'string',
                'max:125',
            ],
            'guard_name' => ['sometimes', 'string', 'max:125'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')->where('guard_name', $guardName)],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->has('tenant_id') && $this->input('tenant_id') === null && ! $this->user()?->hasSystemBypass()) {
                $validator->errors()->add('tenant_id', 'Only System Admin can promote roles to system scope.');
            }

            $tenantId = app(TenantResolver::class)->resolve($this);

            if ($this->filled('tenant_id') && $this->input('tenant_id') !== $tenantId) {
                $validator->errors()->add('tenant_id', 'Role tenant does not match the current tenant context.');
            }
        });
    }
}
