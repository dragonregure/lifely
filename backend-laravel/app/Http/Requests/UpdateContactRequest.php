<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ResolvesTenantForValidation;
use App\Models\Contact;
use App\Models\Reference;
use App\Support\Rbac\Permissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

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
            'status_id' => ['sometimes', 'uuid', $this->contactStatusRule($tenantId)],
            'budget' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'source' => ['sometimes', 'nullable', 'string', 'max:120'],
            'last_contacted_at' => ['sometimes', 'nullable', 'date'],
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
