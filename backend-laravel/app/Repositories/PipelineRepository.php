<?php

namespace App\Repositories;

use App\Contracts\PipelineRepositoryInterface;
use App\Models\PipelineDeal;
use App\Support\DataTables\DataTableQuery;
use App\Support\DataTables\EloquentDataTable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class PipelineRepository implements PipelineRepositoryInterface
{
    public function all(string $tenantId): Collection
    {
        return PipelineDeal::query()
            ->where('tenant_id', $tenantId)
            ->with(['contact', 'listing', 'user'])
            ->latest()
            ->get();
    }

    public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator
    {
        return EloquentDataTable::paginate(
            PipelineDeal::query()
                ->where('tenant_id', $tenantId)
                ->with(['contact', 'listing', 'user']),
            $dataTable,
            ['stage', 'next_task'],
            ['stage' => 'stage', 'user_id' => 'user_id', 'contact_id' => 'contact_id', 'listing_id' => 'listing_id'],
            [
                'stage' => 'stage',
                'value' => 'value',
                'next_task' => 'next_task',
                'due_at' => 'due_at',
                'created_at' => 'created_at',
            ]
        );
    }

    public function create(string $tenantId, array $data): PipelineDeal
    {
        $deal = PipelineDeal::query()->create($data + ['tenant_id' => $tenantId]);

        return $deal->load(['contact', 'listing', 'user']);
    }

    public function updateStage(string $tenantId, string $dealId, string $stage): ?PipelineDeal
    {
        $deal = PipelineDeal::query()
            ->where('tenant_id', $tenantId)
            ->find($dealId);

        if (! $deal) {
            return null;
        }

        $deal->update(['stage' => $stage]);

        return $deal->refresh()->load(['contact', 'listing', 'user']);
    }

    public function pendingTaskCount(string $tenantId): int
    {
        return PipelineDeal::query()
            ->where('tenant_id', $tenantId)
            ->whereNotNull('next_task')
            ->count();
    }

    public function totalValue(string $tenantId): float
    {
        return (float) PipelineDeal::query()
            ->where('tenant_id', $tenantId)
            ->sum('value');
    }

    public function valueByStage(string $tenantId): Collection
    {
        return PipelineDeal::query()
            ->where('tenant_id', $tenantId)
            ->selectRaw('stage, count(*) as deals, sum(value) as value')
            ->groupBy('stage')
            ->get();
    }
}
