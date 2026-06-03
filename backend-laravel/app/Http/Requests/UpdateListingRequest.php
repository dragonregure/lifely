<?php

namespace App\Http\Requests;

use App\Models\Listing;
use App\Support\Rbac\Permissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateListingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permissions::LISTINGS_UPDATE) ?? false;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:180'],
            'address' => ['sometimes', 'string'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'status' => ['sometimes', 'integer', Rule::in(Listing::statusValues())],
            'bedrooms' => ['sometimes', 'integer', 'min:0', 'max:20'],
            'bathrooms' => ['sometimes', 'integer', 'min:0', 'max:20'],
            'property_type' => ['sometimes', 'integer', Rule::in(Listing::propertyTypeValues())],
        ];
    }
}
