<?php

namespace App\Jobs;

use App\Contracts\EmailCampaignServiceInterface;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendBulkEmailCampaign implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $campaignId,
        public bool $sendSynchronously = false
    ) {
        $this->onQueue('emails');
    }

    public function handle(EmailCampaignServiceInterface $campaigns): void
    {
        $campaigns->processQueuedCampaign($this->campaignId, $this->sendSynchronously);
    }
}
