<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * @var array<string, string>
     */
    private array $permissionRenames = [
        'pipeline.view' => 'leads.view',
        'pipeline.create' => 'leads.create',
        'pipeline.update' => 'leads.update',
        'pipeline.change_assignee' => 'leads.change_assignee',
        'pipeline.assign_to_self' => 'leads.assign_to_self',
    ];

    public function up(): void
    {
        if (Schema::hasTable('pipelines') && ! Schema::hasTable('leads')) {
            Schema::rename('pipelines', 'leads');
        }

        $this->renamePermissions($this->permissionRenames);
        $this->renameReferenceGroup('pipeline_stage', 'lead_stage');
        $this->renameActivity('pipeline', 'lead');
    }

    public function down(): void
    {
        if (Schema::hasTable('leads') && ! Schema::hasTable('pipelines')) {
            Schema::rename('leads', 'pipelines');
        }

        $this->renamePermissions(array_flip($this->permissionRenames));
        $this->renameReferenceGroup('lead_stage', 'pipeline_stage');
        $this->renameActivity('lead', 'pipeline');
    }

    /**
     * @param  array<string, string>  $renames
     */
    private function renamePermissions(array $renames): void
    {
        if (! Schema::hasTable('permissions')) {
            return;
        }

        foreach ($renames as $from => $to) {
            DB::table('permissions')
                ->where('name', $from)
                ->update(['name' => $to]);
        }
    }

    private function renameReferenceGroup(string $from, string $to): void
    {
        if (! Schema::hasTable('references')) {
            return;
        }

        DB::table('references')
            ->where('group', $from)
            ->update(['group' => $to]);
    }

    private function renameActivity(string $from, string $to): void
    {
        if (! Schema::hasTable('activity_logs')) {
            return;
        }

        DB::table('activity_logs')
            ->whereIn('action_type', ["{$from}.created", "{$from}.updated", "{$from}.deleted"])
            ->update(['action_type' => DB::raw("REPLACE(action_type, '{$from}.', '{$to}.')")]);

        DB::table('activity_logs')
            ->where('description', 'like', "%{$from}%")
            ->update(['description' => DB::raw("REPLACE(description, '{$from}', '{$to}')")]);
    }
};
