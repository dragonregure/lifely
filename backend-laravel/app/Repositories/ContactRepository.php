<?php

namespace App\Repositories;

use App\Contracts\ActivityRepositoryInterface;
use App\Contracts\ContactRepositoryInterface;
use App\Models\Contact;
use Illuminate\Support\Collection;

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

    public function countByStatus(string $tenantId): Collection
    {
        return Contact::query()
            ->where('tenant_id', $tenantId)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');
    }
}
