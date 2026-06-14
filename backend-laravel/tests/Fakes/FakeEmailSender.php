<?php

namespace Tests\Fakes;

use App\Contracts\EmailSenderInterface;
use App\Support\Email\EmailDelivery;
use App\Support\Email\EmailMessage;

class FakeEmailSender implements EmailSenderInterface
{
    /**
     * @var array<int, EmailMessage>
     */
    public array $messages = [];

    public function send(EmailMessage $message): EmailDelivery
    {
        $this->messages[] = $message;

        return new EmailDelivery('fake', 'fake-message-id');
    }
}
