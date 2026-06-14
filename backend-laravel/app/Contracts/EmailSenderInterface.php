<?php

namespace App\Contracts;

use App\Support\Email\EmailDelivery;
use App\Support\Email\EmailMessage;

interface EmailSenderInterface
{
    public function send(EmailMessage $message): EmailDelivery;
}
