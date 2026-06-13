<?php

namespace App\Console\Commands;

use App\Contracts\EmailSenderInterface;
use App\Jobs\SendBulkEmailCampaign;
use App\Models\Contact;
use App\Models\EmailCampaign;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class QuickTestBulkEmailCommand extends Command
{
    protected $signature = 'lifely:quicktest-bulk-email
        {--to=* : Recipient email address. Repeat for multiple recipients}
        {--count=3 : Number of Mailpit test recipients to create when --to is omitted}
        {--sync : Fan out and send recipients immediately instead of dispatching to the queue}';

    protected $description = 'Create and queue a quick Lifely bulk email campaign for Mailpit testing.';

    public function handle(): int
    {
        $recipients = $this->recipients();

        if ($recipients === []) {
            $this->error('Provide at least one recipient or a count greater than zero.');

            return self::FAILURE;
        }

        $tenant = Tenant::query()->firstOrCreate(['name' => 'Lifely Quick Test']);
        $user = User::query()->firstOrCreate(
            ['email' => 'quicktest@lifely.local'],
            [
                'tenant_id' => $tenant->id,
                'role' => 'Admin',
                'name' => 'Lifely Quick Test',
                'password' => Hash::make(Str::random(32)),
            ]
        );

        $contactIds = collect($recipients)
            ->map(fn (string $email): string => Contact::query()->create([
                'tenant_id' => $tenant->id,
                'owner_id' => $user->id,
                'first_name' => 'Mailpit',
                'last_name' => 'Recipient',
                'email' => $email,
                'status' => true,
                'source' => Contact::SOURCE_EMAIL,
            ])->id)
            ->all();

        $campaign = EmailCampaign::query()->create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'subject' => 'Lifely quick test bulk email',
            'body' => 'This is a Lifely quick test bulk email generated from Artisan.',
            'contact_ids' => $contactIds,
            'recipient_count' => count($contactIds),
            'status' => 'Queued',
        ]);

        $job = new SendBulkEmailCampaign($campaign->id, (bool) $this->option('sync'));

        if ($this->option('sync')) {
            $job->handle(app(EmailSenderInterface::class));
            $this->info("Sent quick test bulk email campaign {$campaign->id} to {$campaign->recipient_count} recipients.");

            return self::SUCCESS;
        }

        SendBulkEmailCampaign::dispatch($campaign->id);
        $this->info("Queued quick test bulk email campaign {$campaign->id} for {$campaign->recipient_count} recipients.");

        return self::SUCCESS;
    }

    /**
     * @return array<int, string>
     */
    private function recipients(): array
    {
        $explicitRecipients = collect($this->option('to'))
            ->filter(fn (mixed $email): bool => is_string($email) && trim($email) !== '')
            ->map(fn (string $email): string => trim($email))
            ->unique()
            ->values()
            ->all();

        if ($explicitRecipients !== []) {
            return $explicitRecipients;
        }

        $count = max(0, (int) $this->option('count'));

        return collect(range(1, $count))
            ->map(fn (int $number): string => "bulk{$number}@lifely.local")
            ->all();
    }
}
