<?php

namespace App\Http\Requests;

use App\Contracts\LeadRepositoryInterface;
use App\Http\Requests\Concerns\ResolvesTenantForValidation;
use App\Models\Lead;
use App\Models\User;
use App\Support\Rbac\Permissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

abstract class LeadMutationRequest extends FormRequest
{
    use ResolvesTenantForValidation;

    private const ASSIGNEE_FIELDS = ['stage', 'is_active', 'next_task'];
    private const MANUAL_SOURCE_FIELDS = ['contact_id', 'listing_id'];

    private ?Lead $leadDeal = null;

    protected function prepareForValidation(): void
    {
        if ($this->has('stage')) {
            $stage = Lead::stageFromInput($this->input('stage'));

            if ($stage !== null) {
                $this->merge(['stage' => $stage]);
            }
        }

        if (! $this->has('source') || $this->input('source') === null) {
            return;
        }

        $source = Lead::sourceFromInput($this->input('source'));

        if ($source !== null) {
            $this->merge(['source' => $source]);
        }
    }

    protected function leadDeal(): Lead
    {
        if ($this->leadDeal instanceof Lead) {
            return $this->leadDeal;
        }

        $tenantId = $this->tenantIdForAuthorization();
        $routeLead = $this->route('lead');
        $leadId = $routeLead instanceof Lead ? $routeLead->id : $routeLead;

        if (! is_string($leadId)) {
            throw new NotFoundHttpException('Lead not found.');
        }

        $lead = app(LeadRepositoryInterface::class)->find($tenantId, $leadId);

        if (! $lead) {
            throw new NotFoundHttpException('Lead not found.');
        }

        $lead->load([
            'contact' => fn ($query) => $query->where('tenant_id', $tenantId),
            'listing' => fn ($query) => $query->where('tenant_id', $tenantId),
        ]);

        return $this->leadDeal = $lead;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    protected function authorizeLeadUpdate(array $data): void
    {
        $user = $this->user();

        if (! $user instanceof User) {
            throw new HttpException(Response::HTTP_FORBIDDEN);
        }

        $lead = $this->leadDeal();
        $this->denyBlockedLeadMutation($lead, $data);

        if ($user->can(Permissions::SYSTEM_BYPASS)) {
            return;
        }

        if ($this->hasAnyField($data, self::ASSIGNEE_FIELDS)) {
            $this->denyUnless(
                $user->can(Permissions::LEADS_UPDATE) && (string) $lead->user_id === (string) $user->id,
                'Only the assigned user can update lead progress fields.'
            );
        }

        if ($this->hasAnyField($data, self::MANUAL_SOURCE_FIELDS)) {
            $this->denyUnless(
                $user->can(Permissions::LEADS_UPDATE) && (int) $lead->source === Lead::SOURCE_MANUAL_ENTRY,
                'Contact and listing can only be changed for manual-entry leads.'
            );
        }

        if (! array_key_exists('user_id', $data) || (string) $data['user_id'] === (string) $lead->user_id) {
            return;
        }

        $isAssigningToSelf = (string) $data['user_id'] === (string) $user->id;

        $this->denyUnless(
            $user->can(Permissions::LEADS_CHANGE_ASSIGNEE)
                || ($isAssigningToSelf && $user->can(Permissions::LEADS_ASSIGN_TO_SELF)),
            'You do not have permission to change this lead assignee.'
        );
    }

    /**
     * @param  array<string, mixed>  $data
     */
    protected function authorizeLeadCreate(array $data): void
    {
        $user = $this->user();

        if (! $user instanceof User) {
            throw new HttpException(Response::HTTP_FORBIDDEN);
        }

        if ($user->can(Permissions::SYSTEM_BYPASS)) {
            return;
        }

        if (! array_key_exists('user_id', $data)) {
            return;
        }

        $isAssigningToSelf = (string) $data['user_id'] === (string) $user->id;

        $this->denyUnless(
            $user->can(Permissions::LEADS_CHANGE_ASSIGNEE)
                || ($isAssigningToSelf && $user->can(Permissions::LEADS_ASSIGN_TO_SELF)),
            'You do not have permission to set this lead assignee.'
        );
    }

    private function tenantIdForAuthorization(): string
    {
        $tenantId = $this->tenantIdForValidation();

        if (! $tenantId) {
            throw ValidationException::withMessages([
                'tenant_id' => ['Provide tenant context using the X-Tenant-Id header or tenant_id parameter.'],
            ]);
        }

        if ($this->user() && $this->user()->tenant_id !== $tenantId) {
            throw new HttpException(403, 'Tenant context does not match the authenticated user.');
        }

        return $tenantId;
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array<int, string>  $fields
     */
    private function hasAnyField(array $data, array $fields): bool
    {
        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                return true;
            }
        }

        return false;
    }

    private function denyUnless(bool $condition, string $message): void
    {
        if (! $condition) {
            throw new HttpException(Response::HTTP_FORBIDDEN, $message);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function denyBlockedLeadMutation(Lead $lead, array $data): void
    {
        if (
            $lead->isClosedStage()
            && array_key_exists('stage', $data)
            && (int) $data['stage'] !== (int) $lead->stage
        ) {
            throw ValidationException::withMessages([
                'stage' => ['Closed lead cards cannot move to another stage.'],
            ]);
        }

        if (! $lead->hasBlockingProblem()) {
            return;
        }

        $blockedFields = array_diff(array_keys($data), ['is_active']);

        if ($blockedFields !== []) {
            throw ValidationException::withMessages([
                'lead' => ['Lead cards with a sold listing or inactive contact can only change active status.'],
            ]);
        }
    }
}
