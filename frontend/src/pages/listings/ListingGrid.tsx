import { Bath, BedDouble, Home } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { listingStatusLabel, listingTypeLabel } from "@/lib/listingOptions";
import type { Listing } from "@/types";
import { handleImageFallback, listingImageUrl } from "./listingUtils";

type ListingGridProps = {
  detailLoadingId: string | null;
  listings: Listing[];
  onOpenDetails: (listing: Listing) => void;
};

export function ListingGrid({ detailLoadingId, listings, onOpenDetails }: ListingGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {listings.map((listing) => (
        <button
          key={listing.id}
          type="button"
          className="group overflow-hidden rounded-lg border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
          aria-busy={detailLoadingId === listing.id}
          disabled={detailLoadingId === listing.id}
          onClick={() => void onOpenDetails(listing)}
        >
          <img src={listingImageUrl(listing)} alt="" className="aspect-[4/3] w-full bg-muted object-cover" loading="lazy" onError={handleImageFallback} />
          <div className="grid gap-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-foreground">{listing.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{listing.address}</p>
              </div>
              <StatusBadge status={listingStatusLabel(listing.status)} />
            </div>

            <p className="text-2xl font-semibold">{formatCurrency(listing.price)}</p>

            <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
              <div className="flex min-w-0 items-center gap-2">
                <Home className="h-4 w-4 shrink-0" />
                <span className="truncate">{listingTypeLabel(listing.type)}</span>
              </div>
              <div className="flex items-center gap-2">
                <BedDouble className="h-4 w-4 shrink-0" />
                {listing.bedrooms}
              </div>
              <div className="flex items-center gap-2">
                <Bath className="h-4 w-4 shrink-0" />
                {listing.bathrooms}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
