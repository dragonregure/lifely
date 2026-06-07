<?php

namespace App\Contracts;

use Symfony\Component\HttpFoundation\StreamedResponse;

interface ExportServiceInterface
{
    /**
     * @param  iterable<array<string, mixed>>  $rows
     * @param  array<int, array{key: string, label: string}>  $columns
     */
    public function csvDownload(string $filename, iterable $rows, array $columns): StreamedResponse;
}
