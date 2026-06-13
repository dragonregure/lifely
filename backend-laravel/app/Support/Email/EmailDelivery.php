<?php

namespace App\Support\Email;

readonly class EmailDelivery
{
    /**
     * @param  array<string, mixed>  $metadata
     */
    public function __construct(
        public string $provider,
        public ?string $messageId = null,
        public array $metadata = []
    ) {
    }
}
