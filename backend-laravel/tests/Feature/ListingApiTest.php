<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\Listing;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Rbac\Permissions;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ListingApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed(RbacSeeder::class);
    }

    public function test_authorized_user_can_create_listing_with_contacts(): void
    {
        $tenant = Tenant::factory()->create();
        $this->actingUserWithPermissions($tenant, [Permissions::LISTINGS_CREATE]);
        $contact = $this->createContact($tenant);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->postJson('/api/v1/listings', $this->listingPayload([
                'contact_ids' => [$contact->id],
            ]))
            ->assertCreated()
            ->assertJsonPath('data.title', 'Harbor View Residence')
            ->assertJsonPath('data.contacts.0.id', $contact->id)
            ->assertJsonPath('data.contacts.0.email', 'ethan@example.com');

        $listing = Listing::query()->where('tenant_id', $tenant->id)->firstOrFail();

        $this->assertDatabaseHas('listing_contacts', [
            'listing_id' => $listing->id,
            'contact_id' => $contact->id,
        ]);
    }

    public function test_authorized_user_can_update_listing_contacts(): void
    {
        $tenant = Tenant::factory()->create();
        $this->actingUserWithPermissions($tenant, [Permissions::LISTINGS_UPDATE]);
        $listing = $this->createListing($tenant);
        $existingContact = $this->createContact($tenant, 'ethan@example.com');
        $nextContact = $this->createContact($tenant, 'priya@example.com');
        $listing->contacts()->sync([$existingContact->id]);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->patchJson("/api/v1/listings/{$listing->id}", [
                'contact_ids' => [$nextContact->id],
            ])
            ->assertOk()
            ->assertJsonPath('data.contacts.0.id', $nextContact->id);

        $this->assertDatabaseMissing('listing_contacts', [
            'listing_id' => $listing->id,
            'contact_id' => $existingContact->id,
        ]);
        $this->assertDatabaseHas('listing_contacts', [
            'listing_id' => $listing->id,
            'contact_id' => $nextContact->id,
        ]);
    }

    public function test_listing_contact_assignments_must_belong_to_current_tenant(): void
    {
        $tenant = Tenant::factory()->create();
        $otherTenant = Tenant::factory()->create();
        $this->actingUserWithPermissions($tenant, [Permissions::LISTINGS_CREATE]);
        $otherContact = $this->createContact($otherTenant);

        $this->withHeader('X-Tenant-Id', $tenant->id)
            ->postJson('/api/v1/listings', $this->listingPayload([
                'contact_ids' => [$otherContact->id],
            ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('contact_ids.0');

        $this->assertDatabaseCount('listing_contacts', 0);
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
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function listingPayload(array $overrides = []): array
    {
        return $overrides + [
            'title' => 'Harbor View Residence',
            'address' => '18 Harbor Lane, Westport',
            'price' => 875000,
            'status' => Listing::STATUS_AVAILABLE,
            'bedrooms' => 4,
            'bathrooms' => 3,
            'property_type' => Listing::TYPE_HOUSE,
        ];
    }

    private function createListing(Tenant $tenant): Listing
    {
        return Listing::query()->create($this->listingPayload([
            'tenant_id' => $tenant->id,
        ]));
    }

    private function createContact(Tenant $tenant, string $email = 'ethan@example.com'): Contact
    {
        return Contact::query()->create([
            'tenant_id' => $tenant->id,
            'first_name' => 'Ethan',
            'last_name' => 'Miller',
            'email' => $email,
            'phone' => '+62812345678',
            'status' => 'New',
            'budget' => 500000,
            'source' => 'Website',
            'last_contacted_at' => now(),
        ]);
    }
}
