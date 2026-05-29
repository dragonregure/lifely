<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Reference */
class ReferenceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'is_system' => $this->is_system,
            'group' => $this->group,
            'key' => $this->reference_key,
            'value' => $this->castValue(),
            'type' => $this->type,
            'meta' => $this->meta,
            'status' => $this->status,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    private function castValue(): mixed
    {
        if ($this->value === null || $this->type === 'null') {
            return null;
        }

        return match ($this->type) {
            'int', 'integer' => (int) $this->value,
            'float', 'double' => (float) $this->value,
            'bool', 'boolean' => filter_var(
                $this->value,
                FILTER_VALIDATE_BOOLEAN,
                FILTER_NULL_ON_FAILURE
            ) ?? (bool) $this->value,
            'array' => $this->castJsonArray(),
            'object' => $this->castJsonObject(),
            default => (string) $this->value,
        };
    }

    private function castJsonArray(): array
    {
        $decoded = json_decode((string) $this->value, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function castJsonObject(): object
    {
        $decoded = json_decode((string) $this->value);

        return is_object($decoded) ? $decoded : (object) [];
    }
}
