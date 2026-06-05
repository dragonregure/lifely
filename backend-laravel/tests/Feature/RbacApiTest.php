<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Rbac\Permissions;
use App\Support\Rbac\Roles;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
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
        ])
            ->assertCreated()
            ->assertJsonPath('data.tenant_id', $this->tenant->id)
            ->assertJsonPath('data.is_system', false);

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

    public function test_system_bypass_permission_authorizes_gate_checks(): void
    {
        $user = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'role' => Roles::SIMPLE_AGENT,
        ]);
        $user->givePermissionTo(Permissions::SYSTEM_BYPASS);
        Sanctum::actingAs($user, ['access']);

        $this->assertTrue($user->can(Permissions::ROLES_CREATE));

        $this->getJson('/api/v1/roles')->assertOk();

        $this->postJson('/api/v1/roles', [
            'name' => 'Bypass Managed Role',
            'tenant_id' => null,
            'guard_name' => 'web',
        ])
            ->assertCreated()
            ->assertJsonPath('data.tenant_id', null)
            ->assertJsonPath('data.is_system', true);
    }

    public function test_system_bypass_user_can_manage_permissions(): void
    {
        $this->actingSystemAdmin();

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

    public function test_tenant_admin_cannot_create_update_or_delete_permissions(): void
    {
        $this->actingOfficeAdmin();
        $permission = Permission::findByName(Permissions::CONTACTS_VIEW, 'web');

        $this->getJson('/api/v1/permissions')->assertOk();

        $this->postJson('/api/v1/permissions', [
            'name' => 'blocked.permission',
            'guard_name' => 'web',
        ])->assertForbidden();

        $this->patchJson("/api/v1/permissions/{$permission->id}", [
            'name' => 'blocked.permission.update',
        ])->assertForbidden();

        $this->deleteJson("/api/v1/permissions/{$permission->id}")
            ->assertForbidden();
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

    public function test_tenant_can_access_system_and_own_roles_only(): void
    {
        $this->actingOfficeAdmin();
        $visibleTenantRole = Role::query()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Tenant Concierge',
            'guard_name' => 'web',
        ]);
        $otherTenant = Tenant::factory()->create();
        Role::query()->create([
            'tenant_id' => $otherTenant->id,
            'name' => 'Hidden Concierge',
            'guard_name' => 'web',
        ]);

        $response = $this->getJson('/api/v1/roles')
            ->assertOk()
            ->assertJsonFragment(['name' => Roles::OFFICE_ADMIN, 'is_system' => true])
            ->assertJsonFragment(['name' => 'Tenant Concierge', 'tenant_id' => $this->tenant->id])
            ->assertJsonMissing(['name' => 'Hidden Concierge']);

        $roleNames = collect($response->json('data'))->pluck('name')->all();

        $this->assertNotContains(Roles::SYSTEM_ADMIN, $roleNames);

        $this->getJson("/api/v1/roles/{$visibleTenantRole->id}")
            ->assertOk()
            ->assertJsonPath('data.name', 'Tenant Concierge');

        $systemAdminRole = Role::findByName(Roles::SYSTEM_ADMIN, 'web');

        $this->getJson("/api/v1/roles/{$systemAdminRole->id}")
            ->assertNotFound();
    }

    public function test_role_responses_include_permissions_only_when_requested(): void
    {
        $this->actingOfficeAdmin();

        $listResponse = $this->getJson('/api/v1/roles')
            ->assertOk();

        $officeAdmin = collect($listResponse->json('data'))->firstWhere('name', Roles::OFFICE_ADMIN);

        $this->assertIsArray($officeAdmin);
        $this->assertArrayNotHasKey('permissions', $officeAdmin);

        $includedListResponse = $this->getJson('/api/v1/roles?include[]=permissions')
            ->assertOk();

        $includedOfficeAdmin = collect($includedListResponse->json('data'))->firstWhere('name', Roles::OFFICE_ADMIN);

        $this->assertIsArray($includedOfficeAdmin);
        $this->assertArrayHasKey('permissions', $includedOfficeAdmin);
        $this->assertContains(Permissions::ROLES_VIEW, collect($includedOfficeAdmin['permissions'])->pluck('name')->all());

        $role = Role::findByName(Roles::OFFICE_ADMIN, 'web');

        $this->getJson("/api/v1/roles/{$role->id}")
            ->assertOk()
            ->assertJsonMissingPath('data.permissions');

        $this->getJson("/api/v1/roles/{$role->id}?include[]=permissions")
            ->assertOk()
            ->assertJsonFragment(['name' => Permissions::ROLES_VIEW]);
    }

    public function test_tenant_admin_cannot_modify_or_delete_system_roles(): void
    {
        $this->actingOfficeAdmin();
        $salesRole = Role::findByName(Roles::SALES, 'web');

        $this->patchJson("/api/v1/roles/{$salesRole->id}", [
            'name' => 'Sales Updated',
        ])->assertForbidden();

        $this->deleteJson("/api/v1/roles/{$salesRole->id}")
            ->assertForbidden();
    }

    public function test_roles_manage_system_permission_allows_system_role_management(): void
    {
        $admin = $this->actingOfficeAdmin();
        $admin->givePermissionTo(Permissions::ROLES_MANAGE_SYSTEM);

        $create = $this->postJson('/api/v1/roles', [
            'name' => 'System Operator',
            'tenant_id' => null,
            'guard_name' => 'web',
            'permissions' => [Permissions::ROLES_MANAGE_SYSTEM],
        ])
            ->assertCreated()
            ->assertJsonPath('data.tenant_id', null)
            ->assertJsonPath('data.is_system', true);

        $roleId = $create->json('data.id');

        $this->patchJson("/api/v1/roles/{$roleId}", [
            'name' => 'System Operator Updated',
            'permissions' => [Permissions::REFERENCES_MANAGE_SYSTEM],
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'System Operator Updated');

        $this->deleteJson("/api/v1/roles/{$roleId}")
            ->assertNoContent();
    }

    public function test_permission_index_hides_system_only_permissions_from_tenant_admins(): void
    {
        $this->actingOfficeAdmin();

        $tenantResponse = $this->getJson('/api/v1/permissions')
            ->assertOk();

        $tenantPermissions = collect($tenantResponse->json('data'))->pluck('name')->all();

        $this->assertNotContains(Permissions::SYSTEM_BYPASS, $tenantPermissions);
        $this->assertNotContains(Permissions::ROLES_MANAGE_SYSTEM, $tenantPermissions);
        $this->assertNotContains(Permissions::REFERENCES_MANAGE_SYSTEM, $tenantPermissions);

        $this->actingSystemAdmin();

        $systemResponse = $this->getJson('/api/v1/permissions')
            ->assertOk();

        $systemPermissions = collect($systemResponse->json('data'))->pluck('name')->all();

        $this->assertContains(Permissions::SYSTEM_BYPASS, $systemPermissions);
        $this->assertContains(Permissions::ROLES_MANAGE_SYSTEM, $systemPermissions);
        $this->assertContains(Permissions::REFERENCES_MANAGE_SYSTEM, $systemPermissions);
    }

    public function test_permission_responses_include_roles_only_when_requested(): void
    {
        $this->actingOfficeAdmin();

        $listResponse = $this->getJson('/api/v1/permissions')
            ->assertOk();

        $contactsView = collect($listResponse->json('data'))->firstWhere('name', Permissions::CONTACTS_VIEW);

        $this->assertIsArray($contactsView);
        $this->assertArrayNotHasKey('roles', $contactsView);

        $includedListResponse = $this->getJson('/api/v1/permissions?include[]=roles')
            ->assertOk();

        $includedContactsView = collect($includedListResponse->json('data'))->firstWhere('name', Permissions::CONTACTS_VIEW);

        $this->assertIsArray($includedContactsView);
        $this->assertArrayHasKey('roles', $includedContactsView);
        $this->assertContains(Roles::OFFICE_ADMIN, collect($includedContactsView['roles'])->pluck('name')->all());

        $permission = Permission::findByName(Permissions::CONTACTS_VIEW, 'web');

        $this->getJson("/api/v1/permissions/{$permission->id}")
            ->assertOk()
            ->assertJsonMissingPath('data.roles');

        $this->getJson("/api/v1/permissions/{$permission->id}?include[]=roles")
            ->assertOk()
            ->assertJsonFragment(['name' => Roles::OFFICE_ADMIN]);
    }

    public function test_tenant_admin_cannot_assign_system_only_permissions_to_roles(): void
    {
        $this->actingOfficeAdmin();

        $this->postJson('/api/v1/roles', [
            'name' => 'Escalated Tenant Role',
            'guard_name' => 'web',
            'permissions' => [Permissions::SYSTEM_BYPASS],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('permissions');

        $role = Role::query()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Tenant Operator',
            'guard_name' => 'web',
        ]);

        $this->patchJson("/api/v1/roles/{$role->id}", [
            'permissions' => [Permissions::REFERENCES_MANAGE_SYSTEM],
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('permissions');
    }

    public function test_role_assignment_rejects_roles_outside_the_current_tenant_scope(): void
    {
        $this->actingOfficeAdmin();
        $otherTenant = Tenant::factory()->create();
        Role::query()->create([
            'tenant_id' => $otherTenant->id,
            'name' => 'Other Tenant Operator',
            'guard_name' => 'web',
        ]);
        $target = User::factory()->create(['tenant_id' => $this->tenant->id, 'role' => Roles::SIMPLE_AGENT]);

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->putJson("/api/v1/users/{$target->id}/roles", [
                'roles' => ['Other Tenant Operator'],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('roles');
    }

    public function test_tenant_admin_cannot_assign_system_permission_roles_to_users(): void
    {
        $this->actingOfficeAdmin();
        $target = User::factory()->create(['tenant_id' => $this->tenant->id, 'role' => Roles::SIMPLE_AGENT]);

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->putJson("/api/v1/users/{$target->id}/roles", [
                'roles' => [Roles::SYSTEM_ADMIN],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('roles');

        $this->assertFalse($target->fresh()->hasRole(Roles::SYSTEM_ADMIN));
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
        $this->actingSystemAdmin();
        $officeAdminRole = Role::findByName(Roles::OFFICE_ADMIN, 'web');
        $protectedPermission = Permission::findByName(Permissions::ROLES_VIEW, 'web');

        $this->deleteJson("/api/v1/roles/{$officeAdminRole->id}")
            ->assertUnprocessable();

        $this->deleteJson("/api/v1/permissions/{$protectedPermission->id}")
            ->assertUnprocessable();
    }

    public function test_tenant_admin_cannot_assign_system_only_permissions_directly(): void
    {
        $this->actingOfficeAdmin();
        $target = User::factory()->create(['tenant_id' => $this->tenant->id, 'role' => Roles::SIMPLE_AGENT]);

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->putJson("/api/v1/users/{$target->id}/permissions", [
                'permissions' => [
                    Permissions::PERMISSIONS_CREATE,
                    Permissions::ROLES_MANAGE_SYSTEM,
                    Permissions::REFERENCES_MANAGE_SYSTEM,
                    Permissions::SYSTEM_BYPASS,
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('permissions');
    }

    public function test_authenticated_user_permissions_response_supports_the_spa(): void
    {
        $this->actingOfficeAdmin();

        $response = $this->getJson('/api/v1/me/permissions')
            ->assertOk()
            ->assertJsonPath('data.roles.0', Roles::OFFICE_ADMIN)
            ->assertJsonFragment(['roles.view']);

        $permissions = $response->json('data.permissions');

        $this->assertIsArray($permissions);
        $this->assertNotContains(Permissions::PERMISSIONS_CREATE, $permissions);
        $this->assertNotContains(Permissions::PERMISSIONS_UPDATE, $permissions);
        $this->assertNotContains(Permissions::PERMISSIONS_DELETE, $permissions);
        $this->assertNotContains(Permissions::ROLES_MANAGE_SYSTEM, $permissions);
        $this->assertNotContains(Permissions::REFERENCES_MANAGE_SYSTEM, $permissions);
        $this->assertNotContains(Permissions::SYSTEM_BYPASS, $permissions);
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

    private function actingSystemAdmin(): User
    {
        $admin = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'role' => Roles::SYSTEM_ADMIN,
        ]);

        $admin->assignRole(Roles::SYSTEM_ADMIN);
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
