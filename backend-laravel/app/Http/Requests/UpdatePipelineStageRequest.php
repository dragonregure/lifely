<?php

namespace App\Http\Requests;

use App\Support\Rbac\Permissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePipelineStageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permissions::PIPELINE_UPDATE) ?? false;
    }

    public function rules(): array
    {
        return [
            'stage' => ['required', Rule::in(['New lead', 'Contacted', 'Viewing', 'Offer', 'Closing'])],
        ];
    }
}
