<?php

namespace Database\Factories;

use App\Models\Document;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Document>
 */
class DocumentFactory extends Factory
{
    public function definition(): array
    {
        $subtype = fake()->randomElement(['brochure', 'seller-disclosure', 'floor-plan', 'inspection']);

        return [
            'tenant_id' => Tenant::factory(),
            'model' => 'listing',
            'model_id' => (string) Str::uuid(),
            'type' => fake()->randomElement(['marketing', 'compliance', 'media']),
            'subtype' => $subtype,
            'file_name' => sprintf('%s-%s.pdf', fake()->slug(3), $subtype),
            'order' => fake()->numberBetween(0, 5),
            'url' => fake()->url(),
        ];
    }
}
