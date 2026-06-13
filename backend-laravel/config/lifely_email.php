<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Lifely Email Sender
    |--------------------------------------------------------------------------
    |
    | The default "mail" sender uses Laravel's Mail facade, so MAIL_MAILER can
    | switch between SMTP, Mailpit, log, array, Resend transport, and other
    | supported mailers. Provider API adapters can be selected for exceptional
    | cases that need a vendor facade directly.
    |
    | Supported: "mail", "resend-api"
    |
    */

    'sender' => env('LIFELY_EMAIL_SENDER', 'mail'),

    /*
    |--------------------------------------------------------------------------
    | Laravel Mailer
    |--------------------------------------------------------------------------
    |
    | Leave this null to use MAIL_MAILER. Set a mailer name when Lifely's email
    | service should send through a specific mailer configured in config/mail.php.
    |
    */

    'mailer' => env('LIFELY_EMAIL_MAILER'),

];
