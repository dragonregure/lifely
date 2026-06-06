<?php

namespace App\Services;

use App\Contracts\ContactRepositoryInterface;
use App\Contracts\LeadRepositoryInterface;
use App\Contracts\ReportingServiceInterface;
use App\Models\Lead;

class ReportingService implements ReportingServiceInterface
{
    public function __construct(
        private readonly ContactRepositoryInterface $contacts,
        private readonly LeadRepositoryInterface $leads,
    ) {
    }

    public function dashboard(string $tenantId): array
    {
        $contactsByStatus = $this->contacts->countByStatus($tenantId);

        return [
            'new_leads' => (int) ($contactsByStatus['Active'] ?? 0),
            'pending_tasks' => $this->leads->pendingTaskCount($tenantId),
            'lead_value' => $this->leads->totalValue($tenantId),
            'win_rate' => 0,
            'lead_health' => $contactsByStatus
                ->map(fn ($total, $status) => ['label' => $status, 'value' => (int) $total])
                ->values()
                ->all(),
            'lead_by_stage' => $this->leads
                ->valueByStage($tenantId)
                ->map(fn ($row) => [
                    'stage' => Lead::stageLabel((int) $row->stage),
                    'deals' => (int) $row->deals,
                    'value' => (float) $row->value,
                ])
                ->values()
                ->all(),
        ];
    }
}
