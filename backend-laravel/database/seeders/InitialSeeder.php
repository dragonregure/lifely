<?php

namespace Database\Seeders;

use App\Models\Contact;
use App\Models\Listing;
use App\Models\PipelineDeal;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Rbac\Roles;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class InitialSeeder extends Seeder
{
    private Tenant $tenant;
    private User $admin;
    /** @var Collection<int, User> */
    private Collection $users;
    /** @var Collection<int, Contact> */
    private Collection $contacts;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->createSysAdmin();

        $this->tenant = Tenant::query()->firstOrCreate(
            ['id' => '0197066f-2aa2-73f8-93d1-56a73ad14220'],
            ['name' => 'Skyline Realty Office']
        );

        $this->createUsers();
        $this->createContacts();

        $listing = Listing::query()->firstOrCreate([
            'tenant_id' => $this->tenant->id,
            'title' => 'Harbor View Residence',
        ], [
            'address' => '18 Harbor Lane, Westport',
            'price' => 875000,
            'status' => Listing::STATUS_AVAILABLE,
            'bedrooms' => 4,
            'bathrooms' => 3,
            'property_type' => Listing::TYPE_HOUSE,
        ]);

        PipelineDeal::query()->firstOrCreate([
            'tenant_id' => $this->tenant->id,
            'contact_id' => $this->contacts->random()->id,
            'listing_id' => $listing->id,
            'user_id' => $this->admin->id,
        ], [
            'stage' => 'New lead',
            'value' => 875000,
            'next_task' => 'Create first follow-up task',
            'due_at' => now()->addDay(),
        ]);
    }

    private function createSysAdmin(): void
    {
        $sysTenant = Tenant::query()->firstOrCreate(
            ['id' => '0197066f-2aa2-73f8-93d1-56a73ad14219'],
            ['name' => 'System Office']
        );

        $sysAdmin = User::query()->updateOrCreate([
            'email' => 'dragonregure@gmail.com',
        ], [
            'tenant_id' => $sysTenant->id,
            'role' => Roles::SYSTEM_ADMIN,
            'name' => 'dragonregure',
            'password' => Hash::make('lpPLliLI88'),
        ]);

        $sysAdmin->assignRole(Roles::SYSTEM_ADMIN);
    }

    private function createUsers(): void
    {
        $admin = User::query()->updateOrCreate([
            'email' => 'maya@skyline.example',
        ], [
            'tenant_id' => $this->tenant->id,
            'role' => Roles::OFFICE_ADMIN,
            'name' => 'Maya Hart',
            'password' => Hash::make('password'),
        ]);

        $this->admin = $admin;
        $admin->assignRole(Roles::OFFICE_ADMIN);

        $this->users = User::factory()
            ->count(10)
            ->withAssignedRole()
            ->create([
                'tenant_id' => $this->tenant->id,
            ]);
    }

    private function createContacts(): void
    {
        $this->contacts = Contact::factory()
            ->count(20)
            ->withAssignedOwner($this->users)
            ->create([
                'tenant_id' => $this->tenant->id,
            ]);
    }
}
