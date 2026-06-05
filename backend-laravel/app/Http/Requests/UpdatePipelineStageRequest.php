<?php

namespace App\Http\Requests;

use App\Models\Pipeline;
use App\Support\Rbac\Permissions;
use Illuminate\Validation\Rule;

class UpdatePipelineStageRequest extends PipelineMutationRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permissions::PIPELINE_UPDATE) ?? false;
    }

    protected function passedValidation(): void
    {
        $this->authorizePipelineUpdate($this->validated());
    }

    public function rules(): array
    {
        return [
            'stage' => ['required', 'integer', Rule::in(Pipeline::stageValues())],
        ];
    }
}
