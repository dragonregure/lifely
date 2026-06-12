<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ResolvesTenantForValidation;
use App\Models\Contact;
use App\Support\Rbac\Permissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

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
            'all_active_contacts' => ['sometimes', 'boolean'],
            'contact_ids' => [Rule::requiredIf(fn (): bool => ! $this->boolean('all_active_contacts')), 'array', 'min:1'],
            'contact_ids.*' => ['required', 'uuid', Rule::exists('contacts', 'id')->where('tenant_id', $tenantId)],
            'excluded_contact_ids' => ['sometimes', 'array'],
            'excluded_contact_ids.*' => ['required', 'uuid', Rule::exists('contacts', 'id')->where('tenant_id', $tenantId)],
            'subject' => ['required', 'string', 'max:180'],
            'body' => ['required', 'string', 'max:10000'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (! $this->boolean('all_active_contacts')) {
                return;
            }

            $excludedContactIds = collect($this->input('excluded_contact_ids', []))
                ->filter(fn (mixed $contactId): bool => is_string($contactId))
                ->unique()
                ->values()
                ->all();

            $query = Contact::query()
                ->where('tenant_id', $this->tenantIdForValidation())
                ->where('status', true);

            if ($excludedContactIds !== []) {
                $query->whereNotIn('id', $excludedContactIds);
            }

            if (! $query->exists()) {
                $validator->errors()->add('all_active_contacts', 'At least one active contact must be selected.');
            }
        });
    }
}
