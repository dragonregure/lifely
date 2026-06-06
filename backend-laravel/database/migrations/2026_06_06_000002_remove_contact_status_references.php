<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('references')
            ->where('group', 'contact_status')
            ->whereNull('deleted_at')
            ->update([
                'deleted_at' => now(),
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        DB::table('references')
            ->where('group', 'contact_status')
            ->update([
                'deleted_at' => null,
                'updated_at' => now(),
            ]);
    }
};
