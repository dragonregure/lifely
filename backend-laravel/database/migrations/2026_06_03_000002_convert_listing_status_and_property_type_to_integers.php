<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('references')
            ->whereIn('group', ['listing_status', 'listing_type'])
            ->delete();

        DB::statement("
            UPDATE listings
            SET status = CASE status
                WHEN 'Available' THEN '1'
                WHEN 'Reserved' THEN '2'
                WHEN 'Under Contract' THEN '3'
                WHEN 'Sold' THEN '4'
                WHEN '1' THEN '1'
                WHEN '2' THEN '2'
                WHEN '3' THEN '3'
                WHEN '4' THEN '4'
                ELSE '1'
            END
        ");

        DB::statement("
            UPDATE listings
            SET property_type = CASE property_type
                WHEN 'House' THEN '1'
                WHEN 'Condo' THEN '2'
                WHEN 'Townhome' THEN '3'
                WHEN 'Apartment' THEN '4'
                WHEN 'Studio' THEN '5'
                WHEN 'Villa' THEN '6'
                WHEN 'Duplex' THEN '7'
                WHEN 'Multi-Family' THEN '8'
                WHEN 'Land' THEN '9'
                WHEN 'Farm' THEN '10'
                WHEN 'Office' THEN '11'
                WHEN 'Retail' THEN '12'
                WHEN 'Warehouse' THEN '13'
                WHEN 'Commercial' THEN '14'
                WHEN 'Industrial' THEN '15'
                WHEN 'Mixed Use' THEN '16'
                WHEN '1' THEN '1'
                WHEN '2' THEN '2'
                WHEN '3' THEN '3'
                WHEN '4' THEN '4'
                WHEN '5' THEN '5'
                WHEN '6' THEN '6'
                WHEN '7' THEN '7'
                WHEN '8' THEN '8'
                WHEN '9' THEN '9'
                WHEN '10' THEN '10'
                WHEN '11' THEN '11'
                WHEN '12' THEN '12'
                WHEN '13' THEN '13'
                WHEN '14' THEN '14'
                WHEN '15' THEN '15'
                WHEN '16' THEN '16'
                ELSE '1'
            END
        ");

        DB::statement('ALTER TABLE listings MODIFY status TINYINT UNSIGNED NOT NULL DEFAULT 1');
        DB::statement('ALTER TABLE listings MODIFY property_type TINYINT UNSIGNED NOT NULL DEFAULT 1');
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE listings MODIFY status VARCHAR(255) NOT NULL DEFAULT 'Available'");
        DB::statement("ALTER TABLE listings MODIFY property_type VARCHAR(255) NOT NULL DEFAULT 'House'");

        DB::statement("
            UPDATE listings
            SET status = CASE status
                WHEN '1' THEN 'Available'
                WHEN '2' THEN 'Reserved'
                WHEN '3' THEN 'Under Contract'
                WHEN '4' THEN 'Sold'
                ELSE 'Available'
            END
        ");

        DB::statement("
            UPDATE listings
            SET property_type = CASE property_type
                WHEN '1' THEN 'House'
                WHEN '2' THEN 'Condo'
                WHEN '3' THEN 'Townhome'
                WHEN '4' THEN 'Apartment'
                WHEN '5' THEN 'Studio'
                WHEN '6' THEN 'Villa'
                WHEN '7' THEN 'Duplex'
                WHEN '8' THEN 'Multi-Family'
                WHEN '9' THEN 'Land'
                WHEN '10' THEN 'Farm'
                WHEN '11' THEN 'Office'
                WHEN '12' THEN 'Retail'
                WHEN '13' THEN 'Warehouse'
                WHEN '14' THEN 'Commercial'
                WHEN '15' THEN 'Industrial'
                WHEN '16' THEN 'Mixed Use'
                ELSE 'House'
            END
        ");
    }
};
