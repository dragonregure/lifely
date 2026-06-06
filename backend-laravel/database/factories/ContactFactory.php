<?php

namespace Database\Factories;

use App\Models\Contact;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Contact>
 */
class ContactFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tenant_id' => Tenant::factory(),
            'email' => fake()->unique()->safeEmail(),
            'owner_id' => User::factory(),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'phone' => fake()->phoneNumber(),
            'status' => true,
            'budget' => fake()->numberBetween(100000, 1000000),
            'source' => Contact::SOURCE_OPEN_HOUSE,
        ];
    }

    public function withAssignedOwner(?Collection $users = null): static
    {
        return $this->state(function () use ($users) {
            if ($users === null || $users->isEmpty()) {
                $users = User::query()->whereNotNull('tenant_id')->get();
            }

            return [
                'owner_id' => $users->random()->getKey(),
            ];
        });
    }
}
