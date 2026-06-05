<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\Listing;
use App\Models\Pipeline;
use App\Models\Reference;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Rbac\Permissions;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class PipelineApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed(RbacSeeder::class);
    }

    public function test_authorized_user_can_create_pipeline_with_readable_stage_and_listing_value(): void
    {
        $tenant = Tenant::factory()->create();
        $actor = $this->actingUserWithPermissions($tenant, [Permissions::PIPELINE_CREATE, Permissions::PIPELINE_VIEW]);
        $contact = $this->createContact($tenant, $actor);
        $listing = $this->createListing($tenant, 875000);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->postJson('/api/v1/pipeline', [
                'contact_id' => $contact->id,
                'listing_id' => $listing->id,
                'user_id' => $actor->id,
                'stage' => 'Qualified',
                'next_task' => 'Confirm budget and timeline',
            ])
            ->assertCreated()
            ->assertJsonPath('data.stage', 'Qualified')
            ->assertJsonPath('data.source_id', Pipeline::SOURCE_MANUAL_ENTRY)
            ->assertJsonPath('data.source', 'Manual Entry')
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.value', 875000);

        $this->assertDatabaseHas('pipelines', [
            'tenant_id' => $tenant->id,
            'contact_id' => $contact->id,
            'listing_id' => $listing->id,
            'stage' => Pipeline::STAGE_QUALIFIED,
            'source' => Pipeline::SOURCE_MANUAL_ENTRY,
            'is_active' => true,
        ]);

        $this->assertFalse(Schema::hasColumn('pipelines', 'value'));

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->getJson('/api/v1/pipeline')
            ->assertOk()
            ->assertJsonPath('data.0.stage', 'Qualified')
            ->assertJsonPath('data.0.source', 'Manual Entry')
            ->assertJsonPath('data.0.value', 875000);
    }

    public function test_authorized_user_can_update_pipeline_stage_with_integer_storage(): void
    {
        $tenant = Tenant::factory()->create();
        $actor = $this->actingUserWithPermissions($tenant, [Permissions::PIPELINE_UPDATE]);
        $contact = $this->createContact($tenant, $actor);
        $listing = $this->createListing($tenant, 645000);
        $pipeline = Pipeline::query()->create([
            'tenant_id' => $tenant->id,
            'contact_id' => $contact->id,
            'listing_id' => $listing->id,
            'user_id' => $actor->id,
            'stage' => Pipeline::STAGE_CONTACTED,
        ]);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->patchJson("/api/v1/pipeline/{$pipeline->id}/stage", [
                'stage' => 'Closed Won',
            ])
            ->assertOk()
            ->assertJsonPath('data.stage', 'Closed Won')
            ->assertJsonPath('data.value', 645000);

        $this->assertDatabaseHas('pipelines', [
            'id' => $pipeline->id,
            'stage' => Pipeline::STAGE_CLOSED_WON,
        ]);
    }

    public function test_assigned_user_can_update_manual_pipeline_overview(): void
    {
        $tenant = Tenant::factory()->create();
        $actor = $this->actingUserWithPermissions($tenant, [Permissions::PIPELINE_UPDATE]);
        $contact = $this->createContact($tenant, $actor);
        $nextContact = $this->createContact($tenant, $actor);
        $listing = $this->createListing($tenant, 645000);
        $nextListing = $this->createListing($tenant, 755000);
        $pipeline = Pipeline::query()->create([
            'tenant_id' => $tenant->id,
            'contact_id' => $contact->id,
            'listing_id' => $listing->id,
            'user_id' => $actor->id,
            'stage' => Pipeline::STAGE_CONTACTED,
            'source' => Pipeline::SOURCE_MANUAL_ENTRY,
        ]);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->patchJson("/api/v1/pipeline/{$pipeline->id}", [
                'contact_id' => $nextContact->id,
                'listing_id' => $nextListing->id,
                'stage' => 'Negotiating',
                'is_active' => false,
                'next_task' => 'Send revised offer.',
            ])
            ->assertOk()
            ->assertJsonPath('data.contact_id', $nextContact->id)
            ->assertJsonPath('data.listing_id', $nextListing->id)
            ->assertJsonPath('data.stage', 'Negotiating')
            ->assertJsonPath('data.is_active', false)
            ->assertJsonPath('data.next_task', 'Send revised offer.');

        $this->assertDatabaseHas('pipelines', [
            'id' => $pipeline->id,
            'contact_id' => $nextContact->id,
            'listing_id' => $nextListing->id,
            'stage' => Pipeline::STAGE_NEGOTIATING,
            'is_active' => false,
        ]);
    }

    public function test_non_assigned_user_cannot_update_pipeline_progress_fields(): void
    {
        $tenant = Tenant::factory()->create();
        $assignee = User::factory()->create(['tenant_id' => $tenant->id]);
        $actor = $this->actingUserWithPermissions($tenant, [Permissions::PIPELINE_UPDATE]);
        $contact = $this->createContact($tenant, $actor);
        $listing = $this->createListing($tenant, 645000);
        $pipeline = Pipeline::query()->create([
            'tenant_id' => $tenant->id,
            'contact_id' => $contact->id,
            'listing_id' => $listing->id,
            'user_id' => $assignee->id,
            'stage' => Pipeline::STAGE_CONTACTED,
        ]);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->patchJson("/api/v1/pipeline/{$pipeline->id}", [
                'stage' => 'Closed Won',
            ])
            ->assertForbidden();

        $this->assertDatabaseHas('pipelines', [
            'id' => $pipeline->id,
            'stage' => Pipeline::STAGE_CONTACTED,
        ]);
    }

    public function test_assign_to_self_permission_can_only_assign_current_user(): void
    {
        $tenant = Tenant::factory()->create();
        $assignee = User::factory()->create(['tenant_id' => $tenant->id]);
        $actor = $this->actingUserWithPermissions($tenant, [Permissions::PIPELINE_ASSIGN_TO_SELF]);
        $otherUser = User::factory()->create(['tenant_id' => $tenant->id]);
        $contact = $this->createContact($tenant, $actor);
        $listing = $this->createListing($tenant, 645000);
        $pipeline = Pipeline::query()->create([
            'tenant_id' => $tenant->id,
            'contact_id' => $contact->id,
            'listing_id' => $listing->id,
            'user_id' => $assignee->id,
            'stage' => Pipeline::STAGE_CONTACTED,
        ]);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->patchJson("/api/v1/pipeline/{$pipeline->id}", ['user_id' => $otherUser->id])
            ->assertForbidden();

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->patchJson("/api/v1/pipeline/{$pipeline->id}", ['user_id' => $actor->id])
            ->assertOk()
            ->assertJsonPath('data.user_id', $actor->id);
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
            'email' => 'ethan.pipeline@example.com',
            'phone' => '+62812345678',
            'status_id' => $this->contactStatus('new')->id,
            'budget' => 500000,
            'source' => 'Website',
            'last_contacted_at' => now(),
        ]);
    }

    private function createListing(Tenant $tenant, int $price): Listing
    {
        return Listing::query()->create([
            'tenant_id' => $tenant->id,
            'title' => 'Harbor View Residence',
            'address' => '18 Harbor Lane, Westport',
            'price' => $price,
            'status' => Listing::STATUS_AVAILABLE,
            'bedrooms' => 4,
            'bathrooms' => 3,
            'property_type' => Listing::TYPE_HOUSE,
        ]);
    }

    private function contactStatus(string $key): Reference
    {
        return Reference::query()
            ->whereNull('tenant_id')
            ->where('group', Contact::STATUS_REFERENCE_GROUP)
            ->where('reference_key', $key)
            ->firstOrFail();
    }
}
