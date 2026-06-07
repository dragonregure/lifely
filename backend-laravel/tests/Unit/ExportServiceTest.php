<?php

namespace Tests\Unit;

use App\Contracts\ExportServiceInterface;
use Tests\TestCase;

class ExportServiceTest extends TestCase
{
    public function test_it_streams_rows_as_csv_download(): void
    {
        $response = app(ExportServiceInterface::class)->csvDownload('sample.csv', [
            [
                'name' => 'Maya Hart',
                'tags' => ['alpha', 'beta'],
                'active' => true,
            ],
        ], [
            ['key' => 'name', 'label' => 'Name'],
            ['key' => 'tags', 'label' => 'Tags'],
            ['key' => 'active', 'label' => 'Active'],
        ]);

        ob_start();
        $response->sendContent();
        $content = (string) ob_get_clean();

        $this->assertSame('text/csv', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('Name,Tags,Active', $content);
        $this->assertStringContainsString('"Maya Hart","alpha; beta",true', $content);
    }
}
