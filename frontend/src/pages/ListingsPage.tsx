import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction, type SyntheticEvent } from "react";
import { Bath, BedDouble, ChevronLeft, ChevronRight, Home, MapPin, Pencil, Plus, Search, X } from "lucide-react";
import propertyPlaceholder from "@/assets/property-default.svg";
import { LoadingState } from "@/components/Loading";
import { PageHeader } from "@/components/PageHeader";
import { PermissionGate } from "@/components/rbac/PermissionGate";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createListing, getListingsPage, updateListing, type ListingPayload } from "@/services/api";
import { LISTING_STATUS_OPTIONS, LISTING_TYPE_OPTIONS, listingStatusLabel, listingTypeLabel } from "@/lib/listingOptions";
import { formatCurrency } from "@/lib/utils";
import { PERMISSIONS } from "@/rbac/permissions";
import { useAuthorization } from "@/rbac/useAuthorization";
import type { Listing } from "@/types";

const PAGE_SIZE_OPTIONS = [8, 12, 16, 24];

type ListingOption = {
  label: string;
  value: number;
};

type ListingDraft = {
  title: string;
  address: string;
  price: string;
  status: string;
  bedrooms: string;
  bathrooms: string;
  type: string;
};

function listingImageUrl(listing: Listing) {
  return listing.documents.find((document) => document.type === "mainImage")?.url ?? propertyPlaceholder;
}

function handleImageFallback(event: SyntheticEvent<HTMLImageElement>) {
  if (event.currentTarget.dataset.fallbackApplied !== "true") {
    event.currentTarget.dataset.fallbackApplied = "true";
    event.currentTarget.src = propertyPlaceholder;
  }
}

function emptyListingDraft(statusOptions: ListingOption[], typeOptions: ListingOption[]): ListingDraft {
  return {
    title: "",
    address: "",
    price: "",
    status: String(statusOptions[0]?.value ?? ""),
    bedrooms: "0",
    bathrooms: "0",
    type: String(typeOptions[0]?.value ?? ""),
  };
}

function draftFromListing(listing: Listing): ListingDraft {
  return {
    title: listing.title,
    address: listing.address,
    price: String(listing.price),
    status: String(listing.status),
    bedrooms: String(listing.bedrooms),
    bathrooms: String(listing.bathrooms),
    type: String(listing.type),
  };
}

function payloadFromDraft(draft: ListingDraft): ListingPayload {
  return {
    title: draft.title.trim(),
    address: draft.address.trim(),
    price: Number(draft.price),
    status: Number(draft.status) as ListingPayload["status"],
    bedrooms: Number(draft.bedrooms),
    bathrooms: Number(draft.bathrooms),
    type: Number(draft.type) as ListingPayload["type"],
  };
}

type ListingFormFieldsProps = {
  draft: ListingDraft;
  statusOptions: ListingOption[];
  typeOptions: ListingOption[];
  setDraft: Dispatch<SetStateAction<ListingDraft>>;
};

function ListingFormFields({ draft, statusOptions, typeOptions, setDraft }: ListingFormFieldsProps) {
  const updateDraft = (field: keyof ListingDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="listing-title">Title</Label>
        <Input id="listing-title" value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} required maxLength={180} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="listing-address">Address</Label>
        <Input id="listing-address" value={draft.address} onChange={(event) => updateDraft("address", event.target.value)} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="listing-price">Price</Label>
          <Input id="listing-price" type="number" min="0" step="0.01" value={draft.price} onChange={(event) => updateDraft("price", event.target.value)} required />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="listing-status">Status</Label>
          <select
            id="listing-status"
            className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={draft.status}
            onChange={(event) => updateDraft("status", event.target.value)}
            required
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="listing-type">Type</Label>
          <select
            id="listing-type"
            className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={draft.type}
            onChange={(event) => updateDraft("type", event.target.value)}
            required
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="listing-bedrooms">Bedrooms</Label>
          <Input id="listing-bedrooms" type="number" min="0" max="20" value={draft.bedrooms} onChange={(event) => updateDraft("bedrooms", event.target.value)} required />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="listing-bathrooms">Bathrooms</Label>
          <Input id="listing-bathrooms" type="number" min="0" max="20" value={draft.bathrooms} onChange={(event) => updateDraft("bathrooms", event.target.value)} required />
        </div>
      </div>
    </div>
  );
}

