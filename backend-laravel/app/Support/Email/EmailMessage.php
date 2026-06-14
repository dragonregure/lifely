<?php

namespace App\Support\Email;

use InvalidArgumentException;

readonly class EmailMessage
{
    /**
     * @param  array<int, EmailAddress|string>  $to
     * @param  array<int, EmailAddress|string>  $cc
     * @param  array<int, EmailAddress|string>  $bcc
     * @param  array<string, string>  $headers
     */
    public function __construct(
        public array $to,
        public string $subject,
        public ?string $html = null,
        public ?string $text = null,
        public array $cc = [],
        public array $bcc = [],
        public ?EmailAddress $from = null,
        public ?EmailAddress $replyTo = null,
        public array $headers = []
    ) {
        if ($this->to === []) {
            throw new InvalidArgumentException('Email messages must have at least one recipient.');
        }

        if ($this->html === null && $this->text === null) {
            throw new InvalidArgumentException('Email messages must include HTML or text content.');
        }
    }

    /**
     * @return array<int, EmailAddress>
     */
    public function recipients(): array
    {
        return $this->addresses($this->to);
    }

    /**
     * @return array<int, EmailAddress>
     */
    public function cc(): array
    {
        return $this->addresses($this->cc);
    }

    /**
     * @return array<int, EmailAddress>
     */
    public function bcc(): array
    {
        return $this->addresses($this->bcc);
    }

    /**
     * @param  array<int, EmailAddress|string>  $addresses
     * @return array<int, EmailAddress>
     */
    private function addresses(array $addresses): array
    {
        return array_map(
            fn (EmailAddress|string $address): EmailAddress => is_string($address)
                ? new EmailAddress($address)
                : $address,
            $addresses
        );
    }
}
