<?php

namespace Tests\Unit;

use App\Contracts\ContactRepositoryInterface;
use App\Contracts\PipelineRepositoryInterface;
use App\Models\Contact;
use App\Models\PipelineDeal;
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

            public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator
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
                return collect(['New' => 3, 'Closed' => 1]);
            }
        };

        $pipeline = new class implements PipelineRepositoryInterface {
            public function all(string $tenantId): Collection
            {
                return collect();
            }

            public function paginate(string $tenantId, DataTableQuery $dataTable): LengthAwarePaginator
            {
                return new Paginator([], 0, $dataTable->perPage);
            }

            public function create(string $tenantId, array $data): PipelineDeal
            {
                return new PipelineDeal();
            }

            public function updateStage(string $tenantId, string $dealId, string $stage): ?PipelineDeal
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
                return collect([(object) ['stage' => 'Viewing', 'deals' => 2, 'value' => 800000]]);
            }
        };

        $summary = (new ReportingService($contacts, $pipeline))->dashboard('tenant-1');

        $this->assertSame(3, $summary['new_leads']);
        $this->assertSame(5, $summary['pending_tasks']);
        $this->assertSame(1200000.0, $summary['pipeline_value']);
        $this->assertSame(25.0, $summary['win_rate']);
        $this->assertSame('Viewing', $summary['pipeline_by_stage'][0]['stage']);
    }
}
