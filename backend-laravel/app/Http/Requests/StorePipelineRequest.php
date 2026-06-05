<?php

namespace App\Http\Requests;

use App\Models\Pipeline;
use App\Support\Rbac\Permissions;
use Illuminate\Validation\Rule;

class StorePipelineRequest extends PipelineMutationRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permissions::PIPELINE_CREATE) ?? false;
    }

    public function rules(): array
    {
        $tenantId = $this->tenantIdForValidation();

        return [
            'contact_id' => ['required', 'uuid', Rule::exists('contacts', 'id')->where('tenant_id', $tenantId)],
            'listing_id' => ['required', 'uuid', Rule::exists('listings', 'id')->where('tenant_id', $tenantId)],
            'user_id' => ['required', 'uuid', Rule::exists('users', 'id')->where('tenant_id', $tenantId)],
            'stage' => ['nullable', 'integer', Rule::in(Pipeline::stageValues())],
            'source' => ['nullable', 'integer', Rule::in(Pipeline::sourceValues())],
            'is_active' => ['sometimes', 'boolean'],
            'next_task' => ['nullable', 'string', 'max:255'],
            'due_at' => ['nullable', 'date'],
        ];
    }
}
