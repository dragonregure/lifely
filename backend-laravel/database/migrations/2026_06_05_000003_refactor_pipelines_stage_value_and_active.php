<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('pipelines', 'is_active')) {
            Schema::table('pipelines', function (Blueprint $table): void {
                $table->boolean('is_active')->default(true)->after('stage');
            });
        }

        foreach ($this->stageMigrationMap() as $label => $stage) {
            DB::table('pipelines')
                ->where('stage', $label)
                ->update(['stage' => $stage]);
        }

        DB::statement('ALTER TABLE pipelines MODIFY stage TINYINT UNSIGNED NOT NULL DEFAULT 0');

        if (Schema::hasColumn('pipelines', 'value')) {
            Schema::table('pipelines', function (Blueprint $table): void {
                $table->dropColumn('value');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('pipelines', 'value')) {
            Schema::table('pipelines', function (Blueprint $table): void {
                $table->decimal('value', 12, 2)->default(0)->after('stage');
            });
        }

        DB::statement("
            UPDATE pipelines
            SET stage = CASE stage
                WHEN '0' THEN 'New lead'
                WHEN '1' THEN 'Contacted'
                WHEN '2' THEN 'Qualified'
                WHEN '3' THEN 'Viewing'
                WHEN '4' THEN 'Viewing'
                WHEN '5' THEN 'Offer'
                WHEN '6' THEN 'Closing'
                WHEN '7' THEN 'Closing'
                WHEN '8' THEN 'New lead'
                ELSE 'New lead'
            END
        ");

        DB::statement("ALTER TABLE pipelines MODIFY stage VARCHAR(255) NOT NULL DEFAULT 'New lead'");

        if (Schema::hasColumn('pipelines', 'is_active')) {
            Schema::table('pipelines', function (Blueprint $table): void {
                $table->dropColumn('is_active');
            });
        }
    }

    /**
     * @return array<string, int>
     */
    private function stageMigrationMap(): array
    {
        return [
            'New lead' => 0,
            'New Lead' => 0,
            'Contacted' => 1,
            'Qualified' => 2,
            'Viewing' => 3,
            'Viewing Scheduled' => 3,
            'Viewing: Scheduled' => 3,
            'Viewed' => 4,
            'Offer' => 5,
            'Negotiating' => 5,
            'Closing' => 6,
            'Closed' => 6,
            'Closed Won' => 6,
            'Closed: Won' => 6,
            'Closed Lost' => 7,
            'Closed: Lost' => 7,
            'Dormant' => 8,
        ];
    }
};
