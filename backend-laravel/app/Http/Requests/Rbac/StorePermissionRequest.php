<?php

namespace App\Http\Requests\Rbac;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePermissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:125', Rule::unique('permissions', 'name')->where('guard_name', $this->input('guard_name', 'web'))],
            'guard_name' => ['sometimes', 'string', 'max:125'],
        ];
    }
}
