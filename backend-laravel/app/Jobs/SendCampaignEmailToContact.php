<?php

namespace App\Jobs;

use App\Contracts\EmailSenderInterface;
use App\Models\Contact;
use App\Models\EmailCampaign;
use App\Models\Listing;
use App\Support\Email\EmailAddress;
use App\Support\Email\CampaignEmailRenderer;
use App\Support\Email\EmailMessage;
use App\Services\Email\DemoEmailLimiter;
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

    public function handle(EmailSenderInterface $emails, CampaignEmailRenderer $renderer): void
    {
        $campaign = EmailCampaign::query()->find($this->campaignId);

        if (! $campaign || ! in_array($campaign->status, ['Sending', 'Sent'], true)) {
            return;
        }

        $contact = Contact::query()
            ->where('tenant_id', $campaign->tenant_id)
            ->whereKey($this->contactId)
            ->first();

        if (! $contact || $contact->email === '') {
            return;
        }

        $listing = $campaign->listing_id === null ? null : Listing::query()
            ->where('tenant_id', $campaign->tenant_id)
            ->whereKey($campaign->listing_id)
            ->first();

        $emails->send(new EmailMessage(
            to: [new EmailAddress($contact->email, trim("{$contact->first_name} {$contact->last_name}"))],
            subject: $campaign->subject,
            html: $renderer->html($campaign, $listing),
            text: $renderer->text($campaign, $listing),
            headers: [
                'X-Lifely-Campaign-Id' => $campaign->id,
                DemoEmailLimiter::TENANT_HEADER => $campaign->tenant_id,
                DemoEmailLimiter::RESERVED_HEADER => 'true',
            ]
        ));
    }
}
