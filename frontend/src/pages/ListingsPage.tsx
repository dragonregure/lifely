import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { LoadingState } from "@/components/Loading";
import { PageHeader } from "@/components/PageHeader";
import { PermissionGate } from "@/components/rbac/PermissionGate";
import { Button } from "@/components/ui/button";
import { createListing, getContactsPage, getListing, getListingsPage, getMembersPage, updateListing, type ListingInclude } from "@/services/api";
import { LISTING_STATUS_OPTIONS, LISTING_TYPE_OPTIONS } from "@/lib/listingOptions";
import { PERMISSIONS } from "@/rbac/permissions";
import { useAuthorization } from "@/rbac/useAuthorization";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { ServerMultiSelectLoadParams, ServerMultiSelectLoadResult } from "@/components/ui/server-multi-select";
import type { Listing } from "@/types";
import { ListingFilters, ListingPagination } from "./listings/ListingControls";
import { ListingDetailDialog, ListingFormDialog } from "./listings/ListingDialogs";
import { ListingGrid } from "./listings/ListingGrid";
import type { AgentOption, ContactOption, ListingDraft } from "./listings/listingTypes";
import { contactToOption, draftFromListing, emptyListingDraft, payloadFromDraft, userToOption } from "./listings/listingUtils";

const PAGE_SIZE_OPTIONS = [8, 12, 16, 24];
const LISTING_DETAIL_INCLUDES = ["documents", "contacts", "users"] satisfies ListingInclude[];

export function ListingsPage() {
  const { can } = useAuthorization();
  const canUpdateListings = can(PERMISSIONS.listings.update);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [formListing, setFormListing] = useState<Listing | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formTab, setFormTab] = useState("details");
  const [formDraft, setFormDraft] = useState<ListingDraft>(() => emptyListingDraft(LISTING_STATUS_OPTIONS, LISTING_TYPE_OPTIONS));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [pageCount, setPageCount] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const search = useDebouncedValue(searchInput, 350);
  const assignedContactIds = useMemo(() => new Set(formDraft.contacts.map((contact) => contact.id)), [formDraft.contacts]);
  const assignedAgentIds = useMemo(() => new Set(formDraft.agents.map((agent) => agent.id)), [formDraft.agents]);

  const loadContactOptions = useCallback(
    async ({ search, page, pageSize, signal }: ServerMultiSelectLoadParams): Promise<ServerMultiSelectLoadResult<ContactOption>> => {
      const result = await getContactsPage(
        {
          page,
          pageSize,
          search,
          sort: {
            columnId: "contact",
            direction: "asc",
          },
        },
        { signal },
      );

      return {
        options: result.data.map((contact) => ({
          ...contactToOption(contact),
          disabled: assignedContactIds.has(contact.id),
        })),
        hasMore: result.page < result.pageCount,
      };
    },
    [assignedContactIds],
  );

  const loadAgentOptions = useCallback(
    async ({ search, page, pageSize, signal }: ServerMultiSelectLoadParams): Promise<ServerMultiSelectLoadResult<AgentOption>> => {
      const result = await getMembersPage(
        {
          page,
          pageSize,
          search,
          sort: {
            columnId: "name",
            direction: "asc",
          },
        },
        { signal },
      );

      return {
        options: result.data.map((user) => ({
          ...userToOption(user),
          disabled: assignedAgentIds.has(user.id),
        })),
        hasMore: result.page < result.pageCount,
      };
    },
    [assignedAgentIds],
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

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
    setFormDraft(emptyListingDraft(LISTING_STATUS_OPTIONS, LISTING_TYPE_OPTIONS));
    setFormTab("details");
    setIsFormOpen(true);
  };

  const openListingDetails = useCallback(async (listing: Listing) => {
    setDetailLoadingId(listing.id);
    setError(null);

    try {
      setSelectedListing(await getListing(listing.id, { include: LISTING_DETAIL_INCLUDES }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load listing details.");
    } finally {
      setDetailLoadingId(null);
    }
  }, []);

  const openEditForm = (listing: Listing) => {
    setFormListing(listing);
    setSelectedListing(null);
    setFormError(null);
    setFormDraft(draftFromListing(listing));
    setFormTab("details");
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
      setIsFormOpen(false);
      setRefreshKey((value) => value + 1);

      try {
        setSelectedListing(await getListing(listing.id, { include: LISTING_DETAIL_INCLUDES }));
      } catch {
        setSelectedListing(listing);
        setError("Listing saved, but the related detail data could not be loaded.");
      }
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

      <ListingFilters
        searchInput={searchInput}
        statusFilter={statusFilter}
        statusOptions={LISTING_STATUS_OPTIONS}
        typeFilter={typeFilter}
        typeOptions={LISTING_TYPE_OPTIONS}
        onSearchInputChange={setSearchInput}
        onStatusFilterChange={(value) => {
          setStatusFilter(value);
          setPage(1);
        }}
        onTypeFilterChange={(value) => {
          setTypeFilter(value);
          setPage(1);
        }}
      />

      {error ? <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}

      {isLoading ? (
        <LoadingState className="border bg-white" label="Loading listings" />
      ) : listings.length === 0 ? (
        <div className="rounded-lg border bg-white p-10 text-center text-sm text-muted-foreground">No listings found.</div>
      ) : (
        <ListingGrid detailLoadingId={detailLoadingId} listings={listings} onOpenDetails={openListingDetails} />
      )}

      <ListingPagination
        page={page}
        pageCount={pageCount}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        rangeEnd={range.end}
        rangeStart={range.start}
        totalRows={totalRows}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(1);
        }}
      />

      <ListingDetailDialog canUpdateListings={canUpdateListings} listing={selectedListing} onClose={() => setSelectedListing(null)} onEdit={openEditForm} />

      <ListingFormDialog
        draft={formDraft}
        error={formError}
        formTab={formTab}
        isOpen={isFormOpen}
        isSubmitting={isSubmitting}
        listing={formListing}
        loadAgentOptions={loadAgentOptions}
        loadContactOptions={loadContactOptions}
        setDraft={setFormDraft}
        setFormTab={setFormTab}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
