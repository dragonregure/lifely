<?php

namespace App\Repositories;

use App\Contracts\PipelineRepositoryInterface;
use App\Models\Pipeline;
use App\Support\DataTables\DataTableQuery;
use App\Support\DataTables\EloquentDataTable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Collection;

class PipelineRepository implements PipelineRepositoryInterface
{
    public function all(string $tenantId): Collection
    {
        return Pipeline::query()
            ->where('pipelines.tenant_id', $tenantId)
            ->latest()
            ->get();
    }

    public function paginate(string $tenantId, DataTableQuery $dataTable, array $includes = []): LengthAwarePaginator
    {
        $query = Pipeline::query()
            ->select('pipelines.*')
            ->addSelect('listings.price as listing_value')
            ->leftJoin('listings', function (JoinClause $join) use ($tenantId): void {
                $join->on('listings.id', '=', 'pipelines.listing_id')
                    ->where('listings.tenant_id', '=', $tenantId);
            })
            ->where('pipelines.tenant_id', $tenantId)
            ->with($this->relations($tenantId, $includes));

        $this->applyStageFilter($query, $dataTable);
        $this->applySourceFilter($query, $dataTable);
        $this->applySearch($query, $dataTable);

        return EloquentDataTable::paginate(
            $query,
            $dataTable,
            [],
            [
                'user_id' => 'pipelines.user_id',
                'contact_id' => 'pipelines.contact_id',
                'listing_id' => 'pipelines.listing_id',
            ],
            [
                'stage' => 'pipelines.stage',
                'source' => 'pipelines.source',
                'value' => 'listings.price',
                'next_task' => 'pipelines.next_task',
                'due_at' => 'pipelines.due_at',
                'created_at' => 'pipelines.created_at',
            ],
            'pipelines.created_at'
        );
    }

    public function create(string $tenantId, array $data): Pipeline
    {
        $pipeline = Pipeline::query()->create($data + [
            'tenant_id' => $tenantId,
            'stage' => Pipeline::STAGE_NEW_LEAD,
            'source' => Pipeline::SOURCE_MANUAL_ENTRY,
            'is_active' => true,
        ]);

        return $pipeline;
    }

    public function find(string $tenantId, string $pipelineId): ?Pipeline
    {
        return Pipeline::query()
            ->where('tenant_id', $tenantId)
            ->find($pipelineId);
    }

    public function update(string $tenantId, string $pipelineId, array $data): ?Pipeline
    {
        $pipeline = Pipeline::query()
            ->where('tenant_id', $tenantId)
            ->find($pipelineId);

        if (! $pipeline) {
            return null;
        }

        $pipeline->update($data);

        return $pipeline->refresh();
    }

    public function updateStage(string $tenantId, string $pipelineId, int $stage): ?Pipeline
    {
        $pipeline = Pipeline::query()
            ->where('tenant_id', $tenantId)
            ->find($pipelineId);

        if (! $pipeline) {
            return null;
        }

        $pipeline->update(['stage' => $stage]);

        return $pipeline->refresh();
    }

    public function pendingTaskCount(string $tenantId): int
    {
        return Pipeline::query()
            ->where('tenant_id', $tenantId)
            ->whereNotNull('next_task')
            ->count();
    }

    public function totalValue(string $tenantId): float
    {
        return (float) Pipeline::query()
            ->join('listings', function ($join) use ($tenantId): void {
                $join->on('listings.id', '=', 'pipelines.listing_id')
                    ->where('listings.tenant_id', '=', $tenantId);
            })
            ->where('pipelines.tenant_id', $tenantId)
            ->sum('listings.price');
    }

    public function valueByStage(string $tenantId): Collection
    {
        return Pipeline::query()
            ->join('listings', function ($join) use ($tenantId): void {
                $join->on('listings.id', '=', 'pipelines.listing_id')
                    ->where('listings.tenant_id', '=', $tenantId);
            })
            ->where('pipelines.tenant_id', $tenantId)
            ->selectRaw('pipelines.stage, count(*) as deals, sum(listings.price) as value')
            ->groupBy('pipelines.stage')
            ->get();
    }

    /**
     * @param  Builder<Pipeline>  $query
     */
    private function applyStageFilter(Builder $query, DataTableQuery $dataTable): void
    {
        $stage = Pipeline::stageFromInput($dataTable->filter('stage'));

        if ($stage !== null) {
            $query->where('pipelines.stage', $stage);
        }
    }

    /**
     * @param  Builder<Pipeline>  $query
     */
    private function applySourceFilter(Builder $query, DataTableQuery $dataTable): void
    {
        $source = Pipeline::sourceFromInput($dataTable->filter('source'));

        if ($source !== null) {
            $query->where('pipelines.source', $source);
        }
    }

    /**
     * @param  Builder<Pipeline>  $query
     */
    private function applySearch(Builder $query, DataTableQuery $dataTable): void
    {
        if ($dataTable->search === null) {
            return;
        }

        $matchingStages = collect(Pipeline::STAGE_LABELS)
            ->filter(fn (string $label): bool => str_contains(strtolower($label), strtolower($dataTable->search)))
            ->keys()
            ->all();
        $matchingSources = collect(Pipeline::SOURCE_LABELS)
            ->filter(fn (string $label): bool => str_contains(strtolower($label), strtolower($dataTable->search)))
            ->keys()
            ->all();

        $query->where(function (Builder $query) use ($dataTable, $matchingStages, $matchingSources): void {
            $query->where('pipelines.next_task', 'like', '%'.$dataTable->search.'%');

            if ($matchingStages !== []) {
                $query->orWhereIn('pipelines.stage', $matchingStages);
            }

            if ($matchingSources !== []) {
                $query->orWhereIn('pipelines.source', $matchingSources);
            }
        });
    }

    private function relations(string $tenantId, array $includes): array
    {
        $relations = [
            'contact' => fn ($query) => $query->where('tenant_id', $tenantId)->with('statusReference'),
            'listing' => fn ($query) => $query->where('tenant_id', $tenantId),
            'user' => fn ($query) => $query->where('tenant_id', $tenantId),
        ];

        return array_intersect_key($relations, array_flip($includes));
    }
}
