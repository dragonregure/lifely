<?php

namespace App\Contracts;

interface LeadLifecycleRepositoryInterface
{
    public function moveStaleActiveLeadsToDormant(string $cutoffDate): void;

    public function deactivateDormantLeads(string $cutoffDate): void;

    public function deactivateProblematicLeads(string $cutoffDate): void;
}
