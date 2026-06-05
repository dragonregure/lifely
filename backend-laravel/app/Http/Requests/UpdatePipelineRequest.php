<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ResolvesTenantForValidation;
use App\Models\Pipeline;
use App\Support\Rbac\Permissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePipelineRequest extends FormRequest
{
    use ResolvesTenantForValidation;

    public function authorize(): bool
    {
        $user = $this->user();

        return $user?->can(Permissions::PIPELINE_UPDATE)
            || $user?->can(Permissions::PIPELINE_CHANGE_ASSIGNEE)
            || $user?->can(Permissions::PIPELINE_ASSIGN_TO_SELF)
            || false;
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('stage')) {
            return;
        }

        $stage = Pipeline::stageFromInput($this->input('stage'));

        if ($stage !== null) {
            $this->merge(['stage' => $stage]);
        }
    }

    public function rules(): array
    {
        $tenantId = $this->tenantIdForValidation();

        return [
            'contact_id' => ['sometimes', 'uuid', Rule::exists('contacts', 'id')->where('tenant_id', $tenantId)],
            'listing_id' => ['sometimes', 'uuid', Rule::exists('listings', 'id')->where('tenant_id', $tenantId)],
            'user_id' => ['sometimes', 'uuid', Rule::exists('users', 'id')->where('tenant_id', $tenantId)],
            'stage' => ['sometimes', 'integer', Rule::in(Pipeline::stageValues())],
            'is_active' => ['sometimes', 'boolean'],
            'next_task' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }
}
