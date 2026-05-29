<?php

namespace App\Http\Requests;

use App\Models\Reference;
use App\Support\Rbac\Permissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateReferenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        if ($this->isSystemReferenceWrite()) {
            return $this->user()?->can(Permissions::REFERENCES_MANAGE_SYSTEM) ?? false;
        }

        return $this->user()?->can(Permissions::REFERENCES_UPDATE) ?? false;
    }

    public function rules(): array
    {
        return [
            'tenant_id' => ['sometimes', 'nullable', 'uuid', Rule::exists('tenants', 'id')],
            'group' => ['sometimes', 'string', 'max:120'],
            'key' => ['sometimes', 'string', 'max:120'],
            'value' => ['sometimes', 'nullable', 'string', 'max:255'],
            'type' => ['sometimes', 'string', Rule::in(['string', 'int', 'float', 'double', 'bool', 'array', 'object', 'null'])],
            'meta' => ['sometimes', 'nullable', 'array'],
            'status' => ['sometimes', Rule::in([Reference::STATUS_ACTIVE, Reference::STATUS_INACTIVE])],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (! $this->isSystemReferenceWrite()) {
                return;
            }

            if (! $this->user()?->can(Permissions::REFERENCES_MANAGE_SYSTEM)) {
                $validator->errors()->add('tenant_id', 'Only System Admin can update system references.');
            }
        });
    }

    private function isSystemReferenceWrite(): bool
    {
        if ($this->has('tenant_id') && $this->input('tenant_id') === null) {
            return true;
        }

        $referenceId = $this->route('reference');

        if (! is_string($referenceId)) {
            return false;
        }

        return Reference::query()
            ->whereKey($referenceId)
            ->whereNull('tenant_id')
            ->exists();
    }
}
