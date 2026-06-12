<?php

namespace Database\Factories;

use App\Models\ActivityLog;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ActivityLog>
 */
class ActivityLogFactory extends Factory
{
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'user_id' => User::factory(),
            'action_type' => fake()->randomElement([
                'lead.updated',
                'lead.viewing',
                'lead.negotiating',
                'lead.closed_won',
                'lead.closed_lost',
                'contact.updated',
                'listing.updated',
            ]),
            'description' => fake()->sentence(10),
            'properties' => [
                'source' => fake()->randomElement(['Website', 'Referral', 'Portal', 'Open House']),
                'priority' => fake()->randomElement(['low', 'normal', 'high']),
            ],
        ];
    }
}
