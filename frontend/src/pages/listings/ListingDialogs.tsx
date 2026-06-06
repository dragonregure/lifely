import type { FormEvent } from "react";
import { MapPin, Pencil, X } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { listingStatusLabel, listingTypeLabel, LISTING_STATUS_OPTIONS, LISTING_TYPE_OPTIONS } from "@/lib/listingOptions";
import type { Listing } from "@/types";
import type { AgentOption, ContactOption, ListingDraft } from "./listingTypes";
import { contactName, handleImageFallback, listingImageUrl, userName } from "./listingUtils";
import { ListingAssignmentFields, ListingFormFields } from "./ListingFormFields";
import type { ServerMultiSelectLoadParams, ServerMultiSelectLoadResult } from "@/components/ui/server-multi-select";

type ListingDetailDialogProps = {
  canUpdateListings: boolean;
  listing: Listing | null;
  onClose: () => void;
  onEdit: (listing: Listing) => void;
};

export function ListingDetailDialog({ canUpdateListings, listing, onClose, onEdit }: ListingDetailDialogProps) {
  return (
    <Dialog open={Boolean(listing)} onOpenChange={(open) => !open && onClose()}>
      {listing ? (
        <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
          <img src={listingImageUrl(listing)} alt="" className="aspect-[16/9] w-full bg-muted object-cover" onError={handleImageFallback} />
          <div className="grid gap-5 p-6">
            <DialogHeader className="pr-20">
              <DialogTitle className="text-2xl">{listing.title}</DialogTitle>
              <DialogDescription className="sr-only">
                Listing details for {listing.title}, including address, price, status, type, bedrooms, and bathrooms.
              </DialogDescription>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {listing.address}
              </div>
            </DialogHeader>
            <div className="absolute right-4 top-4 flex gap-2">
              {canUpdateListings ? (
                <Button type="button" variant="outline" size="icon" className="bg-white/90" aria-label="Edit listing" onClick={() => onEdit(listing)}>
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
              <StatusBadge status={listingStatusLabel(listing.status)} />
              <span className="text-2xl font-semibold">{formatCurrency(listing.price)}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Type</p>
                <p className="mt-1 font-medium">{listingTypeLabel(listing.type)}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Bedrooms</p>
                <p className="mt-1 font-medium">{listing.bedrooms}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Bathrooms</p>
                <p className="mt-1 font-medium">{listing.bathrooms}</p>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs uppercase text-muted-foreground">Assigned contacts</p>
              {listing.contacts.length === 0 ? (
                <p className="mt-1 text-sm font-medium text-slate-900">No contacts assigned</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {listing.contacts.map((contact) => (
                    <span key={contact.id} className="rounded-md bg-white px-2 py-1 text-sm font-medium text-slate-900">
                      {contactName(contact)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs uppercase text-muted-foreground">Assigned agents</p>
              {listing.agents.length === 0 ? (
                <p className="mt-1 text-sm font-medium text-slate-900">No agents assigned</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {listing.agents.map((agent) => (
                    <span key={agent.id} className="rounded-md bg-white px-2 py-1 text-sm font-medium text-slate-900">
                      {userName(agent)}
                      {agent.isPrimaryOwner ? <span className="ml-1 text-xs text-muted-foreground">(primary)</span> : null}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

type ListingFormDialogProps = {
  draft: ListingDraft;
  error: string | null;
  formTab: string;
  isOpen: boolean;
  isSubmitting: boolean;
  listing: Listing | null;
  loadAgentOptions: (params: ServerMultiSelectLoadParams) => Promise<ServerMultiSelectLoadResult<AgentOption>>;
  loadContactOptions: (params: ServerMultiSelectLoadParams) => Promise<ServerMultiSelectLoadResult<ContactOption>>;
  setDraft: React.Dispatch<React.SetStateAction<ListingDraft>>;
  setFormTab: (tab: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ListingFormDialog({
  draft,
  error,
  formTab,
  isOpen,
  isSubmitting,
  listing,
  loadAgentOptions,
  loadContactOptions,
  setDraft,
  setFormTab,
  onOpenChange,
  onSubmit,
}: ListingFormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{listing ? "Update listing" : "Create listing"}</DialogTitle>
          <DialogDescription>Manage the listing table fields used by the CRM inventory.</DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={onSubmit}>
          {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
          <Tabs value={formTab} onValueChange={setFormTab}>
            <TabsList className="flex h-auto flex-wrap justify-start">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="assignment">Assignment</TabsTrigger>
            </TabsList>
            <TabsContent value="details">
              <ListingFormFields draft={draft} setDraft={setDraft} statusOptions={LISTING_STATUS_OPTIONS} typeOptions={LISTING_TYPE_OPTIONS} />
            </TabsContent>
            <TabsContent value="assignment">
              <ListingAssignmentFields draft={draft} loadAgentOptions={loadAgentOptions} loadContactOptions={loadContactOptions} setDraft={setDraft} />
            </TabsContent>
          </Tabs>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" isLoading={isSubmitting} loadingLabel={listing ? "Updating" : "Creating"}>
              {listing ? "Update listing" : "Create listing"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
