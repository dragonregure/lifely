<?php

namespace Tests\Feature;

use App\Jobs\ProcessLeadLifecycle;
use App\Models\ActivityLog;
use App\Models\Contact;
use App\Models\Lead;
use App\Models\Listing;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ProcessLeadLifecycleJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_moves_stale_leads_to_dormant_and_deactivates_older_dormant_or_problematic_leads(): void
    {
        $this->travelTo(Carbon::parse('2026-06-12 00:00:00'));

        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $activeContact = Contact::factory()->create([
            'tenant_id' => $tenant->id,
            'owner_id' => $user->id,
            'status' => true,
        ]);
        $inactiveContact = Contact::factory()->create([
            'tenant_id' => $tenant->id,
            'owner_id' => $user->id,
            'status' => false,
        ]);
        $availableListing = Listing::factory()->create([
            'tenant_id' => $tenant->id,
            'status' => Listing::STATUS_AVAILABLE,
        ]);
        $soldListing = Listing::factory()->create([
            'tenant_id' => $tenant->id,
            'status' => Listing::STATUS_SOLD,
        ]);

        $staleActiveLead = $this->createLead($tenant, $activeContact, $availableListing, $user, [
            'stage' => Lead::STAGE_CONTACTED,
            'updated_at' => '2026-06-05 23:59:59',
        ]);
        $freshActiveLead = $this->createLead($tenant, $activeContact, $availableListing, $user, [
            'stage' => Lead::STAGE_QUALIFIED,
            'updated_at' => '2026-06-06 00:00:00',
        ]);
        $olderDormantLead = $this->createLead($tenant, $activeContact, $availableListing, $user, [
            'stage' => Lead::STAGE_DORMANT,
            'updated_at' => '2026-05-29 12:00:00',
        ]);
        $freshDormantLead = $this->createLead($tenant, $activeContact, $availableListing, $user, [
            'stage' => Lead::STAGE_DORMANT,
            'updated_at' => '2026-05-30 00:00:00',
        ]);
        $soldListingLead = $this->createLead($tenant, $activeContact, $soldListing, $user, [
            'stage' => Lead::STAGE_CLOSED_WON,
            'updated_at' => '2026-06-05 00:00:00',
        ]);
        $inactiveContactLead = $this->createLead($tenant, $inactiveContact, $availableListing, $user, [
            'stage' => Lead::STAGE_NEGOTIATING,
            'updated_at' => '2026-06-05 00:00:00',
        ]);
        $freshProblemLead = $this->createLead($tenant, $inactiveContact, $soldListing, $user, [
            'stage' => Lead::STAGE_CONTACTED,
            'updated_at' => '2026-06-06 00:00:00',
        ]);

        (new ProcessLeadLifecycle())->handle();

        $this->assertLeadState($staleActiveLead, Lead::STAGE_DORMANT, true);
        $this->assertLeadState($freshActiveLead, Lead::STAGE_QUALIFIED, true);
        $this->assertLeadState($olderDormantLead, Lead::STAGE_DORMANT, false);
        $this->assertLeadState($freshDormantLead, Lead::STAGE_DORMANT, true);
        $this->assertLeadState($soldListingLead, Lead::STAGE_CLOSED_WON, false);
        $this->assertLeadState($inactiveContactLead, Lead::STAGE_NEGOTIATING, false);
        $this->assertLeadState($freshProblemLead, Lead::STAGE_CONTACTED, true);

        $this->assertLeadActivityChange($staleActiveLead, 'stage', Lead::STAGE_CONTACTED, Lead::STAGE_DORMANT);
        $this->assertLeadActivityChange($olderDormantLead, 'is_active', true, false);
        $this->assertLeadActivityChange($soldListingLead, 'is_active', true, false);
        $this->assertLeadActivityChange($inactiveContactLead, 'is_active', true, false);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function createLead(
        Tenant $tenant,
        Contact $contact,
        Listing $listing,
        User $user,
        array $attributes = []
    ): Lead {
        $timestamp = $attributes['updated_at'] ?? now();
        unset($attributes['updated_at']);

        $lead = Lead::query()->create($attributes + [
            'tenant_id' => $tenant->id,
            'contact_id' => $contact->id,
            'listing_id' => $listing->id,
            'user_id' => $user->id,
            'stage' => Lead::STAGE_NEW_LEAD,
            'source' => Lead::SOURCE_MANUAL_ENTRY,
            'is_active' => true,
        ]);

        $lead->forceFill([
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ])->saveQuietly();

        return $lead->refresh();
    }

    private function assertLeadState(Lead $lead, int $stage, bool $isActive): void
    {
        $lead->refresh();

        $this->assertSame($stage, (int) $lead->stage);
        $this->assertSame($isActive, (bool) $lead->is_active);
    }

    private function assertLeadActivityChange(Lead $lead, string $field, mixed $old, mixed $new): void
    {
        $activity = ActivityLog::query()
            ->where('action_type', 'lead.updated')
            ->get()
            ->first(function (ActivityLog $activity) use ($lead, $field): bool {
                $properties = $activity->properties ?? [];
                $changes = $properties['changes'] ?? [];

                return ($properties['subject_id'] ?? null) === $lead->id
                    && array_key_exists($field, $changes);
            });

        $this->assertNotNull($activity, "Missing lead.updated activity for {$field}.");
        $this->assertSame($old, data_get($activity->properties, "changes.{$field}.old"));
        $this->assertSame($new, data_get($activity->properties, "changes.{$field}.new"));
    }
}
