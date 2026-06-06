<?php

namespace App\Http\Requests;

use App\Models\Lead;
use App\Support\Rbac\Permissions;
use Illuminate\Validation\Rule;

class StoreLeadRequest extends LeadMutationRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permissions::LEADS_CREATE) ?? false;
    }

    protected function passedValidation(): void
    {
        $this->authorizeLeadCreate($this->validated());
    }

    public function rules(): array
    {
        $tenantId = $this->tenantIdForValidation();

        return [
            'contact_id' => ['required', 'uuid', Rule::exists('contacts', 'id')->where('tenant_id', $tenantId)],
            'listing_id' => ['required', 'uuid', Rule::exists('listings', 'id')->where('tenant_id', $tenantId)],
            'user_id' => ['required', 'uuid', Rule::exists('users', 'id')->where('tenant_id', $tenantId)],
            'stage' => ['nullable', 'integer', Rule::in(Lead::stageValues())],
            'source' => ['nullable', 'integer', Rule::in(Lead::sourceValues())],
            'is_active' => ['sometimes', 'boolean'],
            'next_task' => ['nullable', 'string', 'max:255'],
            'due_at' => ['nullable', 'date'],
        ];
    }
}
