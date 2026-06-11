<?php

namespace Database\Factories;

use App\Models\Contact;
use App\Models\Lead;
use App\Models\Listing;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Lead>
 */
class LeadFactory extends Factory
{
    public function definition(): array
    {
        $stage = fake()->randomElement(Lead::stageValues());

        return [
            'tenant_id' => Tenant::factory(),
            'contact_id' => Contact::factory(),
            'listing_id' => Listing::factory(),
            'user_id' => User::factory(),
            'stage' => $stage,
            'source' => fake()->randomElement(Lead::sourceValues()),
            'is_active' => ! Lead::isClosedStageValue($stage),
            'next_task' => Lead::isClosedStageValue($stage) ? null : fake()->sentence(6),
            'due_at' => Lead::isClosedStageValue($stage) ? null : fake()->dateTimeBetween('-7 days', '+30 days'),
        ];
    }
}
