<?php

namespace Database\Seeders;

use App\Models\Contact;
use App\Models\Listing;
use App\Models\PipelineDeal;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $tenant = Tenant::query()->firstOrCreate(
            ['id' => '0197066f-2aa2-73f8-93d1-56a73ad14220'],
            ['name' => 'Skyline Realty Office']
        );

        $admin = User::query()->updateOrCreate([
            'email' => 'maya@skyline.example',
        ], [
            'tenant_id' => $tenant->id,
            'role' => 'Office Admin',
            'name' => 'Maya Hart',
            'password' => Hash::make('password'),
        ]);

        $contact = Contact::query()->firstOrCreate([
            'tenant_id' => $tenant->id,
            'email' => 'ethan.miller@example.com',
        ], [
            'owner_id' => $admin->id,
            'first_name' => 'Ethan',
            'last_name' => 'Miller',
            'phone' => '(555) 014-8802',
            'status' => 'New',
            'budget' => 680000,
            'source' => 'Open house',
        ]);

        $listing = Listing::query()->firstOrCreate([
            'tenant_id' => $tenant->id,
            'title' => 'Harbor View Residence',
        ], [
            'address' => '18 Harbor Lane, Westport',
            'price' => 875000,
            'status' => 'Available',
            'bedrooms' => 4,
            'bathrooms' => 3,
            'property_type' => 'House',
        ]);

        PipelineDeal::query()->firstOrCreate([
            'tenant_id' => $tenant->id,
            'contact_id' => $contact->id,
            'listing_id' => $listing->id,
            'user_id' => $admin->id,
        ], [
            'stage' => 'New lead',
            'value' => 875000,
            'next_task' => 'Create first follow-up task',
            'due_at' => now()->addDay(),
        ]);
    }
}
