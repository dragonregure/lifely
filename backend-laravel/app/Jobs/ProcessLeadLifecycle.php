<?php

namespace App\Jobs;

use App\Models\Lead;
use App\Models\Listing;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Queue\Queueable;

class ProcessLeadLifecycle implements ShouldQueue
{
    use Queueable;

    public function __construct()
    {
        $this->onQueue('leads');
    }

    public function handle(): void
    {
        $today = now()->startOfDay();

        $this->moveStaleActiveLeadsToDormant($today->copy()->subDays(7)->toDateString());
        $this->deactivateDormantLeads($today->copy()->subDays(14)->toDateString());
        $this->deactivateProblematicLeads($today->copy()->subDays(7)->toDateString());
    }

    private function moveStaleActiveLeadsToDormant(string $cutoffDate): void
    {
        $this->withoutBlockingProblems(
            $this->activeLeadsStaleSince($cutoffDate)
                ->where('leads.stage', '<>', Lead::STAGE_DORMANT)
        )->update(['stage' => Lead::STAGE_DORMANT]);
    }

    private function deactivateDormantLeads(string $cutoffDate): void
    {
        $this->withoutBlockingProblems(
            $this->activeLeadsStaleSince($cutoffDate)
                ->where('leads.stage', Lead::STAGE_DORMANT)
        )->update(['is_active' => false]);
    }

    private function deactivateProblematicLeads(string $cutoffDate): void
    {
        $this->withBlockingProblems(
            $this->activeLeadsStaleSince($cutoffDate)
        )->update(['is_active' => false]);
    }

    /**
     * @return Builder<Lead>
     */
    private function activeLeadsStaleSince(string $cutoffDate): Builder
    {
        return Lead::query()
            ->where('leads.is_active', true)
            ->whereDate('leads.updated_at', '<=', $cutoffDate);
    }

    /**
     * @param  Builder<Lead>  $query
     * @return Builder<Lead>
     */
    private function withoutBlockingProblems(Builder $query): Builder
    {
        return $query
            ->whereDoesntHave('listing', function (Builder $query): void {
                $query->whereColumn('listings.tenant_id', 'leads.tenant_id')
                    ->where('listings.status', Listing::STATUS_SOLD);
            })
            ->whereDoesntHave('contact', function (Builder $query): void {
                $query->whereColumn('contacts.tenant_id', 'leads.tenant_id')
                    ->where('contacts.status', false);
            });
    }

    /**
     * @param  Builder<Lead>  $query
     * @return Builder<Lead>
     */
    private function withBlockingProblems(Builder $query): Builder
    {
        return $query->where(function (Builder $query): void {
            $query->whereHas('listing', function (Builder $query): void {
                $query->whereColumn('listings.tenant_id', 'leads.tenant_id')
                    ->where('listings.status', Listing::STATUS_SOLD);
            })->orWhereHas('contact', function (Builder $query): void {
                $query->whereColumn('contacts.tenant_id', 'leads.tenant_id')
                    ->where('contacts.status', false);
            });
        });
    }
}
