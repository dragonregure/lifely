<?php

namespace Tests\Unit;

use App\Contracts\ContactRepositoryInterface;
use App\Contracts\LeadRepositoryInterface;
use App\Models\Contact;
use App\Models\Lead;
use App\Services\ReportingService;
use App\Support\DataTables\DataTableQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Pagination\LengthAwarePaginator as Paginator;
use PHPUnit\Framework\TestCase;

class ReportingServiceTest extends TestCase
{
    public function test_it_calculates_dashboard_summary_from_domain_repositories(): void
    {
        $contacts = new class implements ContactRepositoryInterface {
            public function all(string $tenantId, array $filters = []): Collection
            {
                return collect();
            }

            public function paginate(string $tenantId, DataTableQuery $dataTable, array $includes = []): LengthAwarePaginator
            {
                return new Paginator([], 0, $dataTable->perPage);
            }

            public function find(string $tenantId, string $contactId): ?Contact
            {
                return null;
            }

            public function create(string $tenantId, array $data): Contact
            {
                return new Contact();
            }

            public function update(string $tenantId, string $contactId, array $data): ?Contact
            {
                return null;
            }

            public function delete(string $tenantId, string $contactId): bool
            {
                return false;
            }

            public function countByStatus(string $tenantId): Collection
            {
                return collect(['Active' => 3, 'Inactive' => 1]);
            }
        };

        $lead = new class implements LeadRepositoryInterface {
            public function all(string $tenantId): Collection
            {
                return collect();
            }

            public function paginate(string $tenantId, DataTableQuery $dataTable, array $includes = []): LengthAwarePaginator
            {
                return new Paginator([], 0, $dataTable->perPage);
            }

            public function find(string $tenantId, string $leadId): ?Lead
            {
                return null;
            }

            public function create(string $tenantId, array $data): Lead
            {
                return new Lead();
            }

            public function update(string $tenantId, string $leadId, array $data): ?Lead
            {
                return null;
            }

            public function updateStage(string $tenantId, string $leadId, int $stage): ?Lead
            {
                return null;
            }

            public function pendingTaskCount(string $tenantId): int
            {
                return 5;
            }

            public function totalValue(string $tenantId): float
            {
                return 1200000.0;
            }

            public function valueByStage(string $tenantId): Collection
            {
                return collect([(object) ['stage' => Lead::STAGE_VIEWING_SCHEDULED, 'deals' => 2, 'value' => 800000]]);
            }
        };

        $summary = (new ReportingService($contacts, $lead))->dashboard('tenant-1');

        $this->assertSame(3, $summary['new_leads']);
        $this->assertSame(5, $summary['pending_tasks']);
        $this->assertSame(1200000.0, $summary['lead_value']);
        $this->assertSame(0, $summary['win_rate']);
        $this->assertSame('Viewing Scheduled', $summary['lead_by_stage'][0]['stage']);
    }
}
