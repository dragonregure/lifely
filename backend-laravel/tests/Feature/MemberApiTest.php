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

class MemberApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed(RbacSeeder::class);
    }

    public function test_it_searches_members_in_paginated_mode_for_current_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $otherTenant = Tenant::factory()->create();
        $user = $this->actingUserWithPermissions($tenant, [Permissions::USERS_VIEW], [
            'name' => 'Maya Admin',
            'email' => 'maya.admin@example.test',
        ]);

        User::factory()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Maya Chen',
            'email' => 'maya@example.test',
            'role' => 'office_admin',
        ]);
        User::factory()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Noah Stone',
            'email' => 'noah@example.test',
            'role' => 'agent',
        ]);
        User::factory()->create([
            'tenant_id' => $otherTenant->id,
            'name' => 'Maya Outside',
            'email' => 'maya.outside@example.test',
        ]);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->getJson('/api/v1/members?page=1&per_page=10&search=maya')
            ->assertOk()
            ->assertJsonPath('data.0.name', $user->name)
            ->assertJsonPath('data.1.name', 'Maya Chen')
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.total', 2);
    }

    public function test_it_keeps_unpaginated_member_response_for_existing_consumers(): void
    {
        $tenant = Tenant::factory()->create();
        $user = $this->actingUserWithPermissions($tenant, [Permissions::USERS_VIEW], [
            'name' => 'Zara Admin',
        ]);

        User::factory()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Maya Chen',
        ]);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->getJson('/api/v1/members')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonMissingPath('meta')
            ->assertJsonPath('data.0.name', 'Maya Chen')
            ->assertJsonPath('data.1.name', $user->name);
    }

    /**
     * @param  array<int, string>  $permissions
     * @param  array<string, mixed>  $attributes
     */
    private function actingUserWithPermissions(Tenant $tenant, array $permissions, array $attributes = []): User
    {
        $user = User::factory()->create($attributes + ['tenant_id' => $tenant->id]);
        $user->givePermissionTo($permissions);
        Sanctum::actingAs($user, ['access']);

        return $user;
    }
}
