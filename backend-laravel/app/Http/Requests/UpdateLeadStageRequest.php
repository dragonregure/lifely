<?php

namespace App\Http\Requests;

use App\Models\Lead;
use App\Support\Rbac\Permissions;
use Illuminate\Validation\Rule;

class UpdateLeadStageRequest extends LeadMutationRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permissions::LEADS_UPDATE) ?? false;
    }

    protected function passedValidation(): void
    {
        $this->authorizeLeadUpdate($this->validated());
    }

    public function rules(): array
    {
        return [
            'stage' => ['required', 'integer', Rule::in(Lead::stageValues())],
        ];
    }
}
