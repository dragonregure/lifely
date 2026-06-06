<?php

namespace App\Http\Requests;

use App\Models\Lead;
use App\Support\Rbac\Permissions;
use Illuminate\Validation\Rule;

class UpdateLeadRequest extends LeadMutationRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user?->can(Permissions::LEADS_UPDATE)
            || $user?->can(Permissions::LEADS_CHANGE_ASSIGNEE)
            || $user?->can(Permissions::LEADS_ASSIGN_TO_SELF)
            || false;
    }

    protected function passedValidation(): void
    {
        $this->authorizeLeadUpdate($this->validated());
    }

    public function rules(): array
    {
        $tenantId = $this->tenantIdForValidation();

        return [
            'contact_id' => ['sometimes', 'uuid', Rule::exists('contacts', 'id')->where('tenant_id', $tenantId)],
            'listing_id' => ['sometimes', 'uuid', Rule::exists('listings', 'id')->where('tenant_id', $tenantId)],
            'user_id' => ['sometimes', 'uuid', Rule::exists('users', 'id')->where('tenant_id', $tenantId)],
            'stage' => ['sometimes', 'integer', Rule::in(Lead::stageValues())],
            'is_active' => ['sometimes', 'boolean'],
            'next_task' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }
}
