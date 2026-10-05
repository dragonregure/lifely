<?php

namespace App\Contracts;

interface LeadLifecycleServiceInterface
{
    public function process(): void;
}
