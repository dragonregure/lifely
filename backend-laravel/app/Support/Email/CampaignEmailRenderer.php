<?php

namespace App\Support\Email;

use App\Models\EmailCampaign;
use App\Models\Listing;
use Illuminate\Contracts\View\Factory as ViewFactory;

class CampaignEmailRenderer
{
    public function __construct(private readonly ViewFactory $views)
    {
    }

    public function html(EmailCampaign $campaign, ?Listing $listing): string
    {
        return $this->views->make('emails.campaign', [
            'campaign' => $campaign,
            'listing' => $listing,
            'listingDetails' => $listing === null ? null : $this->listingDetails($listing),
            'logoUrl' => asset('lifely-logo.png'),
        ])->render();
    }

    public function text(EmailCampaign $campaign, ?Listing $listing): string
    {
        $text = $campaign->body;

        if ($listing === null) {
            return $text;
        }

        $details = $this->listingDetails($listing);

        return $text."\n\nFeatured listing\n"
            .$listing->title."\n"
            .$listing->address."\n"
            .'Price: '.$details['price']."\n"
            .'Bedrooms: '.$details['bedrooms']."\n"
            .'Bathrooms: '.$details['bathrooms']."\n"
            .'Type: '.$details['type']."\n"
            .'Status: '.$details['status'];
    }

    /**
     * @return array{price: string, status: string, type: string, bedrooms: string, bathrooms: string}
     */
    private function listingDetails(Listing $listing): array
    {
        return [
            'price' => '$'.number_format((float) $listing->price, 0),
            'status' => $this->listingStatusLabel((int) $listing->status),
            'type' => $this->listingTypeLabel((int) $listing->property_type),
            'bedrooms' => (string) $listing->bedrooms,
            'bathrooms' => (string) $listing->bathrooms,
        ];
    }

    private function listingStatusLabel(int $status): string
    {
        return match ($status) {
            Listing::STATUS_AVAILABLE => 'Available',
            Listing::STATUS_RESERVED => 'Reserved',
            Listing::STATUS_UNDER_CONTRACT => 'Under Contract',
            Listing::STATUS_SOLD => 'Sold',
            default => 'Unknown',
        };
    }

    private function listingTypeLabel(int $type): string
    {
        return match ($type) {
            Listing::TYPE_HOUSE => 'House',
            Listing::TYPE_CONDO => 'Condo',
            Listing::TYPE_TOWNHOME => 'Townhome',
            Listing::TYPE_APARTMENT => 'Apartment',
            Listing::TYPE_STUDIO => 'Studio',
            Listing::TYPE_VILLA => 'Villa',
            Listing::TYPE_DUPLEX => 'Duplex',
            Listing::TYPE_MULTI_FAMILY => 'Multi-Family',
            Listing::TYPE_LAND => 'Land',
            Listing::TYPE_FARM => 'Farm',
            Listing::TYPE_OFFICE => 'Office',
            Listing::TYPE_RETAIL => 'Retail',
            Listing::TYPE_WAREHOUSE => 'Warehouse',
            Listing::TYPE_COMMERCIAL => 'Commercial',
            Listing::TYPE_INDUSTRIAL => 'Industrial',
            Listing::TYPE_MIXED_USE => 'Mixed Use',
            default => 'Unknown',
        };
    }
}
