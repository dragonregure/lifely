<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ResolvesTenantForValidation;
use App\Support\Rbac\Permissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreContactRequest extends FormRequest
{
    use ResolvesTenantForValidation;

    public function authorize(): bool
    {
        return $this->user()?->can(Permissions::CONTACTS_CREATE) ?? false;
    }

    public function rules(): array
    {
        $tenantId = $this->tenantIdForValidation();

        return [
            'owner_id' => ['nullable', 'uuid', Rule::exists('users', 'id')->where('tenant_id', $tenantId)],
            'first_name' => ['required', 'string', 'max:120'],
            'last_name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'status' => ['nullable', Rule::in(['New', 'Qualified', 'Viewing', 'Negotiating', 'Closed', 'Dormant'])],
            'budget' => ['nullable', 'numeric', 'min:0'],
            'source' => ['nullable', 'string', 'max:120'],
            'last_contacted_at' => ['nullable', 'date'],
        ];
    }
}
