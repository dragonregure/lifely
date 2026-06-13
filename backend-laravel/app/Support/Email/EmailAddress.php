<?php

namespace App\Support\Email;

readonly class EmailAddress
{
    public function __construct(
        public string $address,
        public ?string $name = null
    ) {
    }

    /**
     * @return array{email: string, name?: string}
     */
    public function toResendPayload(): array
    {
        $payload = ['email' => $this->address];

        if ($this->name !== null && $this->name !== '') {
            $payload['name'] = $this->name;
        }

        return $payload;
    }
}
