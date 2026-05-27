<?php

namespace Tests\Feature;

use App\Contracts\ContactRepositoryInterface;
use App\Models\Contact;
use App\Models\User;
use Illuminate\Support\Collection;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ContactApiTest extends TestCase
{
    public function test_it_lists_contacts_for_the_current_tenant(): void
    {
        Sanctum::actingAs(new User(['tenant_id' => 'tenant-1']), ['access']);

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

        $this->withHeader('X-Tenant-Id', 'tenant-1')
            ->getJson('/api/v1/contacts')
            ->assertOk()
            ->assertJsonPath('data.0.first_name', 'Ethan')
            ->assertJsonPath('data.0.tenant_id', 'tenant-1');
    }
}
