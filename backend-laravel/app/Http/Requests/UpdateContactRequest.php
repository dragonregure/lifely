<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ResolvesTenantForValidation;
use App\Models\Contact;
use App\Support\Rbac\Permissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateContactRequest extends FormRequest
{
    use ResolvesTenantForValidation;

    public function authorize(): bool
    {
        return $this->user()?->can(Permissions::CONTACTS_UPDATE) ?? false;
    }

    public function rules(): array
    {
        $tenantId = $this->tenantIdForValidation();

        return [
            'owner_id' => ['sometimes', 'nullable', 'uuid', Rule::exists('users', 'id')->where('tenant_id', $tenantId)],
            'first_name' => ['sometimes', 'string', 'max:120'],
            'last_name' => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'email', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'status' => ['sometimes', 'boolean'],
            'budget' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'source' => ['sometimes', 'nullable', 'integer', Rule::in(Contact::sourceValues())],
            'last_contacted_at' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
