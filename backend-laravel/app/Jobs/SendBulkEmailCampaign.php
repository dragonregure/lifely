<?php

namespace App\Jobs;

use App\Models\EmailCampaign;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendBulkEmailCampaign implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $campaignId)
    {
        $this->onQueue('emails');
    }

    public function handle(): void
    {
        $campaign = EmailCampaign::query()->find($this->campaignId);

        if (! $campaign || $campaign->status !== 'Queued') {
            return;
        }

        // Provider-specific SMTP/API work belongs behind this queued boundary.
        $campaign->update(['status' => 'Sent']);
    }
}
