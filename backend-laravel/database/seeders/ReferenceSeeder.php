<?php

namespace Database\Seeders;

use App\Models\Reference;
use Illuminate\Database\Seeder;

class ReferenceSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->systemReferences() as $reference) {
            Reference::query()->updateOrCreate([
                'tenant_id' => null,
                'group' => $reference['group'],
                'reference_key' => $reference['reference_key'],
            ], $reference + [
                'type' => 'string',
                'status' => Reference::STATUS_ACTIVE,
            ]);
        }
    }

    private function systemReferences(): array
    {
        return [
            ['group' => Reference::GROUP_REFERENCE_TYPE, 'reference_key' => 'string', 'value' => 'String'],
            ['group' => Reference::GROUP_REFERENCE_TYPE, 'reference_key' => 'int', 'value' => 'Integer'],
            ['group' => Reference::GROUP_REFERENCE_TYPE, 'reference_key' => 'float', 'value' => 'Float'],
            ['group' => Reference::GROUP_REFERENCE_TYPE, 'reference_key' => 'bool', 'value' => 'Boolean'],
            ['group' => Reference::GROUP_REFERENCE_TYPE, 'reference_key' => 'array', 'value' => 'Array'],
            ['group' => Reference::GROUP_REFERENCE_TYPE, 'reference_key' => 'object', 'value' => 'Object'],
            ['group' => Reference::GROUP_REFERENCE_TYPE, 'reference_key' => 'null', 'value' => 'Null'],
            ['group' => 'street_type', 'reference_key' => 'st', 'value' => 'Street'],
            ['group' => 'street_type', 'reference_key' => 'ave', 'value' => 'Avenue'],
            ['group' => 'street_type', 'reference_key' => 'rd', 'value' => 'Road'],
            ['group' => 'street_type', 'reference_key' => 'blvd', 'value' => 'Boulevard'],
            ['group' => 'street_type', 'reference_key' => 'ln', 'value' => 'Lane'],
            ['group' => 'street_type', 'reference_key' => 'dr', 'value' => 'Drive'],
            ['group' => 'contact_status', 'reference_key' => 'new', 'value' => 'New'],
            ['group' => 'contact_status', 'reference_key' => 'qualified', 'value' => 'Qualified'],
            ['group' => 'contact_status', 'reference_key' => 'viewing', 'value' => 'Viewing'],
            ['group' => 'contact_status', 'reference_key' => 'negotiating', 'value' => 'Negotiating'],
            ['group' => 'contact_status', 'reference_key' => 'closed', 'value' => 'Closed'],
            ['group' => 'contact_status', 'reference_key' => 'dormant', 'value' => 'Dormant'],
            ['group' => 'listing_status', 'reference_key' => 'available', 'value' => 'Available'],
            ['group' => 'listing_status', 'reference_key' => 'reserved', 'value' => 'Reserved'],
            ['group' => 'listing_status', 'reference_key' => 'under_contract', 'value' => 'Under Contract'],
            ['group' => 'listing_status', 'reference_key' => 'sold', 'value' => 'Sold'],
            ['group' => 'pipeline_stage', 'reference_key' => 'new_lead', 'value' => 'New lead'],
            ['group' => 'pipeline_stage', 'reference_key' => 'contacted', 'value' => 'Contacted'],
            ['group' => 'pipeline_stage', 'reference_key' => 'viewing', 'value' => 'Viewing'],
            ['group' => 'pipeline_stage', 'reference_key' => 'offer', 'value' => 'Offer'],
            ['group' => 'pipeline_stage', 'reference_key' => 'closing', 'value' => 'Closing'],
        ];
    }
}