export function ListingsPage() {
  const { can } = useAuthorization();
  const canUpdateListings = can(PERMISSIONS.listings.update);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [formListing, setFormListing] = useState<Listing | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formDraft, setFormDraft] = useState<ListingDraft>(() => emptyListingDraft(LISTING_STATUS_OPTIONS, LISTING_TYPE_OPTIONS));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [pageCount, setPageCount] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const statusOptions = LISTING_STATUS_OPTIONS;
  const typeOptions = LISTING_TYPE_OPTIONS;
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);
    setError(null);

    getListingsPage(
      {
        page,
        pageSize,
        search,
        filters: {
          status: statusFilter,
          property_type: typeFilter,
        },
        sort: { columnId: "created_at", direction: "desc" },
      },
      { signal: controller.signal },
    )
      .then((result) => {
        setListings(result.data);
        setPageCount(Math.max(1, result.pageCount));
        setTotalRows(result.total);
      })
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : "Unable to load listings.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [page, pageSize, refreshKey, search, statusFilter, typeFilter]);

  const range = useMemo(() => {
    if (totalRows === 0) {
      return { start: 0, end: 0 };
    }

    return {
      start: (page - 1) * pageSize + 1,
      end: Math.min(page * pageSize, totalRows),
    };
  }, [page, pageSize, totalRows]);

  const openCreateForm = () => {
    setFormListing(null);
    setSelectedListing(null);
    setFormError(null);
    setFormDraft(emptyListingDraft(statusOptions, typeOptions));
    setIsFormOpen(true);
  };

  const openEditForm = (listing: Listing) => {
    setFormListing(listing);
    setSelectedListing(null);
    setFormError(null);
    setFormDraft(draftFromListing(listing));
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload = payloadFromDraft(formDraft);
      const listing = formListing ? await updateListing(formListing.id, payload) : await createListing(payload);

      setListings((current) => (formListing ? current.map((item) => (item.id === listing.id ? listing : item)) : [listing, ...current]));
      setSelectedListing(listing);
      setIsFormOpen(false);
      setRefreshKey((value) => value + 1);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Unable to save listing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Inventory"
        title="Listings"
        description="A streamlined office database for properties available to match with leads."
        actions={
          <PermissionGate permission={PERMISSIONS.listings.create}>
            <Button type="button" onClick={openCreateForm}>
              <Plus className="h-4 w-4" />
              Add listing
            </Button>
          </PermissionGate>
        }
      />

      <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 lg:flex-1">
          <Label htmlFor="listing-search" className="sr-only">
            Search listings
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="listing-search"
              className="pl-9"
              placeholder="Search title, address, status, or type"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="listing-status-filter" className="sr-only">
            Status
          </Label>
          <select
            id="listing-status-filter"
            className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          <Label htmlFor="listing-type-filter" className="sr-only">
            Type
          </Label>
          <select
            id="listing-type-filter"
            className="h-10 rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="all">All types</option>
            {typeOptions.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}

      {isLoading ? (
        <LoadingState className="border bg-white" label="Loading listings" />
      ) : listings.length === 0 ? (
        <div className="rounded-lg border bg-white p-10 text-center text-sm text-muted-foreground">No listings found.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {listings.map((listing) => (
            <button
              key={listing.id}
              type="button"
              className="group overflow-hidden rounded-lg border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
              onClick={() => setSelectedListing(listing)}
            >
              <img
                src={listingImageUrl(listing)}
                alt=""
                className="aspect-[4/3] w-full bg-muted object-cover"
                loading="lazy"
                onError={handleImageFallback}
              />
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
      )}

      <div className="mt-4 flex flex-col gap-3 rounded-lg border bg-white p-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div>
          Showing {range.start}-{range.end} of {totalRows}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="listing-page-size" className="text-sm text-muted-foreground">
              Cards
            </Label>
            <select
              id="listing-page-size"
              className="h-9 rounded-md border border-input bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="min-w-24 text-center">
              Page {page} of {pageCount}
            </span>
            <Button type="button" variant="outline" size="icon" aria-label="Previous page" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" aria-label="Next page" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={Boolean(selectedListing)} onOpenChange={(open) => !open && setSelectedListing(null)}>
        {selectedListing ? (
          <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
            <img src={listingImageUrl(selectedListing)} alt="" className="aspect-[16/9] w-full bg-muted object-cover" onError={handleImageFallback} />
            <div className="grid gap-5 p-6">
              <DialogHeader className="pr-20">
                <DialogTitle className="text-2xl">{selectedListing.title}</DialogTitle>
                <DialogDescription className="sr-only">
                  Listing details for {selectedListing.title}, including address, price, status, type, bedrooms, and bathrooms.
                </DialogDescription>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {selectedListing.address}
                </div>
              </DialogHeader>
              <div className="absolute right-4 top-4 flex gap-2">
                {canUpdateListings ? (
                  <Button type="button" variant="outline" size="icon" className="bg-white/90" aria-label="Edit listing" onClick={() => openEditForm(selectedListing)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                ) : null}
                <DialogClose asChild>
                  <Button type="button" variant="outline" size="icon" className="bg-white/90" aria-label="Close listing details">
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={listingStatusLabel(selectedListing.status)} />
                <span className="text-2xl font-semibold">{formatCurrency(selectedListing.price)}</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs uppercase text-muted-foreground">Type</p>
                  <p className="mt-1 font-medium">{listingTypeLabel(selectedListing.type)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs uppercase text-muted-foreground">Bedrooms</p>
                  <p className="mt-1 font-medium">{selectedListing.bedrooms}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs uppercase text-muted-foreground">Bathrooms</p>
                  <p className="mt-1 font-medium">{selectedListing.bathrooms}</p>
                </div>
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{formListing ? "Update listing" : "Create listing"}</DialogTitle>
            <DialogDescription>Manage the listing table fields used by the CRM inventory.</DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={handleFormSubmit}>
            {formError ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{formError}</div> : null}
            <ListingFormFields
              draft={formDraft}
              setDraft={setFormDraft}
              statusOptions={statusOptions}
              typeOptions={typeOptions}
            />
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" isLoading={isSubmitting} loadingLabel={formListing ? "Updating" : "Creating"}>
                {formListing ? "Update listing" : "Create listing"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
