<?php

namespace Database\Seeders;

use App\Models\ActivityLog;
use App\Models\Contact;
use App\Models\Document;
use App\Models\EmailCampaign;
use App\Models\Lead;
use App\Models\Listing;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Rbac\Roles;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class PerformanceDataSeeder extends Seeder
{
    private const USERS_PER_TENANT = 18;
    private const CONTACTS_PER_TENANT = 2500;
    private const LISTINGS_PER_TENANT = 650;
    private const LEADS_PER_TENANT = 5000;
    private const CAMPAIGNS_PER_TENANT = 30;

    /**
     * @var array<int, array<string, mixed>>
     */
    private array $tenants = [
        [
            'id' => '0197066f-2aa2-73f8-93d1-56a73ad14220',
            'key' => 'skyline',
            'name' => 'Skyline Realty Office',
            'city' => 'Westport',
            'preserve_existing' => true,
        ],
        [
            'id' => '01975c60-0001-7000-8a00-100000000001',
            'key' => 'cedar-coast',
            'name' => 'Cedar & Coast Realty',
            'city' => 'Seattle',
        ],
        [
            'id' => '01975c60-0001-7000-8a00-100000000002',
            'key' => 'metropeak',
            'name' => 'MetroPeak Properties',
            'city' => 'Denver',
        ],
        [
            'id' => '01975c60-0001-7000-8a00-100000000003',
            'key' => 'harborline',
            'name' => 'Harborline Homes',
            'city' => 'San Diego',
        ],
        [
            'id' => '01975c60-0001-7000-8a00-100000000004',
            'key' => 'greenfield',
            'name' => 'Greenfield Estates',
            'city' => 'Austin',
        ],
    ];

    public function run(): void
    {
        if (app()->environment('testing')) {
            return;
        }

        $this->call(RbacSeeder::class);

        Model::withoutEvents(function (): void {
            DB::transaction(function (): void {
                $this->deleteSeededData();

                foreach ($this->tenants as $tenantIndex => $tenantData) {
                    $tenant = Tenant::query()->updateOrCreate([
                        'id' => $tenantData['id'],
                    ], [
                        'name' => $tenantData['name'],
                    ]);

                    if ((bool) ($tenantData['preserve_existing'] ?? false)) {
                        $this->ensureDemoAdmin($tenant);
                    }

                    $users = $this->seedUsers($tenant, $tenantData);
                    $contacts = $this->seedContacts($tenant, $tenantData, $users);
                    $listings = $this->seedListings($tenant, $tenantData, $tenantIndex, $users, $contacts);

                    $this->seedLeads($tenant, $tenantIndex, $users, $contacts, $listings);
                    $this->seedEmailCampaigns($tenant, $tenantData, $users, $contacts);
                }
            });
        });
    }

    /**
     * @param  array<string, mixed>  $tenantData
     * @return Collection<int, User>
     */
    private function seedUsers(Tenant $tenant, array $tenantData): Collection
    {
        $roles = [
            Roles::OFFICE_ADMIN,
            Roles::SENIOR_AGENT,
            Roles::SALES,
            Roles::PROPERTY_MANAGER,
            Roles::MARKETING_COORDINATOR,
            Roles::TRANSACTION_COORDINATOR,
            Roles::SIMPLE_AGENT,
        ];

        return User::factory()
            ->count(self::USERS_PER_TENANT)
            ->withAssignedRole()
            ->sequence(fn ($sequence): array => [
                'role' => $sequence->index === 0 ? Roles::OFFICE_ADMIN : $roles[$sequence->index % count($roles)],
                'email' => sprintf(
                    '%s.agent.%02d@%s.lifely.test',
                    $tenantData['key'],
                    $sequence->index + 1,
                    $tenantData['key'],
                ),
            ])
            ->create([
                'tenant_id' => $tenant->id,
            ]);
    }

    /**
     * @param  array<string, mixed>  $tenantData
     * @param  Collection<int, User>  $users
     * @return Collection<int, Contact>
     */
    private function seedContacts(Tenant $tenant, array $tenantData, Collection $users): Collection
    {
        return Contact::factory()
            ->count(self::CONTACTS_PER_TENANT)
            ->withAssignedOwner($users)
            ->sequence(fn ($sequence): array => [
                'email' => sprintf(
                    '%s.client.%05d@client.lifely.test',
                    $tenantData['key'],
                    $sequence->index + 1,
                ),
                'status' => $sequence->index % 23 !== 0,
                'last_contacted_at' => $sequence->index % 9 === 0
                    ? null
                    : now()->subDays($sequence->index % 120),
            ])
            ->create([
                'tenant_id' => $tenant->id,
            ]);
    }

    /**
     * @param  array<string, mixed>  $tenantData
     * @param  Collection<int, User>  $users
     * @param  Collection<int, Contact>  $contacts
     * @return Collection<int, Listing>
     */
    private function seedListings(
        Tenant $tenant,
        array $tenantData,
        int $tenantIndex,
        Collection $users,
        Collection $contacts,
    ): Collection {
        /** @var Collection<int, Listing> $listings */
        $listings = Listing::factory()
            ->count(self::LISTINGS_PER_TENANT)
            ->sequence(fn ($sequence): array => [
                'title' => sprintf('%s Collection %04d', $tenantData['city'], $sequence->index + 1),
                'address' => sprintf(
                    '%d %s, %s',
                    100 + ($sequence->index * 7),
                    $this->streetNames()[($sequence->index + $tenantIndex) % count($this->streetNames())],
                    $tenantData['city'],
                ),
            ])
            ->create([
                'tenant_id' => $tenant->id,
            ]);

        $listings->each(function (Listing $listing, int $index) use ($users, $contacts): void {
            $listing->users()->attach($users[$index % $users->count()]->id, ['is_primary_owner' => true]);
            $listing->users()->attach($users[($index + 5) % $users->count()]->id, ['is_primary_owner' => null]);
            $listing->contacts()->attach([
                $contacts[($index * 3) % $contacts->count()]->id,
                $contacts[(($index * 3) + 1) % $contacts->count()]->id,
                $contacts[(($index * 3) + 2) % $contacts->count()]->id,
            ]);

            // Excluded for now.
            // Document::factory()
            //     ->count(2)
            //     ->sequence(
            //         [
            //             'type' => 'marketing',
            //             'subtype' => 'brochure',
            //             'order' => 0,
            //         ],
            //         [
            //             'type' => 'compliance',
            //             'subtype' => 'seller-disclosure',
            //             'order' => 1,
            //         ],
            //     )
            //     ->create([
            //         'tenant_id' => $tenant->id,
            //         'model' => 'listing',
            //         'model_id' => $listing->id,
            //     ]);
        });

        return $listings;
    }

    /**
     * @param  Collection<int, User>  $users
     * @param  Collection<int, Contact>  $contacts
     * @param  Collection<int, Listing>  $listings
     */
    private function seedLeads(
        Tenant $tenant,
        int $tenantIndex,
        Collection $users,
        Collection $contacts,
        Collection $listings,
    ): void {
        $stages = Lead::stageValues();

        Lead::factory()
            ->count(self::LEADS_PER_TENANT)
            ->sequence(function ($sequence) use ($contacts, $listings, $stages, $tenantIndex, $users): array {
                $stage = $stages[$sequence->index % count($stages)];

                return [
                    'contact_id' => $contacts[(($sequence->index * 7) + $tenantIndex) % $contacts->count()]->id,
                    'listing_id' => $listings[(($sequence->index * 11) + $tenantIndex) % $listings->count()]->id,
                    'user_id' => $users[$sequence->index % $users->count()]->id,
                    'stage' => $stage,
                    'is_active' => ! Lead::isClosedStageValue($stage),
                    'next_task' => $this->nextTask($stage, $sequence->index),
                    'due_at' => Lead::isClosedStageValue($stage)
                        ? null
                        : now()->addDays(($sequence->index % 30) - 7),
                ];
            })
            ->create([
                'tenant_id' => $tenant->id,
            ]);

        ActivityLog::factory()
            ->count(self::LEADS_PER_TENANT)
            ->sequence(fn ($sequence): array => [
                'user_id' => $users[$sequence->index % $users->count()]->id,
                'action_type' => $this->activityType($stages[$sequence->index % count($stages)]),
            ])
            ->create([
                'tenant_id' => $tenant->id,
            ]);
    }

    /**
     * @param  array<string, mixed>  $tenantData
     * @param  Collection<int, User>  $users
     * @param  Collection<int, Contact>  $contacts
     */
    private function seedEmailCampaigns(
        Tenant $tenant,
        array $tenantData,
        Collection $users,
        Collection $contacts,
    ): void {
        EmailCampaign::factory()
            ->count(self::CAMPAIGNS_PER_TENANT)
            ->sequence(fn ($sequence): array => [
                'user_id' => $users[$sequence->index % $users->count()]->id,
                'subject' => sprintf('%s market update #%02d', $tenantData['city'], $sequence->index + 1),
                'contact_ids' => $contacts
                    ->slice(($sequence->index * 37) % ($contacts->count() - 120), 120)
                    ->pluck('id')
                    ->values()
                    ->all(),
                'recipient_count' => 120,
            ])
            ->create([
                'tenant_id' => $tenant->id,
            ]);
    }

    private function deleteSeededData(): void
    {
        $preservedTenantIds = $this->preservedTenantIds();
        foreach ($preservedTenantIds as $tenantId) {
            $this->deletePreservedTenantPerformanceData($tenantId);
        }

        $tenantIds = array_values(array_diff(array_column($this->tenants, 'id'), $preservedTenantIds));
        $userIds = DB::table('users')
            ->whereIn('tenant_id', $tenantIds)
            ->pluck('id')
            ->all();

        foreach (array_chunk($userIds, 500) as $chunk) {
            DB::table('model_has_roles')
                ->where('model_type', User::class)
                ->whereIn('model_id', $chunk)
                ->delete();
        }

        DB::table('tenants')
            ->whereIn('id', $tenantIds)
            ->delete();
    }

    /**
     * @return array<int, string>
     */
    private function preservedTenantIds(): array
    {
        return collect($this->tenants)
            ->filter(fn (array $tenant): bool => (bool) ($tenant['preserve_existing'] ?? false))
            ->pluck('id')
            ->values()
            ->all();
    }

    private function deletePreservedTenantPerformanceData(string $tenantId): void
    {
        $listingIds = DB::table('listings')
            ->where('tenant_id', $tenantId)
            ->pluck('id')
            ->all();

        $generatedUserIds = DB::table('users')
            ->where('tenant_id', $tenantId)
            ->where('email', '!=', 'maya@skyline.example')
            ->pluck('id')
            ->all();

        DB::table('email_campaigns')->where('tenant_id', $tenantId)->delete();
        DB::table('activity_logs')->where('tenant_id', $tenantId)->delete();
        DB::table('leads')->where('tenant_id', $tenantId)->delete();

        foreach (array_chunk($listingIds, 500) as $chunk) {
            DB::table('listing_contacts')->whereIn('listing_id', $chunk)->delete();
            DB::table('listing_users')->whereIn('listing_id', $chunk)->delete();
        }

        DB::table('documents')->where('tenant_id', $tenantId)->delete();
        DB::table('listings')->where('tenant_id', $tenantId)->delete();
        DB::table('contacts')->where('tenant_id', $tenantId)->delete();

        foreach (array_chunk($generatedUserIds, 500) as $chunk) {
            DB::table('model_has_roles')
                ->where('model_type', User::class)
                ->whereIn('model_id', $chunk)
                ->delete();
            DB::table('users')->whereIn('id', $chunk)->delete();
        }
    }

    private function ensureDemoAdmin(Tenant $tenant): void
    {
        $admin = User::query()->updateOrCreate([
            'email' => 'maya@skyline.example',
        ], [
            'tenant_id' => $tenant->id,
            'role' => Roles::OFFICE_ADMIN,
            'name' => 'Maya Hart',
            'password' => Hash::make('password'),
        ]);

        $admin->assignRole(Roles::OFFICE_ADMIN);
    }

    private function activityType(int $stage): string
    {
        return match ($stage) {
            Lead::STAGE_CLOSED_WON => 'lead.closed_won',
            Lead::STAGE_CLOSED_LOST => 'lead.closed_lost',
            Lead::STAGE_VIEWING_SCHEDULED, Lead::STAGE_VIEWED => 'lead.viewing',
            Lead::STAGE_NEGOTIATING => 'lead.negotiating',
            default => 'lead.updated',
        };
    }

    private function nextTask(int $stage, int $index): ?string
    {
        if (Lead::isClosedStageValue($stage)) {
            return null;
        }

        return [
            'Call buyer to confirm search priorities',
            'Send comparable listings and pricing note',
            'Schedule showing with listing owner',
            'Prepare offer strategy summary',
            'Follow up after open house visit',
            'Confirm financing timeline',
        ][$index % 6];
    }

    /**
     * @return array<int, string>
     */
    private function streetNames(): array
    {
        return [
            'Harbor Lane',
            'Maple Ridge Drive',
            'Cedar Point Road',
            'Summit Avenue',
            'Willow Creek Boulevard',
            'Oak Terrace',
            'Market Street',
            'Lakeview Court',
            'Pine Hollow Way',
            'Sunset Plaza',
            'Parkside Trail',
            'Riverbend Drive',
            'Stonebridge Road',
            'Meadowlark Lane',
            'Highland Avenue',
            'Juniper Street',
        ];
    }
}
