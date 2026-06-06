<?php

namespace Tests\Feature;

use App\Models\Reference;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Rbac\Permissions;
use App\Support\Rbac\Roles;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ReferenceApiTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private Tenant $otherTenant;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed(RbacSeeder::class);

        $this->tenant = Tenant::factory()->create();
        $this->otherTenant = Tenant::factory()->create();
    }

    public function test_it_lists_system_and_current_tenant_references_only(): void
    {
        $this->actingOfficeAdmin();

        Reference::factory()->system()->create([
            'group' => 'street_type',
            'reference_key' => 'ave',
            'value' => 'Avenue',
        ]);
        Reference::factory()->create([
            'tenant_id' => $this->tenant->id,
            'group' => 'street_type',
            'reference_key' => 'mews',
            'value' => 'Mews',
        ]);
        Reference::factory()->create([
            'tenant_id' => $this->otherTenant->id,
            'group' => 'street_type',
            'reference_key' => 'hidden',
            'value' => 'Hidden',
        ]);

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->getJson('/api/v1/references?group=street_type')
            ->assertOk()
            ->assertJsonFragment(['key' => 'ave', 'is_system' => true])
            ->assertJsonFragment(['key' => 'mews', 'tenant_id' => $this->tenant->id])
            ->assertJsonMissing(['key' => 'hidden']);
    }

    public function test_reference_type_options_are_not_limited_by_current_table_results(): void
    {
        $this->actingOfficeAdmin();

        Reference::factory()->system()->create([
            'group' => Reference::GROUP_REFERENCE_TYPE,
            'reference_key' => 'string',
            'value' => 'String',
        ]);
        Reference::factory()->system()->create([
            'group' => Reference::GROUP_REFERENCE_TYPE,
            'reference_key' => 'int',
            'value' => 'Integer',
        ]);
        Reference::factory()->system()->create([
            'group' => 'lead_stage',
            'reference_key' => 'new_lead',
            'value' => 'New Lead',
        ]);

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->getJson('/api/v1/references?filter[group]=missing_group')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->getJson('/api/v1/references/types')
            ->assertOk()
            ->assertJsonFragment(['label' => 'String', 'value' => 'string'])
            ->assertJsonFragment(['label' => 'Integer', 'value' => 'int'])
            ->assertJsonMissing(['label' => 'Lead Stage', 'value' => 'lead_stage']);

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->getJson('/api/v1/references/groups')
            ->assertOk()
            ->assertJsonFragment(['label' => 'Lead Stage', 'value' => 'lead_stage'])
            ->assertJsonFragment(['label' => 'Reference Type', 'value' => Reference::GROUP_REFERENCE_TYPE]);
    }

    public function test_reference_values_are_cast_by_reference_type(): void
    {
        $this->actingOfficeAdmin();

        Reference::factory()->system()->create([
            'group' => 'typed_values',
            'reference_key' => 'max_retries',
            'value' => '3',
            'type' => 'int',
        ]);
        Reference::factory()->system()->create([
            'group' => 'typed_values',
            'reference_key' => 'enabled',
            'value' => 'true',
            'type' => 'bool',
        ]);

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->getJson('/api/v1/references?filter[group]=typed_values')
            ->assertOk()
            ->assertJsonFragment(['key' => 'max_retries', 'value' => 3])
            ->assertJsonFragment(['key' => 'enabled', 'value' => true]);
    }

    public function test_authorized_user_can_create_update_and_delete_tenant_reference(): void
    {
        $this->actingOfficeAdmin();

        $create = $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->postJson('/api/v1/references', [
                'group' => 'street_type',
                'key' => 'cres',
                'value' => 'Crescent',
                'type' => 'string',
            ])
            ->assertCreated()
            ->assertJsonPath('data.tenant_id', $this->tenant->id)
            ->assertJsonPath('data.key', 'cres');

        $referenceId = $create->json('data.id');

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->patchJson("/api/v1/references/{$referenceId}", [
                'value' => 'Crescent Road',
            ])
            ->assertOk()
            ->assertJsonPath('data.value', 'Crescent Road');

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->deleteJson("/api/v1/references/{$referenceId}")
            ->assertNoContent();

        $this->assertSoftDeleted('references', ['id' => $referenceId]);
    }

    public function test_system_admin_can_create_system_reference_and_other_tenants_can_read_it(): void
    {
        $this->actingSystemAdmin();

        $create = $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->postJson('/api/v1/references', [
                'tenant_id' => null,
                'group' => 'street_type',
                'key' => 'trl',
                'value' => 'Trail',
            ])
            ->assertCreated()
            ->assertJsonPath('data.tenant_id', null)
            ->assertJsonPath('data.is_system', true);

        $this->actingOfficeAdmin($this->otherTenant);

        $this->withHeader('X-Tenant-Id', $this->otherTenant->id)
            ->getJson('/api/v1/references?group=street_type')
            ->assertOk()
            ->assertJsonFragment(['id' => $create->json('data.id'), 'key' => 'trl']);
    }

    public function test_system_reference_write_is_authorized_by_permission(): void
    {
        $user = $this->actingOfficeAdmin();
        $user->givePermissionTo(Permissions::REFERENCES_MANAGE_SYSTEM);

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->postJson('/api/v1/references', [
                'tenant_id' => null,
                'group' => 'street_type',
                'key' => 'walk',
                'value' => 'Walk',
            ])
            ->assertCreated()
            ->assertJsonPath('data.tenant_id', null);
    }

    public function test_system_bypass_permission_can_manage_system_references(): void
    {
        $user = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'role' => Roles::SIMPLE_AGENT,
        ]);
        $user->givePermissionTo(Permissions::SYSTEM_BYPASS);
        Sanctum::actingAs($user, ['access']);

        $create = $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->postJson('/api/v1/references', [
                'tenant_id' => null,
                'group' => 'street_type',
                'key' => 'bypass',
                'value' => 'Bypass',
            ])
            ->assertCreated()
            ->assertJsonPath('data.tenant_id', null);

        $referenceId = $create->json('data.id');

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->patchJson("/api/v1/references/{$referenceId}", [
                'value' => 'Bypass Updated',
            ])
            ->assertOk()
            ->assertJsonPath('data.value', 'Bypass Updated');

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->deleteJson("/api/v1/references/{$referenceId}")
            ->assertNoContent();
    }

    public function test_office_admin_cannot_create_or_update_system_references(): void
    {
        $this->actingOfficeAdmin();
        $reference = Reference::factory()->system()->create([
            'group' => 'street_type',
            'reference_key' => 'sys',
            'value' => 'System',
        ]);

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->postJson('/api/v1/references', [
                'tenant_id' => null,
                'group' => 'street_type',
                'key' => 'trl',
                'value' => 'Trail',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('tenant_id');

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->patchJson("/api/v1/references/{$reference->id}", [
                'value' => 'Updated system',
            ])
            ->assertForbidden();
    }

    public function test_unauthorized_user_cannot_manage_references(): void
    {
        $user = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'role' => Roles::SIMPLE_AGENT,
        ]);
        Sanctum::actingAs($user, ['access']);

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->getJson('/api/v1/references')
            ->assertForbidden();
    }

    public function test_it_rejects_duplicate_group_and_key_within_the_same_scope(): void
    {
        $this->actingOfficeAdmin();

        Reference::factory()->create([
            'tenant_id' => $this->tenant->id,
            'group' => 'street_type',
            'reference_key' => 'ave',
        ]);

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->postJson('/api/v1/references', [
                'group' => 'street_type',
                'key' => 'ave',
                'value' => 'Avenue',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['group', 'key']);
    }

    public function test_only_system_admin_can_delete_system_reference_type_records(): void
    {
        $this->actingOfficeAdmin();

        $reference = Reference::factory()->system()->create([
            'group' => Reference::GROUP_REFERENCE_TYPE,
            'reference_key' => 'street_type',
            'value' => 'Street Type',
        ]);

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->deleteJson("/api/v1/references/{$reference->id}")
            ->assertForbidden();

        $this->actingSystemAdmin();

        $this->withHeader('X-Tenant-Id', $this->tenant->id)
            ->deleteJson("/api/v1/references/{$reference->id}")
            ->assertNoContent();

        $this->assertSoftDeleted('references', ['id' => $reference->id]);
    }

    private function actingOfficeAdmin(?Tenant $tenant = null): User
    {
        $user = User::factory()->create([
            'tenant_id' => ($tenant ?? $this->tenant)->id,
            'role' => Roles::OFFICE_ADMIN,
        ]);

        $user->assignRole(Roles::OFFICE_ADMIN);
        Sanctum::actingAs($user, ['access']);

        return $user;
    }

    private function actingSystemAdmin(?Tenant $tenant = null): User
    {
        $user = User::factory()->create([
            'tenant_id' => ($tenant ?? $this->tenant)->id,
            'role' => Roles::SYSTEM_ADMIN,
        ]);

        $user->assignRole(Roles::SYSTEM_ADMIN);
        Sanctum::actingAs($user, ['access']);

        return $user;
    }
}
