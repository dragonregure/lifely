<?php

use App\Models\Reference;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('references', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('group');
            $table->string('reference_key');
            $table->string('value')->nullable();
            $table->string('type')->default('string');
            $table->json('meta')->nullable();
            $table->string('status')->default(Reference::STATUS_ACTIVE);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['tenant_id', 'group']);
            $table->index(['group', 'reference_key']);
            $table->unique(['tenant_id', 'group', 'reference_key'], 'references_tenant_group_key_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('references');
    }
};
