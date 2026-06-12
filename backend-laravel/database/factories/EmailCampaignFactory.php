<?php

namespace Database\Factories;

use App\Models\EmailCampaign;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EmailCampaign>
 */
class EmailCampaignFactory extends Factory
{
    public function definition(): array
    {
        $recipientCount = fake()->numberBetween(25, 250);

        return [
            'tenant_id' => Tenant::factory(),
            'user_id' => User::factory(),
            'subject' => fake()->randomElement([
                'New listings matching your search',
                'Open house schedule for this weekend',
                'Price changes in your preferred area',
                'Investment properties worth reviewing',
            ]),
            'body' => fake()->paragraphs(3, true),
            'contact_ids' => [],
            'recipient_count' => $recipientCount,
            'status' => fake()->randomElement(['Queued', 'Sending', 'Sent', 'Failed']),
        ];
    }
}
