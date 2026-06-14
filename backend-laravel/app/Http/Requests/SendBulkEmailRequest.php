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
            'listing_id' => ['nullable', 'uuid', Rule::exists('listings', 'id')->where('tenant_id', $tenantId)],
            'all_active_contacts' => ['sometimes', 'boolean'],
            'contact_ids' => [Rule::requiredIf(fn (): bool => ! $this->boolean('all_active_contacts')), 'array', 'min:1'],
            'contact_ids.*' => ['required', 'uuid', Rule::exists('contacts', 'id')->where('tenant_id', $tenantId)],
            'included_contact_ids' => [Rule::requiredIf(fn (): bool => $this->boolean('all_active_contacts')), 'array', 'min:1'],
            'included_contact_ids.*' => ['required', 'uuid', Rule::exists('contacts', 'id')->where('tenant_id', $tenantId)],
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

            $includedContactIds = collect($this->input('included_contact_ids', []))
                ->filter(fn (mixed $contactId): bool => is_string($contactId))
                ->unique()
                ->values()
                ->all();

            if ($includedContactIds === []) {
                return;
            }

            $activeIncludedCount = Contact::query()
                ->where('tenant_id', $this->tenantIdForValidation())
                ->where('status', true)
                ->whereIn('id', $includedContactIds)
                ->count();

            if ($activeIncludedCount !== count($includedContactIds)) {
                $validator->errors()->add('included_contact_ids', 'Only active contacts can be selected for an active bulk email.');
            }
        });
    }
}
