<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ResolvesTenantForValidation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePipelineDealRequest extends FormRequest
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
            'contact_id' => ['required', 'uuid', Rule::exists('contacts', 'id')->where('tenant_id', $tenantId)],
            'listing_id' => ['required', 'uuid', Rule::exists('listings', 'id')->where('tenant_id', $tenantId)],
            'user_id' => ['required', 'uuid', Rule::exists('users', 'id')->where('tenant_id', $tenantId)],
            'stage' => ['nullable', Rule::in(['New lead', 'Contacted', 'Viewing', 'Offer', 'Closing'])],
            'value' => ['required', 'numeric', 'min:0'],
            'next_task' => ['nullable', 'string', 'max:255'],
            'due_at' => ['nullable', 'date'],
        ];
    }
}
