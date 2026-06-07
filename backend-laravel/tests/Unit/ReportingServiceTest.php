<?php

namespace Tests\Unit;

use App\Contracts\ReportingServiceInterface;
use App\Models\Contact;
use App\Models\Lead;
use App\Models\Listing;
use App\Models\Tenant;
use App\Models\User;
use App\Support\DataTables\DataTableQuery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportingServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_calculates_dashboard_summary_from_current_crm_modules(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $contact = Contact::factory()->create([
            'tenant_id' => $tenant->id,
            'owner_id' => $user->id,
            'status' => true,
            'created_at' => now(),
        ]);
        $listing = Listing::query()->create([
            'tenant_id' => $tenant->id,
            'title' => 'Canal Villa',
            'address' => '100 Marina Way',
            'price' => 1200000,
            'status' => Listing::STATUS_SOLD,
            'bedrooms' => 4,
            'bathrooms' => 3,
            'property_type' => Listing::TYPE_VILLA,
        ]);

        Lead::query()->create([
            'tenant_id' => $tenant->id,
            'contact_id' => $contact->id,
            'listing_id' => $listing->id,
            'user_id' => $user->id,
            'stage' => Lead::STAGE_CLOSED_WON,
            'source' => Lead::SOURCE_REFERRAL,
            'is_active' => true,
        ]);
        $openListing = Listing::query()->create([
            'tenant_id' => $tenant->id,
            'title' => 'Garden Apartment',
            'address' => '200 Palm Street',
            'price' => 500000,
            'status' => Listing::STATUS_AVAILABLE,
            'bedrooms' => 2,
            'bathrooms' => 2,
            'property_type' => Listing::TYPE_APARTMENT,
        ]);

        foreach (range(1, 2) as $_) {
            Lead::query()->create([
                'tenant_id' => $tenant->id,
                'contact_id' => $contact->id,
                'listing_id' => $openListing->id,
                'user_id' => $user->id,
                'stage' => Lead::STAGE_NEW_LEAD,
                'source' => Lead::SOURCE_WEBSITE,
                'is_active' => true,
            ]);
        }

        $reports = app(ReportingServiceInterface::class);
        $summary = $reports->dashboard($tenant->id);
        $stageValues = collect($summary['lead_by_stage'])->keyBy('stage');
        $clientRows = $reports->reportRows(
            $tenant->id,
            'client-summary',
            new DataTableQuery(1, 15, null, null, 'desc', []),
        );

        $this->assertSame(1, $summary['new_leads']);
        $this->assertSame(1, $summary['executive']['total_active_clients']);
        $this->assertSame(1200000.0, $summary['executive']['revenue']);
        $this->assertSame(500000.0, $summary['executive']['pipeline_value']);
        $this->assertSame(1700000.0, $summary['lead_value']);
        $this->assertSame(100.0, $summary['win_rate']);
        $this->assertSame(2, $stageValues['New Lead']['deals']);
        $this->assertSame(500000.0, $stageValues['New Lead']['value']);
        $this->assertSame('Closed Won', $stageValues['Closed Won']['stage']);
        $this->assertSame(500000.0, $clientRows->items()[0]['pipeline_value']);
    }

    public function test_it_exposes_implemented_report_definitions(): void
    {
        $definitions = app(ReportingServiceInterface::class)->reportDefinitions();

        $this->assertContains('client-summary', array_column($definitions, 'key'));
        $this->assertContains('financial-revenue', array_column($definitions, 'key'));
    }
}
