<?php

namespace App\Jobs;

use App\Contracts\EmailSenderInterface;
use App\Models\Contact;
use App\Models\EmailCampaign;
use App\Support\Email\CampaignEmailRenderer;
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

    public function handle(EmailSenderInterface $emails, CampaignEmailRenderer $renderer): void
    {
        $campaign = EmailCampaign::query()->find($this->campaignId);

        if (! $campaign || $campaign->status !== 'Queued') {
            return;
        }

        $campaign->update(['status' => 'Sending']);

        Contact::query()
            ->where('tenant_id', $campaign->tenant_id)
            ->whereIn('id', $campaign->contact_ids)
            ->whereNotNull('email')
            ->orderBy('id')
            ->chunkById(100, function ($contacts) use ($campaign, $emails, $renderer): void {
                foreach ($contacts as $contact) {
                    $job = new SendCampaignEmailToContact($campaign->id, $contact->id);

                    if ($this->sendSynchronously) {
                        $job->handle($emails, $renderer);

                        continue;
                    }

                    SendCampaignEmailToContact::dispatch($campaign->id, $contact->id);
                }
            });

        $campaign->update(['status' => 'Sent']);
    }
}
