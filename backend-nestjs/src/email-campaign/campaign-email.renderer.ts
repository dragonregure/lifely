import { Injectable } from '@nestjs/common';
import {
  LISTING_STATUS_LABELS,
  LISTING_TYPE_LABELS,
} from './email-campaign.constants.js';
import { CampaignListing, EmailCampaign } from './email-campaign.type.js';

@Injectable()
export class CampaignEmailRenderer {
  html(campaign: EmailCampaign, listing: CampaignListing | null): string {
    const body = this.escape(campaign.body).replace(/\n/g, '<br>');

    if (!listing) {
      return `<p>${body}</p>`;
    }

    const details = this.listingDetails(listing);

    return [
      `<p>${body}</p>`,
      '<h2>Featured listing</h2>',
      `<p><strong>${this.escape(listing.title)}</strong><br>`,
      `${this.escape(listing.address)}<br>`,
      `Price: ${details.price}<br>`,
      `Bedrooms: ${details.bedrooms}<br>`,
      `Bathrooms: ${details.bathrooms}<br>`,
      `Type: ${details.type}<br>`,
      `Status: ${details.status}</p>`,
    ].join('');
  }

  text(campaign: EmailCampaign, listing: CampaignListing | null): string {
    if (!listing) {
      return campaign.body;
    }

    const details = this.listingDetails(listing);

    return `${campaign.body}\n\nFeatured listing\n${listing.title}\n${listing.address}\nPrice: ${details.price}\nBedrooms: ${details.bedrooms}\nBathrooms: ${details.bathrooms}\nType: ${details.type}\nStatus: ${details.status}`;
  }

  private listingDetails(listing: CampaignListing): {
    price: string;
    status: string;
    type: string;
    bedrooms: string;
    bathrooms: string;
  } {
    return {
      price: `$${Number(listing.price).toLocaleString('en-US', {
        maximumFractionDigits: 0,
      })}`,
      status:
        LISTING_STATUS_LABELS[
          Number(listing.status) as keyof typeof LISTING_STATUS_LABELS
        ] ?? 'Unknown',
      type:
        LISTING_TYPE_LABELS[
          Number(listing.propertyType) as keyof typeof LISTING_TYPE_LABELS
        ] ?? 'Unknown',
      bedrooms: String(listing.bedrooms),
      bathrooms: String(listing.bathrooms),
    };
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
