<?php

namespace App\Http\Requests\Rbac;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class UpdateRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var Role|null $role */
        $role = $this->route('role');
        $guardName = $this->input('guard_name', $role?->guard_name ?? 'web');

        return [
            'name' => [
                'sometimes',
                'string',
                'max:125',
                Rule::unique('roles', 'name')->where('guard_name', $guardName)->ignore($role?->id),
            ],
            'guard_name' => ['sometimes', 'string', 'max:125'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')->where('guard_name', $guardName)],
        ];
    }
}
