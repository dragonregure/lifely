<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\Listing;
use App\Models\Lead;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Rbac\Permissions;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class LeadApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed(RbacSeeder::class);
    }

    public function test_authorized_user_can_create_lead_with_readable_stage_and_listing_value(): void
    {
        $tenant = Tenant::factory()->create();
        $actor = $this->actingUserWithPermissions($tenant, [
            Permissions::LEADS_CREATE,
            Permissions::LEADS_VIEW,
            Permissions::LEADS_ASSIGN_TO_SELF,
        ]);
        $contact = $this->createContact($tenant, $actor);
        $listing = $this->createListing($tenant, 875000);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->postJson('/api/v1/leads', [
                'contact_id' => $contact->id,
                'listing_id' => $listing->id,
                'user_id' => $actor->id,
                'stage' => 'Qualified',
                'next_task' => 'Confirm budget and timeline',
            ])
            ->assertCreated()
            ->assertJsonPath('data.stage', 'Qualified')
            ->assertJsonPath('data.source_id', Lead::SOURCE_MANUAL_ENTRY)
            ->assertJsonPath('data.source', 'Manual Entry')
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.value', 875000);

        $this->assertDatabaseHas('leads', [
            'tenant_id' => $tenant->id,
            'contact_id' => $contact->id,
            'listing_id' => $listing->id,
            'stage' => Lead::STAGE_QUALIFIED,
            'source' => Lead::SOURCE_MANUAL_ENTRY,
            'is_active' => true,
        ]);

        $this->assertFalse(Schema::hasColumn('leads', 'value'));

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->getJson('/api/v1/leads')
            ->assertOk()
            ->assertJsonPath('data.0.stage', 'Qualified')
            ->assertJsonPath('data.0.source', 'Manual Entry')
            ->assertJsonPath('data.0.value', 875000)
            ->assertJsonMissingPath('data.0.contact')
            ->assertJsonMissingPath('data.0.listing')
            ->assertJsonMissingPath('data.0.user');

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->getJson('/api/v1/leads?include[]=contact&include[]=listing&include[]=user')
            ->assertOk()
            ->assertJsonPath('data.0.contact.email', 'ethan.lead@example.com')
            ->assertJsonPath('data.0.listing.title', 'Harbor View Residence')
            ->assertJsonPath('data.0.user_id', $actor->id);
    }

    public function test_assign_to_self_permission_can_create_lead_for_current_user_only(): void
    {
        $tenant = Tenant::factory()->create();
        $actor = $this->actingUserWithPermissions($tenant, [
            Permissions::LEADS_CREATE,
            Permissions::LEADS_ASSIGN_TO_SELF,
        ]);
        $otherUser = User::factory()->create(['tenant_id' => $tenant->id]);
        $contact = $this->createContact($tenant, $actor);
        $listing = $this->createListing($tenant, 875000);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->postJson('/api/v1/leads', [
                'contact_id' => $contact->id,
                'listing_id' => $listing->id,
                'user_id' => $otherUser->id,
            ])
            ->assertForbidden();

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->postJson('/api/v1/leads', [
                'contact_id' => $contact->id,
                'listing_id' => $listing->id,
                'user_id' => $actor->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.user_id', $actor->id);
    }

    public function test_change_assignee_permission_can_create_lead_for_another_user(): void
    {
        $tenant = Tenant::factory()->create();
        $actor = $this->actingUserWithPermissions($tenant, [
            Permissions::LEADS_CREATE,
            Permissions::LEADS_CHANGE_ASSIGNEE,
        ]);
        $assignee = User::factory()->create(['tenant_id' => $tenant->id]);
        $contact = $this->createContact($tenant, $actor);
        $listing = $this->createListing($tenant, 875000);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->postJson('/api/v1/leads', [
                'contact_id' => $contact->id,
                'listing_id' => $listing->id,
                'user_id' => $assignee->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.user_id', $assignee->id);
    }

    public function test_Lead_list_supports_relation_search_and_multi_value_filters(): void
    {
        $tenant = Tenant::factory()->create();
        $actor = $this->actingUserWithPermissions($tenant, [Permissions::LEADS_VIEW]);
        $assigneeA = User::factory()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Maya Laurent',
            'email' => 'maya.lead@example.com',
        ]);
        $assigneeB = User::factory()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Noah Hart',
            'email' => 'noah.lead@example.com',
        ]);
        $assigneeC = User::factory()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Priya Shah',
            'email' => 'priya.lead@example.com',
        ]);

        $contactA = $this->createContact($tenant, $actor, [
            'first_name' => 'Ava',
            'last_name' => 'North',
            'email' => 'ava.lead@example.com',
        ]);
        $contactB = $this->createContact($tenant, $actor, [
            'first_name' => 'Liam',
            'last_name' => 'Stone',
            'email' => 'liam.lead@example.com',
        ]);
        $contactC = $this->createContact($tenant, $actor, [
            'first_name' => 'Zara',
            'last_name' => 'Cole',
            'email' => 'zara.lead@example.com',
        ]);

        $listingA = $this->createListing($tenant, 875000, ['title' => 'Garden Walk Terrace']);
        $listingB = $this->createListing($tenant, 910000, ['title' => 'Skyline Penthouse']);
        $listingC = $this->createListing($tenant, 720000, ['title' => 'Riverbend Cottage']);

        $leadA = Lead::query()->create([
            'tenant_id' => $tenant->id,
            'contact_id' => $contactA->id,
            'listing_id' => $listingA->id,
            'user_id' => $assigneeA->id,
            'stage' => Lead::STAGE_NEW_LEAD,
            'source' => Lead::SOURCE_WEBSITE,
        ]);
        $leadB = Lead::query()->create([
            'tenant_id' => $tenant->id,
            'contact_id' => $contactB->id,
            'listing_id' => $listingB->id,
            'user_id' => $assigneeB->id,
            'stage' => Lead::STAGE_CONTACTED,
            'source' => Lead::SOURCE_REFERRAL,
        ]);
        $leadC = Lead::query()->create([
            'tenant_id' => $tenant->id,
            'contact_id' => $contactC->id,
            'listing_id' => $listingC->id,
            'user_id' => $assigneeC->id,
            'stage' => Lead::STAGE_QUALIFIED,
            'source' => Lead::SOURCE_EMAIL,
        ]);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->getJson('/api/v1/leads?search=Ava')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $leadA->id);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->getJson('/api/v1/leads?search=Skyline')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $leadB->id);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->getJson('/api/v1/leads?search=Priya')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $leadC->id);

        $response = $this->withHeader('X-Tenant-Id', $tenant->id)
            ->getJson("/api/v1/leads?filter[user_id]={$assigneeA->id},{$assigneeB->id}&filter[source]=Website,Referral")
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->assertEqualsCanonicalizing(
            [$leadA->id, $leadB->id],
            array_column($response->json('data'), 'id'),
        );

        $leadB->update(['is_active' => false]);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->getJson('/api/v1/leads?filter[is_active]=inactive')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $leadB->id);
    }

    public function test_authorized_user_can_update_lead_stage_with_integer_storage(): void
    {
        $tenant = Tenant::factory()->create();
        $actor = $this->actingUserWithPermissions($tenant, [Permissions::LEADS_UPDATE]);
        $contact = $this->createContact($tenant, $actor);
        $listing = $this->createListing($tenant, 645000);
        $lead = Lead::query()->create([
            'tenant_id' => $tenant->id,
            'contact_id' => $contact->id,
            'listing_id' => $listing->id,
            'user_id' => $actor->id,
            'stage' => Lead::STAGE_CONTACTED,
        ]);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->patchJson("/api/v1/leads/{$lead->id}/stage", [
                'stage' => 'Closed Won',
            ])
            ->assertOk()
            ->assertJsonPath('data.stage', 'Closed Won')
            ->assertJsonPath('data.value', 645000);

        $this->assertDatabaseHas('leads', [
            'id' => $lead->id,
            'stage' => Lead::STAGE_CLOSED_WON,
        ]);
    }

    public function test_moving_lead_to_closed_won_marks_listing_sold(): void
    {
        $tenant = Tenant::factory()->create();
        $actor = $this->actingUserWithPermissions($tenant, [Permissions::LEADS_UPDATE]);
        $contact = $this->createContact($tenant, $actor);
        $listing = $this->createListing($tenant, 645000);
        $lead = Lead::query()->create([
            'tenant_id' => $tenant->id,
            'contact_id' => $contact->id,
            'listing_id' => $listing->id,
            'user_id' => $actor->id,
            'stage' => Lead::STAGE_NEGOTIATING,
        ]);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->patchJson("/api/v1/leads/{$lead->id}", [
                'stage' => 'Closed Won',
            ])
            ->assertOk()
            ->assertJsonPath('data.stage', 'Closed Won');

        $this->assertDatabaseHas('listings', [
            'id' => $listing->id,
            'tenant_id' => $tenant->id,
            'status' => Listing::STATUS_SOLD,
        ]);
    }

    public function test_closed_lead_cannot_move_to_another_stage(): void
    {
        $tenant = Tenant::factory()->create();
        $actor = $this->actingUserWithPermissions($tenant, [Permissions::LEADS_UPDATE]);
        $contact = $this->createContact($tenant, $actor);
        $listing = $this->createListing($tenant, 645000);
        $lead = Lead::query()->create([
            'tenant_id' => $tenant->id,
            'contact_id' => $contact->id,
            'listing_id' => $listing->id,
            'user_id' => $actor->id,
            'stage' => Lead::STAGE_CLOSED_LOST,
        ]);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->patchJson("/api/v1/leads/{$lead->id}/stage", [
                'stage' => 'Negotiating',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.stage.0', 'Closed lead cards cannot move to another stage.');

        $this->assertDatabaseHas('leads', [
            'id' => $lead->id,
            'stage' => Lead::STAGE_CLOSED_LOST,
        ]);
    }

    public function test_problem_lead_can_only_be_marked_inactive(): void
    {
        $tenant = Tenant::factory()->create();
        $actor = $this->actingUserWithPermissions($tenant, [Permissions::LEADS_UPDATE]);
        $contact = $this->createContact($tenant, $actor, ['status' => false]);
        $listing = $this->createListing($tenant, 645000, ['status' => Listing::STATUS_AVAILABLE]);
        $lead = Lead::query()->create([
            'tenant_id' => $tenant->id,
            'contact_id' => $contact->id,
            'listing_id' => $listing->id,
            'user_id' => $actor->id,
            'stage' => Lead::STAGE_CONTACTED,
            'is_active' => true,
        ]);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->patchJson("/api/v1/leads/{$lead->id}", [
                'stage' => 'Qualified',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.lead.0', 'Lead cards with a sold listing or inactive contact can only change active status.');

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->patchJson("/api/v1/leads/{$lead->id}", [
                'is_active' => false,
            ])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->patchJson("/api/v1/leads/{$lead->id}", [
                'is_active' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.is_active', true);

        $this->assertDatabaseHas('leads', [
            'id' => $lead->id,
            'stage' => Lead::STAGE_CONTACTED,
            'is_active' => true,
        ]);
    }

    public function test_assigned_user_can_update_manual_lead_overview(): void
    {
        $tenant = Tenant::factory()->create();
        $actor = $this->actingUserWithPermissions($tenant, [Permissions::LEADS_UPDATE]);
        $contact = $this->createContact($tenant, $actor);
        $nextContact = $this->createContact($tenant, $actor);
        $listing = $this->createListing($tenant, 645000);
        $nextListing = $this->createListing($tenant, 755000);
        $lead = Lead::query()->create([
            'tenant_id' => $tenant->id,
            'contact_id' => $contact->id,
            'listing_id' => $listing->id,
            'user_id' => $actor->id,
            'stage' => Lead::STAGE_CONTACTED,
            'source' => Lead::SOURCE_MANUAL_ENTRY,
        ]);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->patchJson("/api/v1/leads/{$lead->id}", [
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

        $this->assertDatabaseHas('leads', [
            'id' => $lead->id,
            'contact_id' => $nextContact->id,
            'listing_id' => $nextListing->id,
            'stage' => Lead::STAGE_NEGOTIATING,
            'is_active' => false,
        ]);
    }

    public function test_non_assigned_user_cannot_update_lead_progress_fields(): void
    {
        $tenant = Tenant::factory()->create();
        $assignee = User::factory()->create(['tenant_id' => $tenant->id]);
        $actor = $this->actingUserWithPermissions($tenant, [Permissions::LEADS_UPDATE]);
        $contact = $this->createContact($tenant, $actor);
        $listing = $this->createListing($tenant, 645000);
        $lead = Lead::query()->create([
            'tenant_id' => $tenant->id,
            'contact_id' => $contact->id,
            'listing_id' => $listing->id,
            'user_id' => $assignee->id,
            'stage' => Lead::STAGE_CONTACTED,
        ]);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->patchJson("/api/v1/leads/{$lead->id}", [
                'stage' => 'Closed Won',
            ])
            ->assertForbidden();

        $this->assertDatabaseHas('leads', [
            'id' => $lead->id,
            'stage' => Lead::STAGE_CONTACTED,
        ]);
    }

    public function test_assign_to_self_permission_can_only_assign_current_user(): void
    {
        $tenant = Tenant::factory()->create();
        $assignee = User::factory()->create(['tenant_id' => $tenant->id]);
        $actor = $this->actingUserWithPermissions($tenant, [Permissions::LEADS_ASSIGN_TO_SELF]);
        $otherUser = User::factory()->create(['tenant_id' => $tenant->id]);
        $contact = $this->createContact($tenant, $actor);
        $listing = $this->createListing($tenant, 645000);
        $lead = Lead::query()->create([
            'tenant_id' => $tenant->id,
            'contact_id' => $contact->id,
            'listing_id' => $listing->id,
            'user_id' => $assignee->id,
            'stage' => Lead::STAGE_CONTACTED,
        ]);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->patchJson("/api/v1/leads/{$lead->id}", ['user_id' => $otherUser->id])
            ->assertForbidden();

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->patchJson("/api/v1/leads/{$lead->id}", ['user_id' => $actor->id])
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
            'email' => 'ethan.lead@example.com',
            'phone' => '+62812345678',
            'status' => true,
            'budget' => 500000,
            'source' => Contact::SOURCE_WEBSITE,
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
}
