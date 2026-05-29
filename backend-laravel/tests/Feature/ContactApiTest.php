<?php

namespace Tests\Feature;

use App\Contracts\ContactRepositoryInterface;
use App\Models\Contact;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Rbac\Permissions;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ContactApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_lists_contacts_for_the_current_tenant(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed(RbacSeeder::class);

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
}
