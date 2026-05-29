<?php

namespace App\Http\Requests;

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
            'status' => ['nullable', Rule::in(['Available', 'Reserved', 'Under Contract', 'Sold'])],
            'bedrooms' => ['nullable', 'integer', 'min:0', 'max:20'],
            'bathrooms' => ['nullable', 'integer', 'min:0', 'max:20'],
            'property_type' => ['nullable', Rule::in(['House', 'Condo', 'Townhome', 'Land'])],
        ];
    }
}
