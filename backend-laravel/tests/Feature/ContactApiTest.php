<?php

namespace Tests\Feature;

use App\Contracts\ContactRepositoryInterface;
use App\Models\Contact;
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

class ContactApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed(RbacSeeder::class);
    }

    public function test_it_lists_contacts_for_the_current_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $user->givePermissionTo(Permissions::CONTACTS_VIEW);
        Sanctum::actingAs($user, ['access']);

        $this->app->bind(ContactRepositoryInterface::class, fn () => new class implements ContactRepositoryInterface {
            public function all(string $tenantId, array $filters = []): Collection
            {
                return collect([
                    new Contact([
                        'tenant_id' => $tenantId,
                        'first_name' => 'Ethan',
                        'last_name' => 'Miller',
                        'email' => 'ethan@example.com',
                        'status' => 'New',
                    ]),
                ]);
            }

            public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator
            {
                $items = $this->all($tenantId);

                return new Paginator($items, $items->count(), $dataTable->perPage, $dataTable->page);
            }

            public function find(string $tenantId, string $contactId): ?Contact
            {
                return null;
            }

            public function create(string $tenantId, array $data): Contact
            {
                return new Contact($data + ['tenant_id' => $tenantId]);
            }

            public function update(string $tenantId, string $contactId, array $data): ?Contact
            {
                return null;
            }

            public function delete(string $tenantId, string $contactId): bool
            {
                return false;
            }

            public function countByStatus(string $tenantId): Collection
            {
                return collect();
            }
        });

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->getJson('/api/v1/contacts')
            ->assertOk()
            ->assertJsonPath('data.0.first_name', 'Ethan')
            ->assertJsonPath('data.0.tenant_id', $tenant->id);
    }

    public function test_authorized_user_can_create_contact(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create(['tenant_id' => $tenant->id]);
        $user = $this->actingUserWithPermissions($tenant, [Permissions::CONTACTS_CREATE]);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->postJson('/api/v1/contacts', [
                'owner_id' => $owner->id,
                'first_name' => 'Nadia',
                'last_name' => 'Stone',
                'email' => 'nadia@example.com',
                'phone' => '+62811111111',
                'status' => 'New',
                'budget' => 450000,
                'source' => 'Referral',
                'last_contacted_at' => '2026-05-30T00:00:00Z',
            ])
            ->assertCreated()
            ->assertJsonPath('data.email', 'nadia@example.com')
            ->assertJsonPath('data.tenant_id', $tenant->id);

        $this->assertDatabaseHas('contacts', [
            'tenant_id' => $tenant->id,
            'owner_id' => $owner->id,
            'email' => 'nadia@example.com',
        ]);
        $this->assertDatabaseHas('activity_logs', [
            'tenant_id' => $tenant->id,
            'user_id' => $owner->id,
            'action_type' => 'contact.created',
        ]);
        $this->assertTrue($user->can(Permissions::CONTACTS_CREATE));
    }

    public function test_authorized_user_can_update_contact(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create(['tenant_id' => $tenant->id]);
        $this->actingUserWithPermissions($tenant, [Permissions::CONTACTS_UPDATE]);
        $contact = $this->createContact($tenant, $owner);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->patchJson("/api/v1/contacts/{$contact->id}", [
                'status' => 'Qualified',
                'budget' => 725000,
                'source' => 'Open house',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'Qualified')
            ->assertJsonPath('data.source', 'Open house');

        $this->assertDatabaseHas('contacts', [
            'id' => $contact->id,
            'status' => 'Qualified',
            'source' => 'Open house',
        ]);
        $this->assertDatabaseHas('activity_logs', [
            'tenant_id' => $tenant->id,
            'user_id' => $owner->id,
            'action_type' => 'contact.updated',
        ]);
    }

    public function test_authorized_user_can_delete_contact(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create(['tenant_id' => $tenant->id]);
        $this->actingUserWithPermissions($tenant, [Permissions::CONTACTS_DELETE]);
        $contact = $this->createContact($tenant, $owner);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->deleteJson("/api/v1/contacts/{$contact->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('contacts', ['id' => $contact->id]);
        $this->assertDatabaseHas('activity_logs', [
            'tenant_id' => $tenant->id,
            'user_id' => $owner->id,
            'action_type' => 'contact.deleted',
        ]);
    }

    public function test_unauthorized_user_cannot_delete_contact(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->create(['tenant_id' => $tenant->id]);
        $this->actingUserWithPermissions($tenant, [Permissions::CONTACTS_VIEW]);
        $contact = $this->createContact($tenant, $owner);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->deleteJson("/api/v1/contacts/{$contact->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('contacts', ['id' => $contact->id]);
    }

    public function test_contact_delete_is_scoped_to_current_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $otherTenant = Tenant::factory()->create();
        $owner = User::factory()->create(['tenant_id' => $otherTenant->id]);
        $this->actingUserWithPermissions($tenant, [Permissions::CONTACTS_DELETE]);
        $contact = $this->createContact($otherTenant, $owner);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->deleteJson("/api/v1/contacts/{$contact->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('contacts', ['id' => $contact->id]);
    }

    /**
     * @param  array<int, string>  $permissions
     */
    private function actingUserWithPermissions(Tenant $tenant, array $permissions): User
    {
        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $user->givePermissionTo($permissions);
        Sanctum::actingAs($user, ['access']);

        return $user;
    }

    private function createContact(Tenant $tenant, User $owner): Contact
    {
        return Contact::query()->create([
            'tenant_id' => $tenant->id,
            'owner_id' => $owner->id,
            'first_name' => 'Ethan',
            'last_name' => 'Miller',
            'email' => 'ethan@example.com',
            'phone' => '+62812345678',
            'status' => 'New',
            'budget' => 500000,
            'source' => 'Website',
            'last_contacted_at' => now(),
        ]);
    }
}
