<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('model');
            $table->uuid('model_id');
            $table->string('type');
            $table->unsignedInteger('order')->default(0);
            $table->text('url');
            $table->timestamps();
            $table->index(['tenant_id', 'model', 'model_id']);
            $table->index(['tenant_id', 'model', 'model_id', 'type', 'order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
