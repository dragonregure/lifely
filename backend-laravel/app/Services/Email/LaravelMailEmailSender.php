<?php

namespace App\Services\Email;

use App\Contracts\EmailSenderInterface;
use App\Support\Email\EmailAddress;
use App\Support\Email\EmailDelivery;
use App\Support\Email\EmailMessage;
use Illuminate\Mail\Message;
use Illuminate\Support\HtmlString;
use Illuminate\Support\Facades\Mail;

class LaravelMailEmailSender implements EmailSenderInterface
{
    public function __construct(private readonly ?string $mailer = null)
    {
    }

    public function send(EmailMessage $message): EmailDelivery
    {
        $mailer = $this->mailer === null || $this->mailer === ''
            ? Mail::mailer()
            : Mail::mailer($this->mailer);

        $sentMessage = $mailer->send($this->viewPayload($message), [], function (Message $mail) use ($message): void {
            $this->applyEnvelope($mail, $message);
        });

        return new EmailDelivery(
            'laravel-mail',
            $sentMessage?->getSymfonySentMessage()->getMessageId(),
            ['mailer' => $this->mailer]
        );
    }

    /**
     * @return array{html?: HtmlString, raw?: string}
     */
    private function viewPayload(EmailMessage $message): array
    {
        if ($message->html !== null) {
            return ['html' => new HtmlString($message->html)];
        }

        return ['raw' => (string) $message->text];
    }

    private function applyEnvelope(Message $mail, EmailMessage $message): void
    {
        foreach ($message->recipients() as $recipient) {
            $mail->to($recipient->address, $recipient->name);
        }

        foreach ($message->cc() as $recipient) {
            $mail->cc($recipient->address, $recipient->name);
        }

        foreach ($message->bcc() as $recipient) {
            $mail->bcc($recipient->address, $recipient->name);
        }

        if ($message->from !== null) {
            $mail->from($message->from->address, $message->from->name);
        }

        if ($message->replyTo !== null) {
            $mail->replyTo($message->replyTo->address, $message->replyTo->name);
        }

        foreach ($message->headers as $name => $value) {
            $mail->getHeaders()->addTextHeader($name, $value);
        }

        if ($message->text !== null && $message->html !== null) {
            $mail->getSymfonyMessage()->text($message->text);
        }

        $mail->subject($message->subject);
    }
}
