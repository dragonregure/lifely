<?php

namespace App\Contracts;

use App\Support\DataTables\DataTableQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface ReportingServiceInterface
{
    /**
     * @param  array<string, string>  $filters
     */
    public function dashboard(string $tenantId, array $filters = []): array;

    /**
     * @return array<int, array<string, mixed>>
     */
    public function reportDefinitions(): array;

    /**
     * @return array<string, mixed>|null
     */
    public function reportDefinition(string $reportKey): ?array;

    /**
     * @param  array<string, string>  $filters
     */
    public function reportRows(string $tenantId, string $reportKey, DataTableQuery $dataTable, array $filters = []): LengthAwarePaginator;

    /**
     * @param  array<string, string>  $filters
     * @return Collection<int, array<string, mixed>>
     */
    public function exportRows(string $tenantId, string $reportKey, DataTableQuery $dataTable, array $filters = []): Collection;
}
