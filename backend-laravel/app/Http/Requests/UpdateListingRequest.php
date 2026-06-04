<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ResolvesTenantForValidation;
use App\Models\Listing;
use App\Support\Rbac\Permissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateListingRequest extends FormRequest
{
    use ResolvesTenantForValidation;

    public function authorize(): bool
    {
        return $this->user()?->can(Permissions::LISTINGS_UPDATE) ?? false;
    }

    public function rules(): array
    {
        $tenantId = $this->tenantIdForValidation();

        return [
            'title' => ['sometimes', 'string', 'max:180'],
            'address' => ['sometimes', 'string'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'status' => ['sometimes', 'integer', Rule::in(Listing::statusValues())],
            'bedrooms' => ['sometimes', 'integer', 'min:0', 'max:20'],
            'bathrooms' => ['sometimes', 'integer', 'min:0', 'max:20'],
            'property_type' => ['sometimes', 'integer', Rule::in(Listing::propertyTypeValues())],
            'contact_ids' => ['sometimes', 'array'],
            'contact_ids.*' => ['required', 'uuid', 'distinct', Rule::exists('contacts', 'id')->where('tenant_id', $tenantId)],
            'user_ids' => ['sometimes', 'array'],
            'user_ids.*' => ['required', 'uuid', 'distinct', Rule::exists('users', 'id')->where('tenant_id', $tenantId)],
            'primary_owner_user_id' => ['sometimes', 'nullable', 'uuid', Rule::exists('users', 'id')->where('tenant_id', $tenantId)],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if (! $this->has('primary_owner_user_id')) {
                return;
            }

            if (! $this->has('user_ids')) {
                $validator->errors()->add('primary_owner_user_id', 'Provide user_ids when setting the primary owner.');

                return;
            }

            if (
                $this->filled('primary_owner_user_id')
                && ! in_array($this->input('primary_owner_user_id'), $this->input('user_ids', []), true)
            ) {
                $validator->errors()->add('primary_owner_user_id', 'The primary owner must be one of the assigned users.');
            }
        });
    }
}
