<?php

namespace App\Services\Email;

use App\Contracts\EmailSenderInterface;
use App\Support\Email\EmailDelivery;
use App\Support\Email\EmailMessage;

class DemoLimitedEmailSender implements EmailSenderInterface
{
    public function __construct(
        private readonly EmailSenderInterface $sender,
        private readonly DemoEmailLimiter $limiter
    ) {
    }

    public function send(EmailMessage $message): EmailDelivery
    {
        $tenantId = $message->headers[DemoEmailLimiter::TENANT_HEADER] ?? null;
        $reserved = strtolower((string) ($message->headers[DemoEmailLimiter::RESERVED_HEADER] ?? '')) === 'true';

        if (is_string($tenantId) && $tenantId !== '' && ! $reserved) {
            $this->limiter->reserve($tenantId, $this->recipientCount($message));
        }

        return $this->sender->send($message);
    }

    private function recipientCount(EmailMessage $message): int
    {
        return count($message->recipients()) + count($message->cc()) + count($message->bcc());
    }
}
