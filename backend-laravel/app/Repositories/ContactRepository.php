<?php

namespace App\Repositories;

use App\Contracts\ContactRepositoryInterface;
use App\Models\Contact;
use App\Support\DataTables\DataTableQuery;
use App\Support\DataTables\EloquentDataTable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class ContactRepository implements ContactRepositoryInterface
{
    public function all(string $tenantId, array $filters = []): Collection
    {
        $query = $this->queryForTenant($tenantId);
        $this->applyStatusFilter($query, $filters['status'] ?? null);
        $this->applySourceFilter($query, $filters['source'] ?? null);
        $this->applyOwnerFilter($query, $filters['owner_id'] ?? null);

        return $query
            ->latest('contacts.created_at')
            ->get();
    }

    public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator
    {
        $query = $this->queryForTenant($tenantId);
        $this->applyStatusFilter($query, $dataTable->filter('status'));
        $this->applySourceFilter($query, $dataTable->filter('source'));
        $this->applyOwnerFilter($query, $dataTable->filter('owner_id'));

        return EloquentDataTable::paginate(
            $query,
            $dataTable,
            ['contacts.first_name', 'contacts.last_name', 'contacts.email', 'contacts.phone'],
            [],
            [
                'contact' => 'contacts.first_name',
                'first_name' => 'contacts.first_name',
                'last_name' => 'contacts.last_name',
                'email' => 'contacts.email',
                'status' => 'contacts.status',
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
            ->find($contactId);
    }

    public function create(string $tenantId, array $data): Contact
    {
        return Contact::query()
            ->create($data + [
                'tenant_id' => $tenantId,
                'status' => true,
                'source' => Contact::SOURCE_MANUAL_ENTRY,
            ]);
    }

    public function update(string $tenantId, string $contactId, array $data): ?Contact
    {
        $contact = $this->find($tenantId, $contactId);

        if (! $contact) {
            return null;
        }

        $contact->update($data);

        return $contact->refresh();
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
            ->where('tenant_id', $tenantId)
            ->selectRaw("CASE WHEN status = 1 THEN 'Active' ELSE 'Inactive' END as status_label, count(*) as total")
            ->groupBy('status')
            ->pluck('total', 'status_label');
    }

    /**
     * @return Builder<Contact>
     */
    private function queryForTenant(string $tenantId): Builder
    {
        return Contact::query()
            ->select('contacts.*')
            ->where('contacts.tenant_id', $tenantId);
    }

    /**
     * @param  Builder<Contact>  $query
     */
    private function applyStatusFilter(Builder $query, mixed $status): void
    {
        if (! is_string($status) || trim($status) === '') {
            return;
        }

        $normalized = strtolower(trim($status));
        if ($normalized === 'active' || $normalized === '1' || $normalized === 'true') {
            $query->where('contacts.status', true);

            return;
        }

        if ($normalized === 'inactive' || $normalized === '0' || $normalized === 'false') {
            $query->where('contacts.status', false);
        }
    }

    /**
     * @param  Builder<Contact>  $query
     */
    private function applySourceFilter(Builder $query, mixed $sourceFilter): void
    {
        $sources = collect($this->filterValues($sourceFilter))
            ->map(fn (string $source): ?int => Contact::sourceFromInput($source))
            ->filter(fn (?int $source): bool => $source !== null)
            ->unique()
            ->values()
            ->all();

        if ($sources !== []) {
            $query->whereIn('contacts.source', $sources);
        }
    }

    /**
     * @param  Builder<Contact>  $query
     */
    private function applyOwnerFilter(Builder $query, mixed $ownerFilter): void
    {
        $ownerIds = $this->filterValues($ownerFilter);

        if ($ownerIds !== []) {
            $query->whereIn('contacts.owner_id', $ownerIds);
        }
    }

    /**
     * @return array<int, string>
     */
    private function filterValues(mixed $filter): array
    {
        if (! is_string($filter)) {
            return [];
        }

        return collect(explode(',', $filter))
            ->map(fn (string $value): string => trim($value))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }
}
