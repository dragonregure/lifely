<?php

namespace App\Http\Requests;

use App\Models\Listing;
use App\Support\Rbac\Permissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreListingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permissions::LISTINGS_CREATE) ?? false;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:180'],
            'address' => ['required', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'status' => ['nullable', 'integer', Rule::in(Listing::statusValues())],
            'bedrooms' => ['nullable', 'integer', 'min:0', 'max:20'],
            'bathrooms' => ['nullable', 'integer', 'min:0', 'max:20'],
            'property_type' => ['nullable', 'integer', Rule::in(Listing::propertyTypeValues())],
        ];
    }
}
