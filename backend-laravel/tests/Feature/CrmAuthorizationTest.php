<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\Rbac\Roles;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class CrmAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed(RbacSeeder::class);
        $this->tenant = Tenant::factory()->create();
    }

    public function test_unprivileged_user_cannot_read_crm_modules(): void
    {
        $this->actingUnprivilegedUser();

        foreach ($this->readEndpoints() as $endpoint) {
            $this->withHeader('X-Tenant-Id', $this->tenant->id)
                ->getJson($endpoint)
                ->assertForbidden();
        }
    }

    public function test_unprivileged_user_cannot_write_crm_modules(): void
    {
        $this->actingUnprivilegedUser();

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->postJson('/api/v1/contacts')
            ->assertForbidden();

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->postJson('/api/v1/listings')
            ->assertForbidden();

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->postJson('/api/v1/leads')
            ->assertForbidden();

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->postJson('/api/v1/bulk-emails')
            ->assertForbidden();
    }

    public function test_office_admin_can_read_crm_modules(): void
    {
        $user = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'role' => Roles::OFFICE_ADMIN,
        ]);
        $user->assignRole(Roles::OFFICE_ADMIN);
        Sanctum::actingAs($user, ['access']);

        foreach ($this->readEndpoints() as $endpoint) {
            $this->withHeader('X-Tenant-Id', $this->tenant->id)
                ->getJson($endpoint)
                ->assertOk();
        }
    }

    /**
     * @return array<int, string>
     */
    private function readEndpoints(): array
    {
        return [
            '/api/v1/tenant',
            '/api/v1/members',
            '/api/v1/dashboard',
            '/api/v1/contacts',
            '/api/v1/listings',
            '/api/v1/leads',
            '/api/v1/activity-logs',
            '/api/v1/email-campaigns',
        ];
    }

    private function actingUnprivilegedUser(): User
    {
        $user = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'role' => Roles::SIMPLE_AGENT,
        ]);
        Sanctum::actingAs($user, ['access']);

        return $user;
    }
}
