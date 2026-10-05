<?php

namespace App\Services;

use App\Contracts\LeadLifecycleRepositoryInterface;
use App\Contracts\LeadLifecycleServiceInterface;

class LeadLifecycleService implements LeadLifecycleServiceInterface
{
    public function __construct(private readonly LeadLifecycleRepositoryInterface $leadLifecycle)
    {
    }

    public function process(): void
    {
        $today = now()->startOfDay();

        $this->leadLifecycle->moveStaleActiveLeadsToDormant($today->copy()->subDays(7)->toDateString());
        $this->leadLifecycle->deactivateDormantLeads($today->copy()->subDays(14)->toDateString());
        $this->leadLifecycle->deactivateProblematicLeads($today->copy()->subDays(7)->toDateString());
    }
}
