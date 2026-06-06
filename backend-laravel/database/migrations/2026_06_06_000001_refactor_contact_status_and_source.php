<?php

use App\Models\Contact;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contacts', function (Blueprint $table): void {
            $table->boolean('status')
                ->default(true)
                ->after('phone');
            $table->unsignedTinyInteger('source_value')
                ->nullable()
                ->after('budget');
        });

        DB::statement("
            UPDATE contacts
            LEFT JOIN `references` AS contact_statuses
                ON contact_statuses.id = contacts.status_id
            SET contacts.status = CASE
                WHEN LOWER(contact_statuses.reference_key) = 'dormant' THEN 0
                WHEN LOWER(contact_statuses.value) = 'dormant' THEN 0
                ELSE 1
            END
        ");

        foreach (Contact::SOURCE_LABELS as $value => $label) {
            DB::table('contacts')
                ->whereRaw('LOWER(source) = ?', [strtolower($label)])
                ->update(['source_value' => $value]);
        }

        DB::table('contacts')
            ->whereNull('source_value')
            ->whereNotNull('source')
            ->update(['source_value' => Contact::SOURCE_MANUAL_ENTRY]);

        Schema::table('contacts', function (Blueprint $table): void {
            $table->dropForeign(['status_id']);
            $table->dropColumn(['status_id', 'source']);
        });

        DB::statement('ALTER TABLE contacts CHANGE source_value source TINYINT UNSIGNED NULL');

        Schema::table('contacts', function (Blueprint $table): void {
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'source']);
            $table->index(['tenant_id', 'owner_id']);
        });
    }

    public function down(): void
    {
        Schema::table('contacts', function (Blueprint $table): void {
            $table->string('source_text')->nullable()->after('budget');
            $table->foreignUuid('status_id')
                ->nullable()
                ->after('phone')
                ->constrained('references')
                ->nullOnDelete();
        });

        foreach (Contact::SOURCE_LABELS as $value => $label) {
            DB::table('contacts')
                ->where('source', $value)
                ->update(['source_text' => $label]);
        }

        $activeStatusId = DB::table('references')
            ->whereNull('tenant_id')
            ->where('group', 'contact_status')
            ->where('reference_key', 'new')
            ->value('id');
        $inactiveStatusId = DB::table('references')
            ->whereNull('tenant_id')
            ->where('group', 'contact_status')
            ->where('reference_key', 'dormant')
            ->value('id');

        DB::table('contacts')
            ->where('status', true)
            ->update(['status_id' => $activeStatusId]);
        DB::table('contacts')
            ->where('status', false)
            ->update(['status_id' => $inactiveStatusId ?? $activeStatusId]);

        Schema::table('contacts', function (Blueprint $table): void {
            $table->dropIndex(['tenant_id', 'status']);
            $table->dropIndex(['tenant_id', 'source']);
            $table->dropIndex(['tenant_id', 'owner_id']);
            $table->dropColumn(['status', 'source']);
            $table->index(['tenant_id', 'status_id']);
        });

        DB::statement('ALTER TABLE contacts CHANGE source_text source VARCHAR(255) NULL');
    }
};
