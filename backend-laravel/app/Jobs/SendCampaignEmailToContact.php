<?php

namespace App\Jobs;

use App\Contracts\EmailCampaignServiceInterface;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendCampaignEmailToContact implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $campaignId,
        public string $contactId
    ) {
        $this->onQueue('emails');
    }

    public function handle(EmailCampaignServiceInterface $campaigns): void
    {
        $campaigns->sendCampaignContact($this->campaignId, $this->contactId);
    }
}
