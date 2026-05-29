<?php

namespace App\Repositories;

use App\Contracts\ActivityRepositoryInterface;
use App\Contracts\ContactRepositoryInterface;
use App\Models\Contact;
use App\Support\DataTables\DataTableQuery;
use App\Support\DataTables\EloquentDataTable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ContactRepository implements ContactRepositoryInterface
{
    public function __construct(private readonly ActivityRepositoryInterface $activity)
    {
    }

    public function all(string $tenantId, array $filters = []): Collection
    {
        return Contact::query()
            ->where('tenant_id', $tenantId)
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->latest()
            ->get();
    }

    public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator
    {
        return EloquentDataTable::paginate(
            Contact::query()->where('tenant_id', $tenantId),
            $dataTable,
            ['first_name', 'last_name', 'email', 'phone', 'status', 'source'],
            ['status' => 'status', 'source' => 'source', 'owner_id' => 'owner_id'],
            [
                'contact' => 'first_name',
                'first_name' => 'first_name',
                'last_name' => 'last_name',
                'email' => 'email',
                'status' => 'status',
                'owner' => 'owner_id',
                'budget' => 'budget',
                'source' => 'source',
                'last-contacted' => 'last_contacted_at',
                'created_at' => 'created_at',
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
        $contact = Contact::query()->create($data + ['tenant_id' => $tenantId]);

        $this->activity->record(
            $tenantId,
            $data['owner_id'] ?? null,
            'contact.created',
            "Created contact {$contact->first_name} {$contact->last_name}."
        );

        return $contact;
    }

    public function update(string $tenantId, string $contactId, array $data): ?Contact
    {
        $contact = $this->find($tenantId, $contactId);

        if (! $contact) {
            return null;
        }

        $contact->update($data);
        $this->activity->record($tenantId, $contact->owner_id, 'contact.updated', "Updated contact {$contact->first_name} {$contact->last_name}.");

        return $contact->refresh();
    }

    public function delete(string $tenantId, string $contactId): bool
    {
        $contact = $this->find($tenantId, $contactId);

        if (! $contact) {
            return false;
        }

        return DB::transaction(function () use ($tenantId, $contact): bool {
            $this->activity->record($tenantId, $contact->owner_id, 'contact.deleted', "Deleted contact {$contact->first_name} {$contact->last_name}.");

            return (bool) $contact->delete();
        });
    }

    public function countByStatus(string $tenantId): Collection
    {
        return Contact::query()
            ->where('tenant_id', $tenantId)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');
    }
}
