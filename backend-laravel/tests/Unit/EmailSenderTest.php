<?php

namespace Tests\Unit;

use App\Contracts\EmailSenderInterface;
use App\Services\Email\DemoLimitedEmailSender;
use App\Services\Email\LaravelMailEmailSender;
use App\Services\Email\ResendApiEmailSender;
use App\Support\Email\EmailAddress;
use App\Support\Email\EmailMessage;
use Illuminate\Mail\Transport\ArrayTransport;
use Illuminate\Support\Facades\Mail;
use InvalidArgumentException;
use Resend\Laravel\Transport\ResendTransportFactory;
use Tests\TestCase;

class EmailSenderTest extends TestCase
{
    public function test_it_binds_the_configured_mail_sender(): void
    {
        config(['lifely_email.sender' => 'mail']);

        $this->assertInstanceOf(LaravelMailEmailSender::class, app(EmailSenderInterface::class));

        config(['lifely_email.sender' => 'resend-api']);

        $this->assertInstanceOf(ResendApiEmailSender::class, app(EmailSenderInterface::class));
    }

    public function test_demo_mode_wraps_the_configured_sender_with_the_demo_limiter(): void
    {
        config([
            'lifely.app_mode' => 'demo',
            'lifely_email.sender' => 'mail',
        ]);

        $this->assertInstanceOf(DemoLimitedEmailSender::class, app(EmailSenderInterface::class));
    }

    public function test_laravel_mail_sender_builds_and_sends_a_message(): void
    {
        Mail::purge('array');
        config(['mail.default' => 'array']);

        $sender = new LaravelMailEmailSender();
        $delivery = $sender->send(new EmailMessage(
            to: [new EmailAddress('maya@example.com', 'Maya')],
            subject: 'Welcome to Lifely',
            html: '<p>Hello Maya</p>',
            text: 'Hello Maya',
            from: new EmailAddress('hello@lifely.test', 'Lifely'),
            replyTo: new EmailAddress('support@lifely.test', 'Support'),
            headers: ['X-Lifely-Test' => 'email-sender']
        ));

        $transport = Mail::mailer('array')->getSymfonyTransport();

        $this->assertInstanceOf(ArrayTransport::class, $transport);
        $this->assertSame('laravel-mail', $delivery->provider);
        $this->assertCount(1, $transport->messages());

        $message = $transport->messages()->first()->getOriginalMessage();

        $this->assertSame('Welcome to Lifely', $message->getSubject());
        $this->assertSame('maya@example.com', $message->getTo()[0]->getAddress());
        $this->assertSame('hello@lifely.test', $message->getFrom()[0]->getAddress());
        $this->assertSame('support@lifely.test', $message->getReplyTo()[0]->getAddress());
        $this->assertStringContainsString('Hello Maya', $message->getHtmlBody());
        $this->assertSame('Hello Maya', trim((string) $message->getTextBody()));
        $this->assertSame('email-sender', $message->getHeaders()->get('X-Lifely-Test')?->getBodyAsString());
    }

    public function test_configured_lifely_mailer_uses_laravel_mail(): void
    {
        Mail::purge('array');
        config([
            'lifely_email.sender' => 'mail',
            'lifely_email.mailer' => 'array',
            'mail.default' => 'log',
        ]);

        $delivery = app(EmailSenderInterface::class)->send(new EmailMessage(
            to: ['maya@example.com'],
            subject: 'Configured mailer',
            text: 'Sent through the configured Laravel mailer.'
        ));

        $transport = Mail::mailer('array')->getSymfonyTransport();

        $this->assertInstanceOf(ArrayTransport::class, $transport);
        $this->assertSame('laravel-mail', $delivery->provider);
        $this->assertSame(['mailer' => 'array'], $delivery->metadata);
        $this->assertCount(1, $transport->messages());
    }

    public function test_resend_mailer_resolves_the_resend_transport(): void
    {
        Mail::purge('resend');
        config([
            'mail.default' => 'resend',
            'resend.api_key' => 're_test_key',
            'services.resend.key' => 're_test_key',
        ]);

        $transport = Mail::mailer()->getSymfonyTransport();

        $this->assertInstanceOf(ResendTransportFactory::class, $transport);
    }

    public function test_email_message_requires_a_recipient(): void
    {
        $this->expectException(InvalidArgumentException::class);

        new EmailMessage(to: [], subject: 'Missing recipient', text: 'Hello');
    }

    public function test_email_message_requires_content(): void
    {
        $this->expectException(InvalidArgumentException::class);

        new EmailMessage(to: ['maya@example.com'], subject: 'Missing content');
    }
}
