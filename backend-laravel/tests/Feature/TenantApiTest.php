<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\Rbac\Permissions;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class TenantApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed(RbacSeeder::class);
    }

    public function test_it_shows_the_authenticated_users_tenant_by_default(): void
    {
        $tenant = Tenant::factory()->create(['name' => 'Skyline Realty']);
        $this->actingUserWithPermissions($tenant, [Permissions::TENANT_VIEW]);

        $this->getJson('/api/v1/tenant')
            ->assertOk()
            ->assertJsonPath('data.id', $tenant->id)
            ->assertJsonPath('data.name', 'Skyline Realty')
            ->assertJsonPath('data.created_at', $tenant->created_at?->toISOString());
    }

    public function test_it_rejects_tenant_show_without_permission(): void
    {
        $tenant = Tenant::factory()->create();
        $this->actingUserWithPermissions($tenant, []);

        $this->getJson('/api/v1/tenant')
            ->assertForbidden();
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
}
