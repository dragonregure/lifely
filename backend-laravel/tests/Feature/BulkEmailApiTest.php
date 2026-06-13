<?php

namespace Tests\Feature;

use App\Contracts\EmailCampaignRepositoryInterface;
use App\Models\Contact;
use App\Models\EmailCampaign;
use App\Models\Listing;
use App\Models\Tenant;
use App\Models\TenantEmailUsage;
use App\Models\User;
use App\Support\Rbac\Permissions;
use App\Support\DataTables\DataTableQuery;
use Database\Seeders\RbacSeeder;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Collection;
use Illuminate\Pagination\LengthAwarePaginator as Paginator;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class BulkEmailApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed(RbacSeeder::class);
    }

    public function test_it_accepts_a_bulk_email_for_queueing(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $user->givePermissionTo(Permissions::EMAIL_CAMPAIGNS_CREATE);
        Sanctum::actingAs($user, ['access']);

        $firstContact = Contact::query()->create([
            'tenant_id' => $tenant->id,
            'owner_id' => $user->id,
            'first_name' => 'Ethan',
            'last_name' => 'Miller',
            'email' => 'ethan@example.com',
            'status' => true,
        ]);
        $secondContact = Contact::query()->create([
            'tenant_id' => $tenant->id,
            'owner_id' => $user->id,
            'first_name' => 'Priya',
            'last_name' => 'Shah',
            'email' => 'priya@example.com',
            'status' => true,
        ]);
        $listing = Listing::factory()->create(['tenant_id' => $tenant->id]);

        $this->app->bind(EmailCampaignRepositoryInterface::class, fn () => new class implements EmailCampaignRepositoryInterface {
            public function all(string $tenantId): Collection
            {
                return collect();
            }

            public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator
            {
                return new Paginator([], 0, $dataTable->perPage, $dataTable->page);
            }

            public function queue(string $tenantId, array $data): EmailCampaign
            {
                return new EmailCampaign([
                    'tenant_id' => $tenantId,
                    'user_id' => $data['user_id'] ?? null,
                    'listing_id' => $data['listing_id'] ?? null,
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
                'listing_id' => $listing->id,
            ])
            ->assertAccepted()
            ->assertJsonPath('data.status', 'Queued')
            ->assertJsonPath('data.recipient_count', 2)
            ->assertJsonPath('data.listing_id', $listing->id);
    }

    public function test_it_queues_only_included_active_contacts(): void
    {
        Queue::fake();

        $tenant = Tenant::factory()->create();
        $otherTenant = Tenant::factory()->create();
        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $otherUser = User::factory()->create(['tenant_id' => $otherTenant->id]);
        $user->givePermissionTo(Permissions::EMAIL_CAMPAIGNS_CREATE);
        Sanctum::actingAs($user, ['access']);

        $includedContact = Contact::query()->create([
            'tenant_id' => $tenant->id,
            'owner_id' => $user->id,
            'first_name' => 'Ethan',
            'last_name' => 'Miller',
            'email' => 'ethan@example.com',
            'status' => true,
        ]);
        Contact::query()->create([
            'tenant_id' => $tenant->id,
            'owner_id' => $user->id,
            'first_name' => 'Priya',
            'last_name' => 'Shah',
            'email' => 'priya@example.com',
            'status' => true,
        ]);
        Contact::query()->create([
            'tenant_id' => $tenant->id,
            'owner_id' => $user->id,
            'first_name' => 'Inactive',
            'last_name' => 'Lead',
            'email' => 'inactive@example.com',
            'status' => false,
        ]);
        Contact::query()->create([
            'tenant_id' => $otherTenant->id,
            'owner_id' => $otherUser->id,
            'first_name' => 'Other',
            'last_name' => 'Tenant',
            'email' => 'other@example.com',
            'status' => true,
        ]);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->postJson('/api/v1/bulk-emails', [
                'all_active_contacts' => true,
                'included_contact_ids' => [$includedContact->id],
                'subject' => 'New listings',
                'body' => 'Here are the latest matched properties.',
            ])
            ->assertAccepted()
            ->assertJsonPath('data.status', 'Queued')
            ->assertJsonPath('data.recipient_count', 1);

        $this->assertDatabaseHas('email_campaigns', [
            'tenant_id' => $tenant->id,
            'recipient_count' => 1,
        ]);

        $campaign = EmailCampaign::query()->where('tenant_id', $tenant->id)->firstOrFail();
        $this->assertSame([$includedContact->id], $campaign->contact_ids);
    }

    public function test_it_rejects_excluded_contact_ids_for_all_active_campaigns(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $contact = Contact::factory()->create([
            'tenant_id' => $tenant->id,
            'owner_id' => $user->id,
            'status' => true,
        ]);
        $user->givePermissionTo(Permissions::EMAIL_CAMPAIGNS_CREATE);
        Sanctum::actingAs($user, ['access']);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->postJson('/api/v1/bulk-emails', [
                'all_active_contacts' => true,
                'excluded_contact_ids' => [$contact->id],
                'subject' => 'New listings',
                'body' => 'Here are the latest matched properties.',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('included_contact_ids');
    }

    public function test_demo_mode_rejects_bulk_email_when_recipient_count_exceeds_remaining_limit(): void
    {
        config([
            'lifely.app_mode' => 'demo',
            'lifely.demo_email_limit' => 3,
        ]);
        Queue::fake();

        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $user->givePermissionTo(Permissions::EMAIL_CAMPAIGNS_CREATE);
        Sanctum::actingAs($user, ['access']);

        EmailCampaign::factory()->create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'recipient_count' => 1,
            'status' => 'Sent',
        ]);

        $contacts = Contact::factory()
            ->count(3)
            ->create([
                'tenant_id' => $tenant->id,
                'owner_id' => $user->id,
                'status' => true,
            ]);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->postJson('/api/v1/bulk-emails', [
                'contact_ids' => $contacts->pluck('id')->all(),
                'subject' => 'New listings',
                'body' => 'Here are the latest matched properties.',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Email sending in demo limited to 3 times, you have 2 limit left.');

        $this->assertDatabaseCount('email_campaigns', 1);
        Queue::assertNothingPushed();
    }

    public function test_demo_mode_allows_bulk_email_that_fits_remaining_limit(): void
    {
        config([
            'lifely.app_mode' => 'demo',
            'lifely.demo_email_limit' => 3,
        ]);
        Queue::fake();

        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $user->givePermissionTo(Permissions::EMAIL_CAMPAIGNS_CREATE);
        Sanctum::actingAs($user, ['access']);

        EmailCampaign::factory()->create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'recipient_count' => 1,
            'status' => 'Sent',
        ]);

        $contacts = Contact::factory()
            ->count(2)
            ->create([
                'tenant_id' => $tenant->id,
                'owner_id' => $user->id,
                'status' => true,
            ]);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->postJson('/api/v1/bulk-emails', [
                'contact_ids' => $contacts->pluck('id')->all(),
                'subject' => 'New listings',
                'body' => 'Here are the latest matched properties.',
            ])
            ->assertAccepted()
            ->assertJsonPath('data.recipient_count', 2);

        $this->assertSame(3, TenantEmailUsage::query()->whereKey($tenant->id)->firstOrFail()->sent_count);
    }
}
