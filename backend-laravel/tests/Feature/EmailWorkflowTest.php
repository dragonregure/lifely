<?php

namespace Tests\Feature;

use App\Contracts\EmailSenderInterface;
use App\Jobs\SendBulkEmailCampaign;
use App\Jobs\SendCampaignEmailToContact;
use App\Models\Contact;
use App\Models\EmailCampaign;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\Fakes\FakeEmailSender;
use Tests\TestCase;

class EmailWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_bulk_campaign_fans_out_recipient_jobs_on_the_email_queue(): void
    {
        Queue::fake();

        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $firstContact = Contact::factory()->create(['tenant_id' => $tenant->id, 'owner_id' => $user->id]);
        $secondContact = Contact::factory()->create(['tenant_id' => $tenant->id, 'owner_id' => $user->id]);
        $otherTenantContact = Contact::factory()->create();
        $campaign = EmailCampaign::factory()->create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'contact_ids' => [$firstContact->id, $secondContact->id, $otherTenantContact->id],
            'recipient_count' => 3,
            'status' => 'Queued',
        ]);

        (new SendBulkEmailCampaign($campaign->id))->handle(new FakeEmailSender());

        Queue::assertPushed(SendCampaignEmailToContact::class, 2);
        Queue::assertPushedOn('emails', SendCampaignEmailToContact::class);
        $this->assertSame('Sent', $campaign->refresh()->status);
    }

    public function test_campaign_recipient_job_sends_through_the_email_sender_contract(): void
    {
        $sender = new FakeEmailSender();
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $contact = Contact::factory()->create([
            'tenant_id' => $tenant->id,
            'owner_id' => $user->id,
            'first_name' => 'Maya',
            'last_name' => 'Nguyen',
            'email' => 'maya@example.com',
        ]);
        $campaign = EmailCampaign::factory()->create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'subject' => 'New listings',
            'body' => 'Here are the newest listings.',
            'contact_ids' => [$contact->id],
            'recipient_count' => 1,
            'status' => 'Sending',
        ]);

        (new SendCampaignEmailToContact($campaign->id, $contact->id))->handle($sender);

        $this->assertCount(1, $sender->messages);
        $this->assertSame('New listings', $sender->messages[0]->subject);
        $this->assertSame('maya@example.com', $sender->messages[0]->recipients()[0]->address);
        $this->assertSame($campaign->id, $sender->messages[0]->headers['X-Lifely-Campaign-Id']);
    }

    public function test_quicktest_email_command_can_send_synchronously(): void
    {
        $sender = new FakeEmailSender();
        $this->app->instance(EmailSenderInterface::class, $sender);

        $this->artisan('lifely:quicktest-email', [
            'to' => 'quick@example.com',
            '--sync' => true,
        ])->assertSuccessful();

        $this->assertCount(1, $sender->messages);
        $this->assertSame('quick@example.com', $sender->messages[0]->recipients()[0]->address);
    }

    public function test_quicktest_bulk_email_command_can_send_synchronously(): void
    {
        $sender = new FakeEmailSender();
        $this->app->instance(EmailSenderInterface::class, $sender);

        $this->artisan('lifely:quicktest-bulk-email', [
            '--to' => ['first@example.com', 'second@example.com'],
            '--sync' => true,
        ])->assertSuccessful();

        $this->assertCount(2, $sender->messages);
        $this->assertSame('Sent', EmailCampaign::query()->firstOrFail()->status);
    }
}
