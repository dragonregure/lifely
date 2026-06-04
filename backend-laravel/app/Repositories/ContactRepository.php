<?php

namespace App\Repositories;

use App\Contracts\ContactRepositoryInterface;
use App\Models\Contact;
use App\Models\Reference;
use App\Support\DataTables\DataTableQuery;
use App\Support\DataTables\EloquentDataTable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ContactRepository implements ContactRepositoryInterface
{
    public function all(string $tenantId, array $filters = []): Collection
    {
        $query = $this->queryForTenant($tenantId);
        $this->applyStatusFilter($query, $filters['status'] ?? null);

        return $query
            ->latest('contacts.created_at')
            ->get();
    }

    public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator
    {
        $query = $this->queryForTenant($tenantId);
        $this->applyStatusFilter($query, $dataTable->filter('status'));

        return EloquentDataTable::paginate(
            $query,
            $dataTable,
            ['contacts.first_name', 'contacts.last_name', 'contacts.email', 'contacts.phone', 'contact_statuses.value', 'contacts.source'],
            ['source' => 'contacts.source', 'owner_id' => 'contacts.owner_id'],
            [
                'contact' => 'contacts.first_name',
                'first_name' => 'contacts.first_name',
                'last_name' => 'contacts.last_name',
                'email' => 'contacts.email',
                'status' => 'contact_statuses.value',
                'owner' => 'contacts.owner_id',
                'budget' => 'contacts.budget',
                'source' => 'contacts.source',
                'last-contacted' => 'contacts.last_contacted_at',
                'created_at' => 'contacts.created_at',
            ]
        );
    }

    public function find(string $tenantId, string $contactId): ?Contact
    {
        return Contact::query()
            ->where('tenant_id', $tenantId)
            ->with('statusReference')
            ->find($contactId);
    }

    public function create(string $tenantId, array $data): Contact
    {
        if (! array_key_exists('status_id', $data)) {
            $data['status_id'] = $this->defaultStatusId($tenantId);
        }

        $this->normalizeLegacyStatus($tenantId, $data);

        return Contact::query()
            ->create($data + ['tenant_id' => $tenantId])
            ->load('statusReference');
    }

    public function update(string $tenantId, string $contactId, array $data): ?Contact
    {
        $contact = $this->find($tenantId, $contactId);

        if (! $contact) {
            return null;
        }

        $this->normalizeLegacyStatus($tenantId, $data);

        $contact->update($data);

        return $contact->refresh()->load('statusReference');
    }

    public function delete(string $tenantId, string $contactId): bool
    {
        $contact = $this->find($tenantId, $contactId);

        if (! $contact) {
            return false;
        }

        return (bool) $contact->delete();
    }

    public function countByStatus(string $tenantId): Collection
    {
        return Contact::query()
            ->where('contacts.tenant_id', $tenantId)
            ->leftJoin('references as contact_statuses', function (JoinClause $join): void {
                $join->on('contact_statuses.id', '=', 'contacts.status_id')
                    ->where('contact_statuses.group', Contact::STATUS_REFERENCE_GROUP);
            })
            ->selectRaw("COALESCE(contact_statuses.value, 'Unknown') as status, count(*) as total")
            ->groupBy('contact_statuses.value')
            ->pluck('total', 'status');
    }

    /**
     * @return Builder<Contact>
     */
    private function queryForTenant(string $tenantId): Builder
    {
        return Contact::query()
            ->select('contacts.*')
            ->leftJoin('references as contact_statuses', function (JoinClause $join): void {
                $join->on('contact_statuses.id', '=', 'contacts.status_id')
                    ->where('contact_statuses.group', Contact::STATUS_REFERENCE_GROUP);
            })
            ->where('contacts.tenant_id', $tenantId)
            ->with('statusReference');
    }

    /**
     * @param  Builder<Contact>  $query
     */
    private function applyStatusFilter(Builder $query, mixed $status): void
    {
        if (! is_string($status) || trim($status) === '') {
            return;
        }

        if (Str::isUuid($status)) {
            $query->where('contacts.status_id', $status);

            return;
        }

        $query->where('contact_statuses.value', $status);
    }

    private function defaultStatusId(string $tenantId): string
    {
        $statusId = Reference::query()
            ->visibleToTenant($tenantId)
            ->where('group', Contact::STATUS_REFERENCE_GROUP)
            ->where('reference_key', Contact::DEFAULT_STATUS_REFERENCE_KEY)
            ->where('status', Reference::STATUS_ACTIVE)
            ->orderByRaw('tenant_id IS NULL')
            ->value('id');

        if (! is_string($statusId)) {
            throw ValidationException::withMessages([
                'status_id' => ['The default contact status reference is missing.'],
            ]);
        }

        return $statusId;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function normalizeLegacyStatus(string $tenantId, array &$data): void
    {
        if (array_key_exists('status', $data) && ! array_key_exists('status_id', $data) && is_string($data['status'])) {
            $data['status_id'] = $this->statusIdForValue($tenantId, $data['status']);
        }

        unset($data['status']);
    }

    private function statusIdForValue(string $tenantId, string $status): string
    {
        $statusId = Reference::query()
            ->visibleToTenant($tenantId)
            ->where('group', Contact::STATUS_REFERENCE_GROUP)
            ->where('value', $status)
            ->where('status', Reference::STATUS_ACTIVE)
            ->orderByRaw('tenant_id IS NULL')
            ->value('id');

        if (! is_string($statusId)) {
            throw ValidationException::withMessages([
                'status_id' => ['The selected contact status is invalid.'],
            ]);
        }

        return $statusId;
    }
}
