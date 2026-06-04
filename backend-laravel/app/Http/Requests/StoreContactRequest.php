<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ResolvesTenantForValidation;
use App\Models\Contact;
use App\Models\Reference;
use App\Support\Rbac\Permissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

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
            'status_id' => ['sometimes', 'uuid', $this->contactStatusRule($tenantId)],
            'budget' => ['nullable', 'numeric', 'min:0'],
            'source' => ['nullable', 'string', 'max:120'],
            'last_contacted_at' => ['nullable', 'date'],
        ];
    }

    private function contactStatusRule(string $tenantId): Exists
    {
        return Rule::exists('references', 'id')
            ->where('group', Contact::STATUS_REFERENCE_GROUP)
            ->where('status', Reference::STATUS_ACTIVE)
            ->whereNull('deleted_at')
            ->where(function ($query) use ($tenantId): void {
                $query->whereNull('tenant_id')->orWhere('tenant_id', $tenantId);
            });
    }
}
