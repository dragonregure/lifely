<?php

namespace App\Jobs;

use App\Contracts\EmailSenderInterface;
use App\Support\Email\EmailAddress;
use App\Support\Email\EmailMessage;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendQuickTestEmail implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $to)
    {
        $this->onQueue('emails');
    }

    public function handle(EmailSenderInterface $emails): void
    {
        $emails->send(new EmailMessage(
            to: [new EmailAddress($this->to, 'Lifely Mail Test')],
            subject: 'Lifely quick test email',
            html: '<p>This is a Lifely quick test email.</p>',
            text: 'This is a Lifely quick test email.',
            headers: ['X-Lifely-Test' => 'quicktest-email']
        ));
    }
}
