<?php

namespace App\Jobs;

use App\Contracts\EmailSenderInterface;
use App\Models\Contact;
use App\Models\EmailCampaign;
use App\Support\Email\EmailAddress;
use App\Support\Email\EmailMessage;
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

    public function handle(EmailSenderInterface $emails): void
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

        $emails->send(new EmailMessage(
            to: [new EmailAddress($contact->email, trim("{$contact->first_name} {$contact->last_name}"))],
            subject: $campaign->subject,
            html: $this->htmlBody($campaign->body),
            text: $campaign->body,
            headers: [
                'X-Lifely-Campaign-Id' => $campaign->id,
                'X-Lifely-Tenant-Id' => $campaign->tenant_id,
            ]
        ));
    }

    private function htmlBody(string $body): string
    {
        return '<p>'.nl2br(e($body), false).'</p>';
    }
}
