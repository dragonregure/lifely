<?php

namespace Database\Factories;

use App\Models\Reference;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Reference>
 */
class ReferenceFactory extends Factory
{
    protected $model = Reference::class;

    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'group' => 'street_type',
            'reference_key' => fake()->unique()->slug(2),
            'value' => fake()->words(2, true),
            'type' => 'string',
            'meta' => null,
            'status' => Reference::STATUS_ACTIVE,
        ];
    }

    public function system(): static
    {
        return $this->state(fn (): array => [
            'tenant_id' => null,
        ]);
    }
}
