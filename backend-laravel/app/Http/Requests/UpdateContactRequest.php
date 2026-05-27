<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ResolvesTenantForValidation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateContactRequest extends FormRequest
{
    use ResolvesTenantForValidation;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = $this->tenantIdForValidation();

        return [
            'owner_id' => ['sometimes', 'nullable', 'uuid', Rule::exists('users', 'id')->where('tenant_id', $tenantId)],
            'first_name' => ['sometimes', 'string', 'max:120'],
            'last_name' => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'email', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'status' => ['sometimes', Rule::in(['New', 'Qualified', 'Viewing', 'Negotiating', 'Closed', 'Dormant'])],
            'budget' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'source' => ['sometimes', 'nullable', 'string', 'max:120'],
            'last_contacted_at' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
