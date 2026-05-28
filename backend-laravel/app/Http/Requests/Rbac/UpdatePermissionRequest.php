<?php

namespace App\Http\Requests\Rbac;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;

class UpdatePermissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var Permission|null $permission */
        $permission = $this->route('permission');
        $guardName = $this->input('guard_name', $permission?->guard_name ?? 'web');

        return [
            'name' => [
                'sometimes',
                'string',
                'max:125',
                Rule::unique('permissions', 'name')->where('guard_name', $guardName)->ignore($permission?->id),
            ],
            'guard_name' => ['sometimes', 'string', 'max:125'],
        ];
    }
}
