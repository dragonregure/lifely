<?php

namespace App\Http\Controllers\Api\V1;

use App\Contracts\ActivityRepositoryInterface;
use App\Contracts\ExportServiceInterface;
use App\Contracts\ReportingServiceInterface;
use App\Support\DataTables\DataTableQuery;
use App\Support\Rbac\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class ReportingController extends BaseApiController
{
    private const ALLOWED_FILTERS = [
        'date_from',
        'date_to',
        'owner_id',
        'source',
        'stage',
        'status',
        'risk_threshold_days',
    ];

    public function __construct(
        private readonly ReportingServiceInterface $reports,
        private readonly ActivityRepositoryInterface $activity,
        private readonly ExportServiceInterface $exports,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize(Permissions::REPORTS_VIEW);

        $filters = DataTableQuery::fromRequest($request, self::ALLOWED_FILTERS)->filters;

        return response()->json([
            'data' => [
                'dashboard' => $this->reports->dashboard($this->tenantId($request), $filters),
                'reports' => $this->reports->reportDefinitions(),
                'export_formats' => [
                    ['key' => 'csv', 'label' => 'CSV', 'implemented' => true],
                    ['key' => 'xlsx', 'label' => 'Excel', 'implemented' => false],
                    ['key' => 'pdf', 'label' => 'PDF', 'implemented' => false],
                ],
            ],
        ]);
    }

    public function rows(Request $request, string $report): JsonResponse
    {
        $this->authorize(Permissions::REPORTS_VIEW);

        if ($this->reports->reportDefinition($report) === null) {
            throw new NotFoundHttpException('Report not found.');
        }

        $dataTable = DataTableQuery::fromRequest($request, self::ALLOWED_FILTERS);
        $paginator = $this->reports->reportRows($this->tenantId($request), $report, $dataTable, $dataTable->filters);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'from' => $paginator->firstItem(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'to' => $paginator->lastItem(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function export(Request $request, string $report): StreamedResponse
    {
        $this->authorize(Permissions::REPORTS_VIEW);

        $definition = $this->reports->reportDefinition($report);
        if ($definition === null) {
            throw new NotFoundHttpException('Report not found.');
        }

        $format = strtolower((string) $request->query('format', 'csv'));
        if ($format !== 'csv') {
            throw new UnprocessableEntityHttpException('Only CSV export is available until Excel and PDF export pipelines are implemented.');
        }

        $dataTable = DataTableQuery::fromRequest($request, self::ALLOWED_FILTERS);
        $rows = $this->reports->exportRows($this->tenantId($request), $report, $dataTable, $dataTable->filters);
        $columns = collect($definition['columns'] ?? [])
            ->filter(fn ($column): bool => is_array($column) && is_string($column['key'] ?? null) && is_string($column['label'] ?? null))
            ->map(fn (array $column): array => [
                'key' => $column['key'],
                'label' => $column['label'],
            ])
            ->values();

        $this->activity->record(
            $this->tenantId($request),
            $request->user()?->id,
            'report.exported',
            'Exported report: '.$definition['name'],
            [
                'report_key' => $report,
                'format' => $format,
                'filters' => $dataTable->filters,
                'rows' => $rows->count(),
            ]
        );

        $filename = $report.'-'.now()->format('Ymd-His').'.csv';

        return $this->exports->csvDownload($filename, $rows, $columns->all());
    }
}
