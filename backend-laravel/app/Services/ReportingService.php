<?php

namespace App\Services;

use App\Contracts\ContactRepositoryInterface;
use App\Contracts\PipelineRepositoryInterface;
use App\Contracts\ReportingServiceInterface;
use App\Models\Pipeline;

class ReportingService implements ReportingServiceInterface
{
    public function __construct(
        private readonly ContactRepositoryInterface $contacts,
        private readonly PipelineRepositoryInterface $pipeline,
    ) {
    }

    public function dashboard(string $tenantId): array
    {
        $contactsByStatus = $this->contacts->countByStatus($tenantId);

        return [
            'new_leads' => (int) ($contactsByStatus['Active'] ?? 0),
            'pending_tasks' => $this->pipeline->pendingTaskCount($tenantId),
            'pipeline_value' => $this->pipeline->totalValue($tenantId),
            'win_rate' => 0,
            'lead_health' => $contactsByStatus
                ->map(fn ($total, $status) => ['label' => $status, 'value' => (int) $total])
                ->values()
                ->all(),
            'pipeline_by_stage' => $this->pipeline
                ->valueByStage($tenantId)
                ->map(fn ($row) => [
                    'stage' => Pipeline::stageLabel((int) $row->stage),
                    'deals' => (int) $row->deals,
                    'value' => (float) $row->value,
                ])
                ->values()
                ->all(),
        ];
    }
}
