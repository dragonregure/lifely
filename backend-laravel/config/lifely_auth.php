<?php

return [
    'access_token_minutes' => (int) env('LIFELY_ACCESS_TOKEN_MINUTES', 15),
    'refresh_token_days' => (int) env('LIFELY_REFRESH_TOKEN_DAYS', 30),
];
