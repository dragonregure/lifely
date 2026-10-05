<?php

namespace App\Services;

use App\Contracts\ContactServiceInterface;
use App\Contracts\LeadRepositoryInterface;
use App\Contracts\LeadServiceInterface;
use App\Contracts\ListingServiceInterface;
use App\Contracts\TenantServiceInterface;
use App\Models\Lead;
use App\Support\DataTables\DataTableQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class LeadService implements LeadServiceInterface
{
    public function __construct(
        private readonly LeadRepositoryInterface $leads,
        private readonly ContactServiceInterface $contacts,
        private readonly ListingServiceInterface $listings,
        private readonly TenantServiceInterface $tenants,
    ) {
    }

    public function all(string $tenantId): Collection
    {
        return $this->leads->all($tenantId);
    }

    public function paginate(string $tenantId, DataTableQuery $dataTable, array $includes = []): LengthAwarePaginator
    {
        return $this->leads->paginate($tenantId, $dataTable, $includes);
    }

    public function find(string $tenantId, string $leadId): ?Lead
    {
        return $this->leads->find($tenantId, $leadId);
    }

    public function create(string $tenantId, array $data): Lead
    {
        $this->ensureTenantRelations($tenantId, $data);
        $lead = $this->leads->create($tenantId, $data);
        $this->markListingSoldWhenClosedWon($tenantId, $lead);

        return $lead;
    }

    public function update(string $tenantId, string $leadId, array $data): ?Lead
    {
        $this->ensureTenantRelations($tenantId, $data);
        $lead = $this->leads->update($tenantId, $leadId, $data);

        if ($lead) {
            $this->markListingSoldWhenClosedWon($tenantId, $lead);
        }

        return $lead;
    }

    public function updateStage(string $tenantId, string $leadId, int $stage): ?Lead
    {
        $lead = $this->leads->updateStage($tenantId, $leadId, $stage);

        if ($lead) {
            $this->markListingSoldWhenClosedWon($tenantId, $lead);
        }

        return $lead;
    }

    public function pendingTaskCount(string $tenantId): int
    {
        return $this->leads->pendingTaskCount($tenantId);
    }

    public function totalValue(string $tenantId): float
    {
        return $this->leads->totalValue($tenantId);
    }

    public function valueByStage(string $tenantId): Collection
    {
        return $this->leads->valueByStage($tenantId);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function ensureTenantRelations(string $tenantId, array $data): void
    {
        $errors = [];

        if (
            array_key_exists('contact_id', $data) && is_string($data['contact_id'])
            && ! $this->contacts->contactsBelongToTenant($tenantId, [$data['contact_id']])
        ) {
            $errors['contact_id'] = ['The selected contact id is invalid.'];
        }

        if (
            array_key_exists('listing_id', $data) && is_string($data['listing_id'])
            && ! $this->listings->listingsBelongToTenant($tenantId, [$data['listing_id']])
        ) {
            $errors['listing_id'] = ['The selected listing id is invalid.'];
        }

        if (
            array_key_exists('user_id', $data) && is_string($data['user_id'])
            && ! $this->tenants->userBelongsToTenant($tenantId, $data['user_id'])
        ) {
            $errors['user_id'] = ['The selected user id is invalid.'];
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function markListingSoldWhenClosedWon(string $tenantId, Lead $lead): void
    {
        if ((int) $lead->stage === Lead::STAGE_CLOSED_WON) {
            $this->listings->markSold($tenantId, (string) $lead->listing_id);
        }
    }
}
