<?php

namespace Tests\Feature;

use App\Contracts\EmailCampaignRepositoryInterface;
use App\Models\Contact;
use App\Models\EmailCampaign;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BulkEmailApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_accepts_a_bulk_email_for_queueing(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        Sanctum::actingAs($user, ['access']);

        $firstContact = Contact::query()->create([
            'tenant_id' => $tenant->id,
            'owner_id' => $user->id,
            'first_name' => 'Ethan',
            'last_name' => 'Miller',
            'email' => 'ethan@example.com',
            'status' => 'Qualified',
        ]);
        $secondContact = Contact::query()->create([
            'tenant_id' => $tenant->id,
            'owner_id' => $user->id,
            'first_name' => 'Priya',
            'last_name' => 'Shah',
            'email' => 'priya@example.com',
            'status' => 'Viewing',
        ]);

        $this->app->bind(EmailCampaignRepositoryInterface::class, fn () => new class implements EmailCampaignRepositoryInterface {
            public function all(string $tenantId): Collection
            {
                return collect();
            }

            public function queue(string $tenantId, array $data): EmailCampaign
            {
                return new EmailCampaign([
                    'tenant_id' => $tenantId,
                    'user_id' => $data['user_id'] ?? null,
                    'subject' => $data['subject'],
                    'body' => $data['body'],
                    'contact_ids' => $data['contact_ids'],
                    'recipient_count' => count($data['contact_ids']),
                    'status' => 'Queued',
                ]);
            }
        });

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->postJson('/api/v1/bulk-emails', [
                'contact_ids' => [
                    $firstContact->id,
                    $secondContact->id,
                ],
                'subject' => 'New listings',
                'body' => 'Here are the latest matched properties.',
            ])
            ->assertAccepted()
            ->assertJsonPath('data.status', 'Queued')
            ->assertJsonPath('data.recipient_count', 2);
    }
}
