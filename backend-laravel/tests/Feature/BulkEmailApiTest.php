<?php

namespace Tests\Feature;

use App\Contracts\EmailCampaignRepositoryInterface;
use App\Models\Contact;
use App\Models\EmailCampaign;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Rbac\Permissions;
use App\Support\DataTables\DataTableQuery;
use Database\Seeders\RbacSeeder;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
