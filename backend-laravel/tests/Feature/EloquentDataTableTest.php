<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\Tenant;
use App\Models\User;
use App\Support\DataTables\DataTableQuery;
use App\Support\DataTables\EloquentDataTable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EloquentDataTableTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_adds_a_stable_model_key_tie_breaker_for_paginated_results(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $timestamp = now()->startOfSecond();

        Contact::query()->insert([
            [
                'id' => '00000000-0000-0000-0000-000000000001',
                'tenant_id' => $tenant->id,
                'owner_id' => $user->id,
                'first_name' => 'First',
                'last_name' => 'Contact',
                'email' => 'first@example.com',
                'status' => true,
                'source' => Contact::SOURCE_MANUAL_ENTRY,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'id' => '00000000-0000-0000-0000-000000000002',
                'tenant_id' => $tenant->id,
                'owner_id' => $user->id,
                'first_name' => 'Second',
                'last_name' => 'Contact',
                'email' => 'second@example.com',
                'status' => true,
                'source' => Contact::SOURCE_MANUAL_ENTRY,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
            [
                'id' => '00000000-0000-0000-0000-000000000003',
                'tenant_id' => $tenant->id,
                'owner_id' => $user->id,
                'first_name' => 'Third',
                'last_name' => 'Contact',
                'email' => 'third@example.com',
                'status' => true,
                'source' => Contact::SOURCE_MANUAL_ENTRY,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ],
        ]);

        $firstPage = EloquentDataTable::paginate(
            Contact::query()->where('tenant_id', $tenant->id),
            new DataTableQuery(1, 2, null, null, 'desc', []),
            [],
            [],
            [],
            'contacts.created_at'
        );
        $secondPage = EloquentDataTable::paginate(
            Contact::query()->where('tenant_id', $tenant->id),
            new DataTableQuery(2, 2, null, null, 'desc', []),
            [],
            [],
            [],
            'contacts.created_at'
        );

        $this->assertSame([
            '00000000-0000-0000-0000-000000000003',
            '00000000-0000-0000-0000-000000000002',
        ], collect($firstPage->items())->pluck('id')->all());
        $this->assertSame([
            '00000000-0000-0000-0000-000000000001',
        ], collect($secondPage->items())->pluck('id')->all());
    }
}
