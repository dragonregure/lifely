<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ResolvesTenantForValidation;
use App\Models\Listing;
use App\Support\Rbac\Permissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreListingRequest extends FormRequest
{
    use ResolvesTenantForValidation;

    public function authorize(): bool
    {
        return $this->user()?->can(Permissions::LISTINGS_CREATE) ?? false;
    }

    public function rules(): array
    {
        $tenantId = $this->tenantIdForValidation();

        return [
            'title' => ['required', 'string', 'max:180'],
            'address' => ['required', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'status' => ['nullable', 'integer', Rule::in(Listing::statusValues())],
            'bedrooms' => ['nullable', 'integer', 'min:0', 'max:20'],
            'bathrooms' => ['nullable', 'integer', 'min:0', 'max:20'],
            'property_type' => ['nullable', 'integer', Rule::in(Listing::propertyTypeValues())],
            'contact_ids' => ['nullable', 'array'],
            'contact_ids.*' => ['required', 'uuid', 'distinct', Rule::exists('contacts', 'id')->where('tenant_id', $tenantId)],
            'user_ids' => ['nullable', 'array'],
            'user_ids.*' => ['required', 'uuid', 'distinct', Rule::exists('users', 'id')->where('tenant_id', $tenantId)],
            'primary_owner_user_id' => ['nullable', 'uuid', Rule::exists('users', 'id')->where('tenant_id', $tenantId)],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if (! $this->filled('primary_owner_user_id')) {
                return;
            }

            if (! in_array($this->input('primary_owner_user_id'), $this->input('user_ids', []), true)) {
                $validator->errors()->add('primary_owner_user_id', 'The primary owner must be one of the assigned users.');
            }
        });
    }
}
