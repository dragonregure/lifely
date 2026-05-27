<?php

namespace App\Services;

use App\Contracts\ContactRepositoryInterface;
use App\Contracts\PipelineRepositoryInterface;
use App\Contracts\ReportingServiceInterface;

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
        $totalContacts = max(1, (int) $contactsByStatus->sum());
        $closedContacts = (int) ($contactsByStatus['Closed'] ?? 0);

        return [
            'new_leads' => (int) ($contactsByStatus['New'] ?? 0),
            'pending_tasks' => $this->pipeline->pendingTaskCount($tenantId),
            'pipeline_value' => $this->pipeline->totalValue($tenantId),
            'win_rate' => round(($closedContacts / $totalContacts) * 100, 1),
            'lead_health' => $contactsByStatus
                ->map(fn ($total, $status) => ['label' => $status, 'value' => (int) $total])
                ->values()
                ->all(),
            'pipeline_by_stage' => $this->pipeline
                ->valueByStage($tenantId)
                ->map(fn ($row) => [
                    'stage' => $row->stage,
                    'deals' => (int) $row->deals,
                    'value' => (float) $row->value,
                ])
                ->values()
                ->all(),
        ];
    }
}
