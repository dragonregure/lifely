<?php

namespace App\Http\Requests;

use App\Models\Reference;
use App\Support\Rbac\Permissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreReferenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tenant_id' => ['sometimes', 'nullable', 'uuid', Rule::exists('tenants', 'id')],
            'group' => ['required', 'string', 'max:120'],
            'key' => ['required', 'string', 'max:120'],
            'value' => ['nullable', 'string', 'max:255'],
            'type' => ['sometimes', 'string', Rule::in(['string', 'int', 'float', 'double', 'bool', 'array', 'object', 'null'])],
            'meta' => ['sometimes', 'nullable', 'array'],
            'status' => ['sometimes', Rule::in([Reference::STATUS_ACTIVE, Reference::STATUS_INACTIVE])],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->has('tenant_id') && $this->input('tenant_id') === null && ! $this->user()?->hasPermissionTo(Permissions::REFERENCES_MANAGE_SYSTEM)) {
                $validator->errors()->add('tenant_id', 'Only System Admin can create system references.');
            }
        });
    }
}
