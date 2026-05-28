<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\Rbac\Permissions;
use App\Support\Rbac\Roles;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class RbacApiTest extends TestCase
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

    public function test_authorized_user_can_manage_roles(): void
    {
        $admin = $this->actingOfficeAdmin();

        $create = $this->postJson('/api/v1/roles', [
            'name' => 'Customer Success',
            'guard_name' => 'web',
            'permissions' => [Permissions::CONTACTS_VIEW],
        ])->assertCreated();

        $roleId = $create->json('data.id');

        $this->getJson('/api/v1/roles')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Customer Success']);

        $this->patchJson("/api/v1/roles/{$roleId}", [
            'name' => 'Client Success',
            'permissions' => [Permissions::CONTACTS_VIEW, Permissions::REPORTS_VIEW],
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Client Success');

        $this->deleteJson("/api/v1/roles/{$roleId}")
            ->assertNoContent();

        $this->assertDatabaseMissing('roles', ['id' => $roleId]);
        $this->assertTrue($admin->hasRole(Roles::OFFICE_ADMIN));
    }

    public function test_unauthorized_user_cannot_manage_roles(): void
    {
        $this->actingSimpleAgent();

        $this->getJson('/api/v1/roles')->assertForbidden();
        $this->postJson('/api/v1/roles', ['name' => 'Blocked'])->assertForbidden();
    }

    public function test_authorized_user_can_manage_permissions(): void
    {
        $this->actingOfficeAdmin();

        $create = $this->postJson('/api/v1/permissions', [
            'name' => 'custom.workflow',
            'guard_name' => 'web',
        ])->assertCreated();

        $permissionId = $create->json('data.id');

        $this->getJson('/api/v1/permissions')
            ->assertOk()
            ->assertJsonFragment(['name' => 'custom.workflow']);

        $this->patchJson("/api/v1/permissions/{$permissionId}", [
            'name' => 'custom.workflow.update',
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'custom.workflow.update');

        $this->deleteJson("/api/v1/permissions/{$permissionId}")
            ->assertNoContent();

        $this->assertDatabaseMissing('permissions', ['id' => $permissionId]);
    }

    public function test_unauthorized_user_cannot_manage_permissions(): void
    {
        $this->actingSimpleAgent();

        $this->getJson('/api/v1/permissions')->assertForbidden();
        $this->postJson('/api/v1/permissions', ['name' => 'blocked.permission'])->assertForbidden();
    }

    public function test_authorized_user_can_sync_roles_to_a_user(): void
    {
        $this->actingOfficeAdmin();
        $target = User::factory()->create(['tenant_id' => $this->tenant->id, 'role' => Roles::SIMPLE_AGENT]);
        $target->assignRole(Roles::SIMPLE_AGENT);

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->putJson("/api/v1/users/{$target->id}/roles", [
                'roles' => [Roles::SALES],
            ])
            ->assertOk()
            ->assertJsonPath('data.roles.0', Roles::SALES);

        $this->assertTrue($target->fresh()->hasRole(Roles::SALES));
    }

    public function test_authorized_user_can_sync_direct_permissions_to_a_user(): void
    {
        $this->actingOfficeAdmin();
        $target = User::factory()->create(['tenant_id' => $this->tenant->id, 'role' => Roles::SIMPLE_AGENT]);

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->putJson("/api/v1/users/{$target->id}/permissions", [
                'permissions' => [Permissions::CONTACTS_VIEW],
            ])
            ->assertOk()
            ->assertJsonPath('data.direct_permissions.0', Permissions::CONTACTS_VIEW);

        $this->assertTrue($target->fresh()->hasDirectPermission(Permissions::CONTACTS_VIEW));
    }

    public function test_protects_last_office_admin_from_role_removal(): void
    {
        $admin = $this->actingOfficeAdmin();

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->putJson("/api/v1/users/{$admin->id}/roles", [
                'roles' => [Roles::SALES],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('roles');

        $this->assertTrue($admin->fresh()->hasRole(Roles::OFFICE_ADMIN));
    }

    public function test_protects_office_admin_role_and_admin_permissions_from_deletion(): void
    {
        $this->actingOfficeAdmin();
        $officeAdminRole = Role::findByName(Roles::OFFICE_ADMIN, 'web');
        $protectedPermission = Permission::findByName(Permissions::ROLES_VIEW, 'web');

        $this->deleteJson("/api/v1/roles/{$officeAdminRole->id}")
            ->assertUnprocessable();

        $this->deleteJson("/api/v1/permissions/{$protectedPermission->id}")
            ->assertUnprocessable();
    }

    public function test_authenticated_user_permissions_response_supports_the_spa(): void
    {
        $this->actingOfficeAdmin();

        $this->getJson('/api/v1/me/permissions')
            ->assertOk()
            ->assertJsonPath('data.roles.0', Roles::OFFICE_ADMIN)
            ->assertJsonFragment(['roles.view']);
    }

    private function actingOfficeAdmin(): User
    {
        $admin = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'role' => Roles::OFFICE_ADMIN,
        ]);

        $admin->assignRole(Roles::OFFICE_ADMIN);
        Sanctum::actingAs($admin, ['access']);

        return $admin;
    }

    private function actingSimpleAgent(): User
    {
        $agent = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'role' => Roles::SIMPLE_AGENT,
        ]);

        $agent->assignRole(Roles::SIMPLE_AGENT);
        Sanctum::actingAs($agent, ['access']);

        return $agent;
    }
}
