<?php

use App\Models\Reference;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        $this->ensureContactStatusReferences();

        Schema::table('contacts', function (Blueprint $table): void {
            $table->foreignUuid('status_id')
                ->nullable()
                ->after('phone')
                ->constrained('references')
                ->nullOnDelete();
        });

        DB::statement("
            UPDATE contacts
            INNER JOIN `references` AS contact_statuses
                ON contact_statuses.`group` = 'contact_status'
                AND contact_statuses.tenant_id IS NULL
                AND contact_statuses.deleted_at IS NULL
                AND contact_statuses.value = contacts.status
            SET contacts.status_id = contact_statuses.id
        ");

        $defaultStatusId = DB::table('references')
            ->whereNull('tenant_id')
            ->where('group', 'contact_status')
            ->where('reference_key', 'new')
            ->value('id');

        DB::table('contacts')
            ->whereNull('status_id')
            ->update(['status_id' => $defaultStatusId]);

        Schema::table('contacts', function (Blueprint $table): void {
            $table->index(['tenant_id', 'status_id']);
            $table->dropIndex('contacts_tenant_id_status_index');
            $table->dropColumn('status');
        });
    }

    public function down(): void
    {
        Schema::table('contacts', function (Blueprint $table): void {
            $table->string('status')->nullable()->after('phone');
        });

        DB::statement("
            UPDATE contacts
            LEFT JOIN `references` AS contact_statuses
                ON contact_statuses.id = contacts.status_id
            SET contacts.status = COALESCE(contact_statuses.value, 'New')
        ");

        Schema::table('contacts', function (Blueprint $table): void {
            $table->index(['tenant_id', 'status']);
            $table->dropForeign(['status_id']);
            $table->dropIndex('contacts_tenant_id_status_id_index');
            $table->dropColumn('status_id');
        });

        DB::statement("ALTER TABLE contacts MODIFY status VARCHAR(255) NOT NULL DEFAULT 'New'");
    }

    private function ensureContactStatusReferences(): void
    {
        foreach ($this->contactStatuses() as $key => $value) {
            $exists = DB::table('references')
                ->whereNull('tenant_id')
                ->where('group', 'contact_status')
                ->where('reference_key', $key)
                ->exists();

            if ($exists) {
                continue;
            }

            DB::table('references')->insert([
                'id' => (string) Str::uuid(),
                'tenant_id' => null,
                'group' => 'contact_status',
                'reference_key' => $key,
                'value' => $value,
                'type' => 'string',
                'meta' => null,
                'status' => Reference::STATUS_ACTIVE,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * @return array<string, string>
     */
    private function contactStatuses(): array
    {
        return [
            'new' => 'New',
            'qualified' => 'Qualified',
            'viewing' => 'Viewing',
            'negotiating' => 'Negotiating',
            'closed' => 'Closed',
            'dormant' => 'Dormant',
        ];
    }
};
