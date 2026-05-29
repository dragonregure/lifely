<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ResolvesTenantForValidation;
use App\Support\Rbac\Permissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SendBulkEmailRequest extends FormRequest
{
    use ResolvesTenantForValidation;

    public function authorize(): bool
    {
        return $this->user()?->can(Permissions::EMAIL_CAMPAIGNS_CREATE) ?? false;
    }

    public function rules(): array
    {
        $tenantId = $this->tenantIdForValidation();

        return [
            'user_id' => ['nullable', 'uuid', Rule::exists('users', 'id')->where('tenant_id', $tenantId)],
            'contact_ids' => ['required', 'array', 'min:1'],
            'contact_ids.*' => ['required', 'uuid', Rule::exists('contacts', 'id')->where('tenant_id', $tenantId)],
            'subject' => ['required', 'string', 'max:180'],
            'body' => ['required', 'string', 'max:10000'],
        ];
    }
}
