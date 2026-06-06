<?php

namespace App\Repositories;

use App\Contracts\LeadRepositoryInterface;
use App\Models\Listing;
use App\Models\Lead;
use App\Support\DataTables\DataTableQuery;
use App\Support\DataTables\EloquentDataTable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class LeadRepository implements LeadRepositoryInterface
{
    public function all(string $tenantId): Collection
    {
        return Lead::query()
            ->where('leads.tenant_id', $tenantId)
            ->latest()
            ->get();
    }

    public function paginate(string $tenantId, DataTableQuery $dataTable, array $includes = []): LengthAwarePaginator
    {
        $query = Lead::query()
            ->select('leads.*')
            ->addSelect('listings.price as listing_value')
            ->leftJoin('listings', function (JoinClause $join) use ($tenantId): void {
                $join->on('listings.id', '=', 'leads.listing_id')
                    ->where('listings.tenant_id', '=', $tenantId);
            })
            ->where('leads.tenant_id', $tenantId)
            ->with($this->relations($tenantId, $includes));

        $this->applyStageFilter($query, $dataTable);
        $this->applyAssigneeFilter($query, $dataTable);
        $this->applySourceFilter($query, $dataTable);
        $this->applyActiveFilter($query, $dataTable);
        $this->applySearch($query, $dataTable, $tenantId);

        return EloquentDataTable::paginate(
            $query,
            $dataTable,
            [],
            [
                'contact_id' => 'leads.contact_id',
                'listing_id' => 'leads.listing_id',
            ],
            [
                'stage' => 'leads.stage',
                'source' => 'leads.source',
                'value' => 'listings.price',
                'next_task' => 'leads.next_task',
                'due_at' => 'leads.due_at',
                'created_at' => 'leads.created_at',
            ],
            'leads.created_at'
        );
    }

    public function create(string $tenantId, array $data): Lead
    {
        return DB::transaction(function () use ($tenantId, $data): Lead {
            $lead = Lead::query()->create($data + [
                'tenant_id' => $tenantId,
                'stage' => Lead::STAGE_NEW_LEAD,
                'source' => Lead::SOURCE_MANUAL_ENTRY,
                'is_active' => true,
            ]);

            $this->markListingSoldWhenClosedWon($tenantId, $lead);

            return $lead;
        });
    }

    public function find(string $tenantId, string $leadId): ?Lead
    {
        return Lead::query()
            ->where('tenant_id', $tenantId)
            ->find($leadId);
    }

    public function update(string $tenantId, string $leadId, array $data): ?Lead
    {
        $lead = Lead::query()
            ->where('tenant_id', $tenantId)
            ->find($leadId);

        if (! $lead) {
            return null;
        }

        return DB::transaction(function () use ($tenantId, $lead, $data): Lead {
            $lead->update($data);
            $this->markListingSoldWhenClosedWon($tenantId, $lead);

            return $lead->refresh();
        });
    }

    public function updateStage(string $tenantId, string $leadId, int $stage): ?Lead
    {
        $lead = Lead::query()
            ->where('tenant_id', $tenantId)
            ->find($leadId);

        if (! $lead) {
            return null;
        }

        return DB::transaction(function () use ($tenantId, $lead, $stage): Lead {
            $lead->update(['stage' => $stage]);
            $this->markListingSoldWhenClosedWon($tenantId, $lead);

            return $lead->refresh();
        });
    }

    public function pendingTaskCount(string $tenantId): int
    {
        return Lead::query()
            ->where('tenant_id', $tenantId)
            ->whereNotNull('next_task')
            ->count();
    }

    public function totalValue(string $tenantId): float
    {
        return (float) Lead::query()
            ->join('listings', function ($join) use ($tenantId): void {
                $join->on('listings.id', '=', 'leads.listing_id')
                    ->where('listings.tenant_id', '=', $tenantId);
            })
            ->where('leads.tenant_id', $tenantId)
            ->sum('listings.price');
    }

    public function valueByStage(string $tenantId): Collection
    {
        return Lead::query()
            ->join('listings', function ($join) use ($tenantId): void {
                $join->on('listings.id', '=', 'leads.listing_id')
                    ->where('listings.tenant_id', '=', $tenantId);
            })
            ->where('leads.tenant_id', $tenantId)
            ->selectRaw('leads.stage, count(*) as deals, sum(listings.price) as value')
            ->groupBy('leads.stage')
            ->get();
    }

    /**
     * @param  Builder<Lead>  $query
     */
    private function applyStageFilter(Builder $query, DataTableQuery $dataTable): void
    {
        $stage = Lead::stageFromInput($dataTable->filter('stage'));

        if ($stage !== null) {
            $query->where('leads.stage', $stage);
        }
    }

    /**
     * @param  Builder<Lead>  $query
     */
    private function applyAssigneeFilter(Builder $query, DataTableQuery $dataTable): void
    {
        $userIds = $this->filterValues($dataTable->filter('user_id'));

        if ($userIds !== []) {
            $query->whereIn('leads.user_id', $userIds);
        }
    }

    /**
     * @param  Builder<Lead>  $query
     */
    private function applySourceFilter(Builder $query, DataTableQuery $dataTable): void
    {
        $sources = collect($this->filterValues($dataTable->filter('source')))
            ->map(fn (string $source): ?int => Lead::sourceFromInput($source))
            ->filter(fn (?int $source): bool => $source !== null)
            ->unique()
            ->values()
            ->all();

        if ($sources !== []) {
            $query->whereIn('leads.source', $sources);
        }
    }

    /**
     * @param  Builder<Lead>  $query
     */
    private function applyActiveFilter(Builder $query, DataTableQuery $dataTable): void
    {
        $status = $dataTable->filter('is_active');

        if (! is_string($status) || trim($status) === '') {
            return;
        }

        $normalized = strtolower(trim($status));
        if ($normalized === 'active' || $normalized === '1' || $normalized === 'true') {
            $query->where('leads.is_active', true);

            return;
        }

        if ($normalized === 'inactive' || $normalized === '0' || $normalized === 'false') {
            $query->where('leads.is_active', false);
        }
    }

    /**
     * @param  Builder<Lead>  $query
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
        $matchingStages = collect(Lead::STAGE_LABELS)
            ->filter(fn (string $label): bool => str_contains(strtolower($label), strtolower($search)))
            ->keys()
            ->all();
        $matchingSources = collect(Lead::SOURCE_LABELS)
            ->filter(fn (string $label): bool => str_contains(strtolower($label), strtolower($search)))
            ->keys()
            ->all();

        $query->where(function (Builder $query) use ($like, $matchingStages, $matchingSources, $firstNamePart, $lastNamePart, $tenantId): void {
            $query->where('leads.next_task', 'like', $like)
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
                $query->orWhereIn('leads.stage', $matchingStages);
            }

            if ($matchingSources !== []) {
                $query->orWhereIn('leads.source', $matchingSources);
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

    private function markListingSoldWhenClosedWon(string $tenantId, Lead $lead): void
    {
        if ((int) $lead->stage !== Lead::STAGE_CLOSED_WON) {
            return;
        }

        $listing = Listing::query()
            ->where('tenant_id', $tenantId)
            ->find($lead->listing_id);

        if (! $listing || (int) $listing->status === Listing::STATUS_SOLD) {
            return;
        }

        $listing->update(['status' => Listing::STATUS_SOLD]);
    }
}
