<?php

namespace App\Services\Email;

use App\Contracts\EmailSenderInterface;
use App\Support\Email\EmailAddress;
use App\Support\Email\EmailDelivery;
use App\Support\Email\EmailMessage;
use RuntimeException;

class ResendApiEmailSender implements EmailSenderInterface
{
    private const FACADE = 'Resend\\Laravel\\Facades\\Resend';

    public function send(EmailMessage $message): EmailDelivery
    {
        if (! class_exists(self::FACADE)) {
            throw new RuntimeException('Install the Resend Laravel package before using the resend-api email sender.');
        }

        $facade = self::FACADE;
        $response = $facade::emails()->send($this->payload($message));

        return new EmailDelivery(
            'resend-api',
            is_array($response) ? ($response['id'] ?? null) : null,
            ['response' => $response]
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(EmailMessage $message): array
    {
        $from = $message->from ?? new EmailAddress(
            (string) config('mail.from.address'),
            (string) config('mail.from.name')
        );

        $payload = [
            'from' => $this->formatAddress($from),
            'to' => array_map($this->formatAddress(...), $message->recipients()),
            'subject' => $message->subject,
        ];

        if ($message->html !== null) {
            $payload['html'] = $message->html;
        }

        if ($message->text !== null) {
            $payload['text'] = $message->text;
        }

        if ($message->cc() !== []) {
            $payload['cc'] = array_map($this->formatAddress(...), $message->cc());
        }

        if ($message->bcc() !== []) {
            $payload['bcc'] = array_map($this->formatAddress(...), $message->bcc());
        }

        if ($message->replyTo !== null) {
            $payload['reply_to'] = $this->formatAddress($message->replyTo);
        }

        if ($message->headers !== []) {
            $payload['headers'] = $message->headers;
        }

        return $payload;
    }

    private function formatAddress(EmailAddress $address): string
    {
        if ($address->name === null || $address->name === '') {
            return $address->address;
        }

        return "{$address->name} <{$address->address}>";
    }
}
