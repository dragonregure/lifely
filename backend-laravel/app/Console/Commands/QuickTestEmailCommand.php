<?php

namespace App\Console\Commands;

use App\Contracts\EmailSenderInterface;
use App\Jobs\SendQuickTestEmail;
use Illuminate\Console\Command;

class QuickTestEmailCommand extends Command
{
    protected $signature = 'lifely:quicktest-email
        {to=test@lifely.local : Recipient email address}
        {--sync : Send immediately instead of dispatching to the queue}';

    protected $description = 'Send a quick Lifely test email through the configured email sender.';

    public function handle(): int
    {
        $to = (string) $this->argument('to');
        $job = new SendQuickTestEmail($to);

        if ($this->option('sync')) {
            $job->handle(app(EmailSenderInterface::class));
            $this->info("Sent quick test email to {$to}.");

            return self::SUCCESS;
        }

        SendQuickTestEmail::dispatch($to);
        $this->info("Queued quick test email to {$to} on the emails queue.");

        return self::SUCCESS;
    }
}
