<?php

namespace App\Http\Requests\Rbac;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'roles.*' => ['string', Rule::exists('roles', 'name')->where('guard_name', $this->input('guard_name', 'web'))],
            'guard_name' => ['sometimes', 'string', 'max:125'],
        ];
    }
}
