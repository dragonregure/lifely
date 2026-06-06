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
        $this->applyAssigneeFilter($query, $dataTable);
        $this->applySourceFilter($query, $dataTable);
        $this->applySearch($query, $dataTable, $tenantId);

        return EloquentDataTable::paginate(
            $query,
            $dataTable,
            [],
            [
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
    private function applyAssigneeFilter(Builder $query, DataTableQuery $dataTable): void
    {
        $userIds = $this->filterValues($dataTable->filter('user_id'));

        if ($userIds !== []) {
            $query->whereIn('pipelines.user_id', $userIds);
        }
    }

    /**
     * @param  Builder<Pipeline>  $query
     */
    private function applySourceFilter(Builder $query, DataTableQuery $dataTable): void
    {
        $sources = collect($this->filterValues($dataTable->filter('source')))
            ->map(fn (string $source): ?int => Pipeline::sourceFromInput($source))
            ->filter(fn (?int $source): bool => $source !== null)
            ->unique()
            ->values()
            ->all();

        if ($sources !== []) {
            $query->whereIn('pipelines.source', $sources);
        }
    }

    /**
     * @param  Builder<Pipeline>  $query
     */
    private function applySearch(Builder $query, DataTableQuery $dataTable, string $tenantId): void
    {
        if ($dataTable->search === null) {
            return;
        }

        $search = $dataTable->search;
        $like = '%'.$search.'%';
        $nameParts = collect(explode(' ', $search))
            ->map(fn (string $part): string => trim($part))
            ->filter()
            ->values()
            ->all();
        $firstNamePart = $nameParts[0] ?? null;
        $lastNamePartKey = array_key_last($nameParts);
        $lastNamePart = $lastNamePartKey !== null ? $nameParts[$lastNamePartKey] : null;
        $matchingStages = collect(Pipeline::STAGE_LABELS)
            ->filter(fn (string $label): bool => str_contains(strtolower($label), strtolower($search)))
            ->keys()
            ->all();
        $matchingSources = collect(Pipeline::SOURCE_LABELS)
            ->filter(fn (string $label): bool => str_contains(strtolower($label), strtolower($search)))
            ->keys()
            ->all();

        $query->where(function (Builder $query) use ($like, $matchingStages, $matchingSources, $firstNamePart, $lastNamePart, $tenantId): void {
            $query->where('pipelines.next_task', 'like', $like)
                ->orWhereHas('contact', function (Builder $query) use ($like, $firstNamePart, $lastNamePart, $tenantId): void {
                    $query->where('tenant_id', $tenantId)
                        ->where(function (Builder $query) use ($like, $firstNamePart, $lastNamePart): void {
                            $query->where('first_name', 'like', $like)
                                ->orWhere('last_name', 'like', $like)
                                ->orWhere('email', 'like', $like);

                            if ($firstNamePart !== null && $lastNamePart !== null && $firstNamePart !== $lastNamePart) {
                                $query->orWhere(function (Builder $query) use ($firstNamePart, $lastNamePart): void {
                                    $query->where('first_name', 'like', '%'.$firstNamePart.'%')
                                        ->where('last_name', 'like', '%'.$lastNamePart.'%');
                                });
                            }
                        });
                })
                ->orWhereHas('listing', function (Builder $query) use ($like, $tenantId): void {
                    $query->where('tenant_id', $tenantId)
                        ->where('title', 'like', $like);
                })
                ->orWhereHas('user', function (Builder $query) use ($like, $tenantId): void {
                    $query->where('tenant_id', $tenantId)
                        ->where(function (Builder $query) use ($like): void {
                            $query->where('name', 'like', $like)
                                ->orWhere('email', 'like', $like);
                        });
                });

            if ($matchingStages !== []) {
                $query->orWhereIn('pipelines.stage', $matchingStages);
            }

            if ($matchingSources !== []) {
                $query->orWhereIn('pipelines.source', $matchingSources);
            }
        });
    }

    /**
     * @return array<int, string>
     */
    private function filterValues(?string $filter): array
    {
        if ($filter === null) {
            return [];
        }

        return collect(explode(',', $filter))
            ->map(fn (string $value): string => trim($value))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function relations(string $tenantId, array $includes): array
    {
        $relations = [
            'contact' => fn ($query) => $query->where('tenant_id', $tenantId),
            'listing' => fn ($query) => $query->where('tenant_id', $tenantId),
            'user' => fn ($query) => $query->where('tenant_id', $tenantId),
        ];

        return array_intersect_key($relations, array_flip($includes));
    }
}
