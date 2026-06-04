<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('listing_users', function (Blueprint $table) {
            $table->foreignUuid('listing_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_primary_owner')->nullable();

            $table->primary(['listing_id', 'user_id']);
            $table->unique(['listing_id', 'is_primary_owner']);
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('listing_users');
    }
};
