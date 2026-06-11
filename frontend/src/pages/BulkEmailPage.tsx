import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { LoadingState } from "@/components/Loading";
import { PageHeader } from "@/components/PageHeader";
import { PaginationControls } from "@/components/query/PaginationControls";
import { PermissionGate } from "@/components/rbac/PermissionGate";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getContactsPage, getEmailCampaigns, sendBulkEmailDraft } from "@/services/api";
import { PERMISSIONS } from "@/rbac/permissions";
import { useAuthorization } from "@/rbac/useAuthorization";
import type { Contact, EmailCampaign } from "@/types";

const RECIPIENT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function BulkEmailPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pageCount, setPageCount] = useState(1);
  const [totalRecipients, setTotalRecipients] = useState(0);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [selectsAllActive, setSelectsAllActive] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [subject, setSubject] = useState("New listings matched to your search");
  const [body, setBody] = useState("Hi, we found a few properties that match what you have been looking for.");
  const [queued, setQueued] = useState<EmailCampaign | null>(null);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(true);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const { can } = useAuthorization();
  const canCreateCampaigns = can(PERMISSIONS.emailCampaigns.create);

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
  const excludedSet = useMemo(() => new Set(excluded), [excluded]);
  const selectedCount = selectsAllActive ? Math.max(0, totalRecipients - excluded.length) : selected.length;
  const allPageSelected = contacts.length > 0 && contacts.every((contact) => (selectsAllActive ? !excludedSet.has(contact.id) : selectedSet.has(contact.id)));
  const recipientRangeStart = totalRecipients === 0 ? 0 : (page - 1) * pageSize + 1;
  const recipientRangeEnd = Math.min(totalRecipients, page * pageSize);

  const toggleContact = (contactId: string) => {
    if (selectsAllActive) {
      setExcluded((current) => (current.includes(contactId) ? current.filter((id) => id !== contactId) : [...current, contactId]));
      return;
    }

    setSelected((current) => (current.includes(contactId) ? current.filter((id) => id !== contactId) : [...current, contactId]));
  };

  const selectPage = () => {
    const pageIds = contacts.map((contact) => contact.id);

    if (selectsAllActive) {
      setExcluded((current) => current.filter((id) => !pageIds.includes(id)));
      return;
    }

    setSelected((current) => Array.from(new Set([...current, ...pageIds])));
  };

  const deselectPage = () => {
    const pageIds = contacts.map((contact) => contact.id);

    if (selectsAllActive) {
      setExcluded((current) => Array.from(new Set([...current, ...pageIds])));
      return;
    }

    setSelected((current) => current.filter((id) => !pageIds.includes(id)));
  };

  const selectAllActive = () => {
    setSelectsAllActive(true);
    setSelected([]);
    setExcluded([]);
  };

  const deselectAll = () => {
    setSelectsAllActive(false);
    setSelected([]);
    setExcluded([]);
  };

  const handleQueue = async () => {
    if (!canCreateCampaigns) return;

    setSending(true);
    setQueueError(null);

    try {
      const campaign = await sendBulkEmailDraft(
        selectsAllActive
          ? { allActiveContacts: true, excludedContactIds: excluded, subject, body }
          : { contactIds: selected, subject, body },
      );
      setQueued(campaign);
      setCampaigns((current) => [campaign, ...current]);
    } catch (caught) {
      setQueueError(caught instanceof Error ? caught.message : "Unable to queue email campaign.");
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
            <CardDescription>{selectedCount} active leads selected for this campaign.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={!canCreateCampaigns || isLoadingRecipients || totalRecipients === 0} onClick={selectAllActive}>
                Select all active
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={!canCreateCampaigns || selectedCount === 0} onClick={deselectAll}>
                Deselect all
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={!canCreateCampaigns || isLoadingRecipients || contacts.length === 0} onClick={selectPage}>
                Select page
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={!canCreateCampaigns || isLoadingRecipients || contacts.length === 0} onClick={deselectPage}>
                Deselect page
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
                            checked={selectsAllActive ? !excludedSet.has(contact.id) : selectedSet.has(contact.id)}
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
              <CardDescription>Dummy submission returns a queued campaign object.</CardDescription>
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
              <PermissionGate
                permission={PERMISSIONS.emailCampaigns.create}
                fallback={
                  <Button disabled>
                    <Send className="h-4 w-4" />
                    Queue email
                  </Button>
                }
              >
                <Button disabled={selectedCount === 0} isLoading={sending} loadingLabel="Queueing email" onClick={handleQueue}>
                  {!sending && <Send className="h-4 w-4" />}
                  {sending ? "Queueing" : "Queue email"}
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
    </div>
  );
}
