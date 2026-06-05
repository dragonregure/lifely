<?php

namespace App\Http\Requests;

use App\Models\Pipeline;
use App\Support\Rbac\Permissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePipelineStageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permissions::PIPELINE_UPDATE) ?? false;
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
        return [
            'stage' => ['required', 'integer', Rule::in(Pipeline::stageValues())],
        ];
    }
}
