<?php

return [
    'app_mode' => env('LIFELY_APP_MODE', 'production'),

    'demo_email_limit' => (int) env('LIFELY_DEMO_EMAIL_LIMIT', 3),
];
