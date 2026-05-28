import { useEffect, useState } from "react";
import { Bath, BedDouble, Home, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PermissionGate } from "@/components/rbac/PermissionGate";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getListings } from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import { PERMISSIONS } from "@/rbac/permissions";
import type { Listing } from "@/types";

export function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    getListings().then(setListings);
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Inventory"
        title="Listings"
        description="A streamlined office database for properties available to match with leads."
        actions={
          <PermissionGate permission={PERMISSIONS.listings.create}>
            <Button>
              <Plus className="h-4 w-4" />
              Add listing
            </Button>
          </PermissionGate>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {listings.map((listing) => (
          <Card key={listing.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{listing.title}</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">{listing.address}</p>
                </div>
                <StatusBadge status={listing.status} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCurrency(listing.price)}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  {listing.type}
                </div>
                <div className="flex items-center gap-2">
                  <BedDouble className="h-4 w-4" />
                  {listing.bedrooms}
                </div>
                <div className="flex items-center gap-2">
                  <Bath className="h-4 w-4" />
                  {listing.bathrooms}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
