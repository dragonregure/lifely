<?php

namespace App\Services;

use App\Contracts\ExportServiceInterface;
use Stringable;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportService implements ExportServiceInterface
{
    public function csvDownload(string $filename, iterable $rows, array $columns): StreamedResponse
    {
        return response()->streamDownload(function () use ($columns, $rows): void {
            $output = fopen('php://output', 'w');
            if ($output === false) {
                return;
            }

            fputcsv($output, array_column($columns, 'label'));

            foreach ($rows as $row) {
                fputcsv($output, array_map(
                    fn (array $column): string => $this->stringify($row[$column['key']] ?? null),
                    $columns
                ));
            }

            fclose($output);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }

    private function stringify(mixed $value): string
    {
        if ($value === null) {
            return '';
        }

        if (is_array($value)) {
            return implode('; ', array_map(fn (mixed $item): string => $this->stringify($item), $value));
        }

        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        if (is_scalar($value) || $value instanceof Stringable) {
            return (string) $value;
        }

        $encoded = json_encode($value);

        return is_string($encoded) ? $encoded : '';
    }
}
