<?php

namespace App\Repositories;

use App\Contracts\ReferenceRepositoryInterface;
use App\Models\Reference;
use App\Support\DataTables\DataTableQuery;
use App\Support\DataTables\EloquentDataTable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ReferenceRepository implements ReferenceRepositoryInterface
{
    public function all(string $tenantId, array $filters = []): Collection
    {
        return Reference::query()
            ->visibleToTenant($tenantId)
            ->when($filters['group'] ?? null, fn ($query, $group) => $query->where('group', $group))
            ->when($filters['type'] ?? null, fn ($query, $type) => $query->where('type', $type))
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->orderBy('group')
            ->orderBy('value')
            ->get();
    }

    public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator
    {
        $query = Reference::query()->visibleToTenant($tenantId);

        if ($dataTable->filter('scope') === 'system') {
            $query->whereNull('tenant_id');
        }

        if ($dataTable->filter('scope') === 'tenant') {
            $query->where('tenant_id', $tenantId);
        }

        return EloquentDataTable::paginate(
            $query,
            $dataTable,
            ['group', 'reference_key', 'value', 'type', 'status'],
            ['group' => 'group', 'type' => 'type', 'status' => 'status'],
            [
                'reference' => 'reference_key',
                'key' => 'reference_key',
                'group' => 'group',
                'value' => 'value',
                'type' => 'type',
                'status' => 'status',
                'updated' => 'updated_at',
                'updated_at' => 'updated_at',
                'created_at' => 'created_at',
            ],
            'group',
            'asc'
        );
    }

    public function referenceTypeOptions(string $tenantId): Collection
    {
        return Reference::query()
            ->visibleToTenant($tenantId)
            ->where('group', Reference::GROUP_REFERENCE_TYPE)
            ->orderBy('value')
            ->get(['reference_key', 'value'])
            ->map(fn (Reference $reference): array => [
                'label' => $reference->value ?? $reference->reference_key,
                'value' => $reference->reference_key,
            ])
            ->values();
    }

    public function groupOptions(string $tenantId): Collection
    {
        return Reference::query()
            ->visibleToTenant($tenantId)
            ->select('group')
            ->distinct()
            ->orderBy('group')
            ->pluck('group')
            ->map(fn (string $group): array => [
                'label' => ucwords(str_replace('_', ' ', $group)),
                'value' => $group,
            ])
            ->values();
    }

    public function findVisible(string $tenantId, string $referenceId): ?Reference
    {
        return Reference::query()
            ->visibleToTenant($tenantId)
            ->find($referenceId);
    }

    public function create(string $tenantId, array $data): Reference
    {
        $data['tenant_id'] = $this->tenantIdFromPayload($tenantId, $data, $tenantId);
        $data['reference_key'] = $data['key'];
        unset($data['key']);

        return DB::transaction(function () use ($data): Reference {
            $this->ensureUnique($data['tenant_id'], $data['group'], $data['reference_key']);

            return Reference::query()->create($data);
        });
    }

    public function update(string $tenantId, string $referenceId, array $data): ?Reference
    {
        $reference = $this->findVisible($tenantId, $referenceId);

        if (! $reference) {
            return null;
        }

        return DB::transaction(function () use ($data, $reference, $tenantId): Reference {
            if (array_key_exists('tenant_id', $data)) {
                $data['tenant_id'] = $this->tenantIdFromPayload($tenantId, $data, $reference->tenant_id);
            }

            if (array_key_exists('key', $data)) {
                $data['reference_key'] = $data['key'];
                unset($data['key']);
            }

            $nextTenantId = $data['tenant_id'] ?? $reference->tenant_id;
            $nextGroup = $data['group'] ?? $reference->group;
            $nextKey = $data['reference_key'] ?? $reference->reference_key;

            $this->ensureUnique($nextTenantId, $nextGroup, $nextKey, $reference->id);
            $reference->update($data);

            return $reference->refresh();
        });
    }

    public function delete(string $tenantId, string $referenceId): bool
    {
        $reference = $this->findVisible($tenantId, $referenceId);

        if (! $reference) {
            return false;
        }

        $reference->delete();

        return true;
    }

    private function tenantIdFromPayload(string $currentTenantId, array $data, ?string $defaultTenantId): ?string
    {
        $tenantId = array_key_exists('tenant_id', $data) ? $data['tenant_id'] : $defaultTenantId;

        if ($tenantId !== null && $tenantId !== $currentTenantId) {
            throw new HttpException(403, 'Reference tenant does not match the current tenant context.');
        }

        return $tenantId;
    }

    private function ensureUnique(?string $tenantId, string $group, string $key, ?string $ignoreId = null): void
    {
        $exists = Reference::query()
            ->when($tenantId === null, fn ($query) => $query->whereNull('tenant_id'), fn ($query) => $query->where('tenant_id', $tenantId))
            ->where('group', $group)
            ->where('reference_key', $key)
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'group' => ['The group and key pair already exists for this reference scope.'],
                'key' => ['The group and key pair already exists for this reference scope.'],
            ]);
        }
    }
}
