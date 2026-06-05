<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contacts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->string('status')->default('New');
            $table->decimal('budget', 12, 2)->nullable();
            $table->string('source')->nullable();
            $table->timestamp('last_contacted_at')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'status']);
        });

        Schema::create('listings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('address');
            $table->decimal('price', 12, 2);
            $table->unsignedTinyInteger('status')->default(1);
            $table->unsignedTinyInteger('bedrooms')->default(0);
            $table->unsignedTinyInteger('bathrooms')->default(0);
            $table->unsignedTinyInteger('property_type')->default(1);
            $table->timestamps();
            $table->index(['tenant_id', 'status']);
        });

        Schema::create('pipelines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('contact_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('listing_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('stage')->default(0);
            $table->boolean('is_active')->default(true);
            $table->string('next_task')->nullable();
            $table->timestamp('due_at')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'stage']);
        });

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action_type');
            $table->text('description');
            $table->timestamps();
            $table->index(['tenant_id', 'action_type']);
        });

        Schema::create('email_campaigns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('subject');
            $table->longText('body');
            $table->json('contact_ids');
            $table->unsignedInteger('recipient_count');
            $table->string('status')->default('Queued');
            $table->timestamps();
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_campaigns');
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('pipelines');
        Schema::dropIfExists('listings');
        Schema::dropIfExists('contacts');
    }
};
