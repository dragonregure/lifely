<?php

namespace App\OpenApi;

use OpenApi\Attributes as OA;

#[OA\Info(
    version: '1.0.0',
    title: 'Lifely API',
    description: 'API-first Laravel backend for the Lifely multi-tenant real estate CRM.'
)]
#[OA\Server(
    url: '/api/v1',
    description: 'Current API host'
)]
#[OA\SecurityScheme(
    securityScheme: 'BearerAuth',
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'Sanctum token'
)]
#[OA\SecurityScheme(
    securityScheme: 'TenantHeader',
    type: 'apiKey',
    name: 'X-Tenant-Id',
    in: 'header'
)]
final class LifelyOpenApi
{
    #[OA\Get(
        path: '/health',
        summary: 'Health check',
        security: [],
        tags: ['System'],
        responses: [
            new OA\Response(response: 200, description: 'Service is healthy.'),
        ]
    )]
    public function health(): void
    {
    }
}
