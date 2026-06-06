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
        $actor = $this->actingUserWithPermissions($tenant, [
            Permissions::PIPELINE_CREATE,
            Permissions::PIPELINE_VIEW,
            Permissions::PIPELINE_ASSIGN_TO_SELF,
        ]);
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
            ->assertJsonPath('data.0.value', 875000)
            ->assertJsonMissingPath('data.0.contact')
            ->assertJsonMissingPath('data.0.listing')
            ->assertJsonMissingPath('data.0.user');

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->getJson('/api/v1/pipeline?include[]=contact&include[]=listing&include[]=user')
            ->assertOk()
            ->assertJsonPath('data.0.contact.email', 'ethan.pipeline@example.com')
            ->assertJsonPath('data.0.listing.title', 'Harbor View Residence')
            ->assertJsonPath('data.0.user_id', $actor->id);
    }

    public function test_assign_to_self_permission_can_create_pipeline_for_current_user_only(): void
    {
        $tenant = Tenant::factory()->create();
        $actor = $this->actingUserWithPermissions($tenant, [
            Permissions::PIPELINE_CREATE,
            Permissions::PIPELINE_ASSIGN_TO_SELF,
        ]);
        $otherUser = User::factory()->create(['tenant_id' => $tenant->id]);
        $contact = $this->createContact($tenant, $actor);
        $listing = $this->createListing($tenant, 875000);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->postJson('/api/v1/pipeline', [
                'contact_id' => $contact->id,
                'listing_id' => $listing->id,
                'user_id' => $otherUser->id,
            ])
            ->assertForbidden();

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->postJson('/api/v1/pipeline', [
                'contact_id' => $contact->id,
                'listing_id' => $listing->id,
                'user_id' => $actor->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.user_id', $actor->id);
    }

    public function test_change_assignee_permission_can_create_pipeline_for_another_user(): void
    {
        $tenant = Tenant::factory()->create();
        $actor = $this->actingUserWithPermissions($tenant, [
            Permissions::PIPELINE_CREATE,
            Permissions::PIPELINE_CHANGE_ASSIGNEE,
        ]);
        $assignee = User::factory()->create(['tenant_id' => $tenant->id]);
        $contact = $this->createContact($tenant, $actor);
        $listing = $this->createListing($tenant, 875000);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->postJson('/api/v1/pipeline', [
                'contact_id' => $contact->id,
                'listing_id' => $listing->id,
                'user_id' => $assignee->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.user_id', $assignee->id);
    }

    public function test_pipeline_list_supports_relation_search_and_multi_value_filters(): void
    {
        $tenant = Tenant::factory()->create();
        $actor = $this->actingUserWithPermissions($tenant, [Permissions::PIPELINE_VIEW]);
        $assigneeA = User::factory()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Maya Laurent',
            'email' => 'maya.pipeline@example.com',
        ]);
        $assigneeB = User::factory()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Noah Hart',
            'email' => 'noah.pipeline@example.com',
        ]);
        $assigneeC = User::factory()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Priya Shah',
            'email' => 'priya.pipeline@example.com',
        ]);

        $contactA = $this->createContact($tenant, $actor, [
            'first_name' => 'Ava',
            'last_name' => 'North',
            'email' => 'ava.pipeline@example.com',
        ]);
        $contactB = $this->createContact($tenant, $actor, [
            'first_name' => 'Liam',
            'last_name' => 'Stone',
            'email' => 'liam.pipeline@example.com',
        ]);
        $contactC = $this->createContact($tenant, $actor, [
            'first_name' => 'Zara',
            'last_name' => 'Cole',
            'email' => 'zara.pipeline@example.com',
        ]);

        $listingA = $this->createListing($tenant, 875000, ['title' => 'Garden Walk Terrace']);
        $listingB = $this->createListing($tenant, 910000, ['title' => 'Skyline Penthouse']);
        $listingC = $this->createListing($tenant, 720000, ['title' => 'Riverbend Cottage']);

        $pipelineA = Pipeline::query()->create([
            'tenant_id' => $tenant->id,
            'contact_id' => $contactA->id,
            'listing_id' => $listingA->id,
            'user_id' => $assigneeA->id,
            'stage' => Pipeline::STAGE_NEW_LEAD,
            'source' => Pipeline::SOURCE_WEBSITE,
        ]);
        $pipelineB = Pipeline::query()->create([
            'tenant_id' => $tenant->id,
            'contact_id' => $contactB->id,
            'listing_id' => $listingB->id,
            'user_id' => $assigneeB->id,
            'stage' => Pipeline::STAGE_CONTACTED,
            'source' => Pipeline::SOURCE_REFERRAL,
        ]);
        $pipelineC = Pipeline::query()->create([
            'tenant_id' => $tenant->id,
            'contact_id' => $contactC->id,
            'listing_id' => $listingC->id,
            'user_id' => $assigneeC->id,
            'stage' => Pipeline::STAGE_QUALIFIED,
            'source' => Pipeline::SOURCE_EMAIL,
        ]);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->getJson('/api/v1/pipeline?search=Ava')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $pipelineA->id);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->getJson('/api/v1/pipeline?search=Skyline')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $pipelineB->id);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->getJson('/api/v1/pipeline?search=Priya')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $pipelineC->id);

        $response = $this->withHeader('X-Tenant-Id', $tenant->id)
            ->getJson("/api/v1/pipeline?filter[user_id]={$assigneeA->id},{$assigneeB->id}&filter[source]=Website,Referral")
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->assertEqualsCanonicalizing(
            [$pipelineA->id, $pipelineB->id],
            array_column($response->json('data'), 'id'),
        );
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

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function createContact(Tenant $tenant, User $owner, array $attributes = []): Contact
    {
        return Contact::query()->create(array_merge([
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
        ], $attributes));
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function createListing(Tenant $tenant, int $price, array $attributes = []): Listing
    {
        return Listing::query()->create(array_merge([
            'tenant_id' => $tenant->id,
            'title' => 'Harbor View Residence',
            'address' => '18 Harbor Lane, Westport',
            'price' => $price,
            'status' => Listing::STATUS_AVAILABLE,
            'bedrooms' => 4,
            'bathrooms' => 3,
            'property_type' => Listing::TYPE_HOUSE,
        ], $attributes));
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
