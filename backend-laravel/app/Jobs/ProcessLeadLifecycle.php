<?php

namespace App\Jobs;

use App\Contracts\LeadLifecycleServiceInterface;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ProcessLeadLifecycle implements ShouldQueue
{
    use Queueable;

    public function __construct()
    {
        $this->onQueue('leads');
    }

    public function handle(LeadLifecycleServiceInterface $leadLifecycle): void
    {
        $leadLifecycle->process();
    }
}
