<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Resend API Key
    |--------------------------------------------------------------------------
    |
    | Resend's Laravel package reads RESEND_API_KEY. RESEND_KEY is accepted as
    | a compatibility fallback for Laravel's native services configuration.
    |
    */

    'api_key' => env('RESEND_API_KEY', env('RESEND_KEY')),

    /*
    |--------------------------------------------------------------------------
    | Resend Webhook Routing
    |--------------------------------------------------------------------------
    */

    'domain' => env('RESEND_DOMAIN'),
    'path' => env('RESEND_PATH', 'resend'),

    'webhook' => [
        'secret' => env('RESEND_WEBHOOK_SECRET'),
        'tolerance' => env('RESEND_WEBHOOK_TOLERANCE', 300),
    ],

];
