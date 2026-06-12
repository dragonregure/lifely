<?php

namespace Database\Factories;

use App\Models\Listing;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Listing>
 */
class ListingFactory extends Factory
{
    public function definition(): array
    {
        $propertyType = fake()->randomElement(Listing::propertyTypeValues());

        return [
            'tenant_id' => Tenant::factory(),
            'title' => fake()->streetName() . ' ' . fake()->randomElement([
                'Residence',
                'Townhome',
                'Lofts',
                'Estate',
                'Commercial Suite',
            ]),
            'address' => fake()->streetAddress() . ', ' . fake()->city() . ', ' . fake()->randomElement([
                'AZ',
                'CA',
                'CO',
                'FL',
                'GA',
                'IL',
                'NY',
                'OR',
                'TX',
                'WA',
            ]),
            'price' => fake()->numberBetween(225000, 3200000),
            'status' => fake()->randomElement(Listing::statusValues()),
            'bedrooms' => $propertyType === Listing::TYPE_STUDIO ? 0 : fake()->numberBetween(1, 6),
            'bathrooms' => fake()->numberBetween(1, 5),
            'property_type' => $propertyType,
        ];
    }
}
