<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('email_campaigns', function (Blueprint $table): void {
            $table->foreignUuid('listing_id')
                ->nullable()
                ->after('user_id')
                ->constrained('listings')
                ->nullOnDelete();
            $table->index(['tenant_id', 'listing_id']);
        });
    }

    public function down(): void
    {
        Schema::table('email_campaigns', function (Blueprint $table): void {
            $table->dropForeign(['listing_id']);
            $table->dropIndex(['tenant_id', 'listing_id']);
            $table->dropColumn('listing_id');
        });
    }
};
