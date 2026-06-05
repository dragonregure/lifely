<?php

namespace App\Http\Requests\Rbac;

use App\Support\Rbac\Permissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SyncUserPermissionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'permissions' => ['required', 'array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')->where('guard_name', $this->input('guard_name', 'web'))],
            'guard_name' => ['sometimes', 'string', 'max:125'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->user()?->hasSystemBypass()) {
                return;
            }

            $permissions = $this->input('permissions', []);

            if (! is_array($permissions)) {
                return;
            }

            $blocked = array_intersect($permissions, [
                Permissions::PERMISSIONS_CREATE,
                Permissions::PERMISSIONS_UPDATE,
                Permissions::PERMISSIONS_DELETE,
            ]);

            if ($blocked !== []) {
                $validator->errors()->add('permissions', 'Permission create, update, and delete capabilities are system-owned.');
            }
        });
    }
}
