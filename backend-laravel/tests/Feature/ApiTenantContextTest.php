<?php

namespace Tests\Feature;

use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ApiTenantContextTest extends TestCase
{
    public function test_tenant_scoped_endpoints_require_authentication(): void
    {
        $this->getJson('/api/v1/contacts')
            ->assertUnauthorized();
    }

    public function test_tenant_header_cannot_cross_the_authenticated_users_tenant(): void
    {
        Sanctum::actingAs(new User(['tenant_id' => 'tenant-a']), ['access']);

        $this->withHeader('X-Tenant-Id', 'tenant-b')
            ->getJson('/api/v1/contacts')
            ->assertForbidden();
    }

    public function test_health_check_does_not_require_tenant_context(): void
    {
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertJsonPath('status', 'ok');
    }
}
