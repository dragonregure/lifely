<?php

use App\Models\Pipeline;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pipelines', function (Blueprint $table): void {
            $table->unsignedTinyInteger('source')
                ->default(Pipeline::SOURCE_MANUAL_ENTRY)
                ->after('user_id');
            $table->index(['tenant_id', 'source']);
        });
    }

    public function down(): void
    {
        Schema::table('pipelines', function (Blueprint $table): void {
            $table->dropIndex(['tenant_id', 'source']);
            $table->dropColumn('source');
        });
    }
};
