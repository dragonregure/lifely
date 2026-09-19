import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Send } from "lucide-react";
import { LoadingState } from "@/components/Loading";
import { PageHeader } from "@/components/PageHeader";
import { PaginationControls } from "@/components/query/PaginationControls";
import { PermissionGate } from "@/components/rbac/PermissionGate";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ServerMultiSelect,
  type ServerMultiSelectLoadParams,
  type ServerMultiSelectLoadResult,
  type ServerMultiSelectOption,
} from "@/components/ui/server-multi-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { IS_DEMO_MODE } from "@/config/env";
import { formatCurrency } from "@/lib/utils";
import { getContactsPage, getEmailCampaigns, getListingsPage, sendBulkEmailDraft } from "@/services/api";
import { PERMISSIONS } from "@/rbac/permissions";
import { useAuthorization } from "@/rbac/useAuthorization";
import type { Contact, EmailCampaign, Listing } from "@/types";

const RECIPIENT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type ListingOption = ServerMultiSelectOption & {
  listing: Listing;
};

function listingToOption(listing: Listing): ListingOption {
  return {
    value: listing.id,
    label: listing.title,
    description: formatCurrency(listing.price),
    listing,
  };
}

export function BulkEmailPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pageCount, setPageCount] = useState(1);
  const [totalRecipients, setTotalRecipients] = useState(0);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedListing, setSelectedListing] = useState<ListingOption[]>([]);
  const [subject, setSubject] = useState("New listings matched to your search");
  const [body, setBody] = useState("Hi, we found a few properties that match what you have been looking for.");
  const [queued, setQueued] = useState<EmailCampaign | null>(null);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(true);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { can } = useAuthorization();
  const canCreateCampaigns = can(PERMISSIONS.emailCampaigns.create);
  const canSendCampaigns = canCreateCampaigns && !IS_DEMO_MODE;

  const loadListingOptions = useCallback(
    async ({ search, page: listingPage, pageSize: listingPageSize, signal }: ServerMultiSelectLoadParams): Promise<ServerMultiSelectLoadResult<ListingOption>> => {
      const result = await getListingsPage(
        {
          page: listingPage,
          pageSize: listingPageSize,
          search,
          sort: { columnId: "title", direction: "asc" },
        },
        { signal },
      );

      return {
        options: result.data.map(listingToOption),
        hasMore: result.page < result.pageCount,
      };
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();

    setIsLoadingRecipients(true);
    setLoadError(null);
    getContactsPage({ page, pageSize, filters: { status: "active" } }, { signal: controller.signal })
      .then((recipientPage) => {
        setContacts(recipientPage.data);
        setPageCount(Math.max(1, recipientPage.pageCount));
        setTotalRecipients(recipientPage.total);

        if (page > recipientPage.pageCount && recipientPage.pageCount > 0) {
          setPage(recipientPage.pageCount);
        }
      })
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setLoadError(caught instanceof Error ? caught.message : "Unable to load recipients.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingRecipients(false);
        }
      });

    return () => controller.abort();
  }, [page, pageSize]);

  useEffect(() => {
    setIsLoadingCampaigns(true);
    getEmailCampaigns()
      .then(setCampaigns)
      .catch((caught) => setLoadError(caught instanceof Error ? caught.message : "Unable to load campaigns."))
      .finally(() => setIsLoadingCampaigns(false));
  }, []);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedCount = selected.length;
  const allPageSelected = contacts.length > 0 && contacts.every((contact) => selectedSet.has(contact.id));
  const recipientRangeStart = totalRecipients === 0 ? 0 : (page - 1) * pageSize + 1;
  const recipientRangeEnd = Math.min(totalRecipients, page * pageSize);
  const selectedContactsLabel = `${selectedCount} ${selectedCount === 1 ? "contact" : "contacts"}`;
  const selectedListingLabel = selectedListing[0]?.label ?? "No listing selected";

  const toggleContact = (contactId: string) => {
    setSelected((current) => (current.includes(contactId) ? current.filter((id) => id !== contactId) : [...current, contactId]));
  };

  const selectPage = () => {
    const pageIds = contacts.map((contact) => contact.id);

    setSelected((current) => Array.from(new Set([...current, ...pageIds])));
  };

  const deselectPage = () => {
    const pageIds = contacts.map((contact) => contact.id);

    setSelected((current) => current.filter((id) => !pageIds.includes(id)));
  };

  const deselectAll = () => {
    setSelected([]);
  };

  const handleQueue = async () => {
    if (!canCreateCampaigns || IS_DEMO_MODE) return;

    setSending(true);
    setQueueError(null);

    try {
      const campaign = await sendBulkEmailDraft({
        allActiveContacts: true,
        includedContactIds: selected,
        listingId: selectedListing[0]?.value,
        subject,
        body,
      });
      setQueued(campaign);
      setCampaigns((current) => [campaign, ...current]);
      setConfirmOpen(false);
    } catch (caught) {
      setQueueError(caught instanceof Error ? caught.message : "Unable to queue email campaign.");
      setConfirmOpen(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Communication"
        title="Bulk email"
        description="Select recipients, compose an update, and queue delivery without loading every contact into the page."
      />

      {loadError ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError}</div> : null}
      {queueError ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{queueError}</div> : null}
      {IS_DEMO_MODE ? (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Demo version</p>
            <p className="text-sm">This demo version cannot send email. Bulk email delivery is disabled.</p>
          </div>
        </div>
      ) : null}

      {queued ? (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Email campaign queued</p>
            <p className="text-sm">"{queued.subject}" is queued for {queued.recipientCount} recipients.</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Select recipients</CardTitle>
            <CardDescription>{selectedCount} active contacts selected for this campaign.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={!canCreateCampaigns || isLoadingRecipients || contacts.length === 0} onClick={selectPage}>
                Select page
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={!canCreateCampaigns || isLoadingRecipients || contacts.length === 0} onClick={deselectPage}>
                Deselect page
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={!canCreateCampaigns || selectedCount === 0} onClick={deselectAll}>
                Clear selected
              </Button>
            </div>

            {isLoadingRecipients ? (
              <LoadingState label="Loading recipients" />
            ) : contacts.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No active recipients found.</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          aria-label={allPageSelected ? "Deselect visible recipients" : "Select visible recipients"}
                          checked={allPageSelected}
                          disabled={!canCreateCampaigns}
                          onChange={() => (allPageSelected ? deselectPage() : selectPage())}
                        />
                      </TableHead>
                      <TableHead>Lead</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <Checkbox
                            aria-label={`Select ${contact.firstName} ${contact.lastName}`}
                            checked={selectedSet.has(contact.id)}
                            disabled={!canCreateCampaigns}
                            onChange={() => toggleContact(contact.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {contact.firstName} {contact.lastName}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={contact.status} />
                        </TableCell>
                        <TableCell>{contact.email}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <PaginationControls
                  itemLabel="Recipients"
                  page={page}
                  pageCount={pageCount}
                  pageSize={pageSize}
                  pageSizeOptions={RECIPIENT_PAGE_SIZE_OPTIONS}
                  rangeEnd={recipientRangeEnd}
                  rangeStart={recipientRangeStart}
                  totalRows={totalRecipients}
                  onPageChange={setPage}
                  onPageSizeChange={(nextPageSize) => {
                    setPageSize(nextPageSize);
                    setPage(1);
                  }}
                />
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Compose</CardTitle>
              <CardDescription>Queue a branded listing email to selected active contacts.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" value={subject} disabled={!canCreateCampaigns} onChange={(event) => setSubject(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="body">Message</Label>
                <Textarea id="body" value={body} disabled={!canCreateCampaigns} onChange={(event) => setBody(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="listing">Listing</Label>
                <ServerMultiSelect<ListingOption>
                  id="listing"
                  value={selectedListing}
                  onChange={setSelectedListing}
                  loadOptions={loadListingOptions}
                  maxSelected={1}
                  disabled={!canCreateCampaigns}
                  placeholder="Select listing"
                  searchPlaceholder="Search listings..."
                  emptyLabel="No listings found."
                  loadingLabel="Loading listings"
                />
              </div>
              <PermissionGate
                permission={PERMISSIONS.emailCampaigns.create}
                fallback={
                  <Button disabled>
                    <Send className="h-4 w-4" />
                    Queue email
                  </Button>
                }
              >
                <Button disabled={!canSendCampaigns || selectedCount === 0 || sending} onClick={() => setConfirmOpen(true)}>
                  <Send className="h-4 w-4" />
                  Queue email
                </Button>
              </PermissionGate>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campaign history</CardTitle>
              <CardDescription>Recent mock email activity.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {isLoadingCampaigns ? <LoadingState label="Loading campaigns" /> : campaigns.map((campaign) => (
                <div key={campaign.id} className="rounded-lg border bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{campaign.subject}</p>
                    <StatusBadge status={campaign.status} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{campaign.recipientCount} recipients</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={(open) => {
        if (!sending) {
          setConfirmOpen(open);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm bulk email</DialogTitle>
            <DialogDescription>
              This will send email to {selectedContactsLabel}. Confirm the audience before queueing the campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 rounded-lg border bg-slate-50 p-4 text-sm">
            <div className="flex items-start justify-between gap-4">
              <span className="text-muted-foreground">Recipients</span>
              <span className="font-medium text-foreground">{selectedContactsLabel}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-muted-foreground">Listing</span>
              <span className="max-w-64 text-right font-medium text-foreground">{selectedListingLabel}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-muted-foreground">Subject</span>
              <span className="max-w-64 text-right font-medium text-foreground">{subject || "Untitled email"}</span>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={sending} onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={IS_DEMO_MODE} isLoading={sending} loadingLabel="Queueing email" onClick={handleQueue}>
              {!sending && <Send className="h-4 w-4" />}
              {sending ? "Queueing" : "Send bulk email"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
