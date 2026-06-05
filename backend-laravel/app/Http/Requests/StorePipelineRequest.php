<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ResolvesTenantForValidation;
use App\Models\Pipeline;
use App\Support\Rbac\Permissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePipelineRequest extends FormRequest
{
    use ResolvesTenantForValidation;

    public function authorize(): bool
    {
        return $this->user()?->can(Permissions::PIPELINE_CREATE) ?? false;
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('stage') || $this->input('stage') === null) {
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
            'contact_id' => ['required', 'uuid', Rule::exists('contacts', 'id')->where('tenant_id', $tenantId)],
            'listing_id' => ['required', 'uuid', Rule::exists('listings', 'id')->where('tenant_id', $tenantId)],
            'user_id' => ['required', 'uuid', Rule::exists('users', 'id')->where('tenant_id', $tenantId)],
            'stage' => ['nullable', 'integer', Rule::in(Pipeline::stageValues())],
            'is_active' => ['sometimes', 'boolean'],
            'next_task' => ['nullable', 'string', 'max:255'],
            'due_at' => ['nullable', 'date'],
        ];
    }
}
