<?php

namespace App\Services;

use App\Contracts\ContactServiceInterface;
use App\Contracts\ListingRepositoryInterface;
use App\Contracts\ListingServiceInterface;
use App\Contracts\TenantServiceInterface;
use App\Models\Listing;
use App\Support\DataTables\DataTableQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class ListingService implements ListingServiceInterface
{
    public function __construct(
        private readonly ListingRepositoryInterface $listings,
        private readonly ContactServiceInterface $contacts,
        private readonly TenantServiceInterface $tenants,
    ) {
    }

    public function all(string $tenantId): Collection
    {
        return $this->listings->all($tenantId);
    }

    public function paginate(string $tenantId, DataTableQuery $dataTable, array $includes = []): LengthAwarePaginator
    {
        return $this->listings->paginate($tenantId, $dataTable, $includes);
    }

    public function find(string $tenantId, string $listingId, array $includes = []): ?Listing
    {
        return $this->listings->find($tenantId, $listingId, $includes);
    }

    public function create(string $tenantId, array $data): Listing
    {
        $this->ensureTenantAssignments($tenantId, $data, false);

        return $this->listings->create($tenantId, $data);
    }

    public function update(string $tenantId, string $listingId, array $data): ?Listing
    {
        $this->ensureTenantAssignments($tenantId, $data, true);

        return $this->listings->update($tenantId, $listingId, $data);
    }

    public function listingsBelongToTenant(string $tenantId, array $listingIds): bool
    {
        $uniqueIds = array_values(array_unique($listingIds));

        return $uniqueIds === []
            || count($this->listings->findExistingIds($tenantId, $uniqueIds)) === count($uniqueIds);
    }

    public function markSold(string $tenantId, string $listingId): void
    {
        $listing = $this->listings->find($tenantId, $listingId);

        if (! $listing || (int) $listing->status === Listing::STATUS_SOLD) {
            return;
        }

        $this->listings->update($tenantId, $listingId, ['status' => Listing::STATUS_SOLD]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function ensureTenantAssignments(string $tenantId, array $data, bool $requireUserIdsWhenSettingPrimaryOwner): void
    {
        $contactIds = $this->stringList($data['contact_ids'] ?? []);
        $userIds = $this->stringList($data['user_ids'] ?? []);
        $primaryOwnerUserId = $data['primary_owner_user_id'] ?? null;
        $errors = [];

        if (! $this->contacts->contactsBelongToTenant($tenantId, $contactIds)) {
            $errors['contact_ids'] = ['The selected contact ids are invalid.'];
        }

        if (! $this->tenants->usersBelongToTenant($tenantId, $userIds)) {
            $errors['user_ids'] = ['The selected user ids are invalid.'];
        }

        if (! array_key_exists('primary_owner_user_id', $data)) {
            $this->throwValidationErrors($errors);

            return;
        }

        if ($requireUserIdsWhenSettingPrimaryOwner && ! array_key_exists('user_ids', $data)) {
            $errors['primary_owner_user_id'] = ['Provide user_ids when setting the primary owner.'];
            $this->throwValidationErrors($errors);

            return;
        }

        if (is_string($primaryOwnerUserId) && ! $this->tenants->userBelongsToTenant($tenantId, $primaryOwnerUserId)) {
            $errors['primary_owner_user_id'] = ['The selected primary owner user id is invalid.'];
        }

        if (is_string($primaryOwnerUserId) && ! in_array($primaryOwnerUserId, $userIds, true)) {
            $errors['primary_owner_user_id'] = ['The primary owner must be one of the assigned users.'];
        }

        $this->throwValidationErrors($errors);
    }

    /**
     * @return array<int, string>
     */
    private function stringList(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }

        return collect($value)
            ->filter(fn (mixed $item): bool => is_string($item))
            ->values()
            ->all();
    }

    /**
     * @param  array<string, array<int, string>>  $errors
     */
    private function throwValidationErrors(array $errors): void
    {
        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }
}
