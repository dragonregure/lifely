import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Mail, Send } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getContacts, getEmailCampaigns, sendBulkEmailDraft } from "@/services/api";
import type { Contact, EmailCampaign } from "@/types";

export function BulkEmailPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [subject, setSubject] = useState("New listings matched to your search");
  const [body, setBody] = useState("Hi, we found a few properties that match what you have been looking for.");
  const [queued, setQueued] = useState<EmailCampaign | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    Promise.all([getContacts(), getEmailCampaigns()]).then(([leadData, campaignData]) => {
      setContacts(leadData.filter((contact) => contact.status !== "Dormant"));
      setCampaigns(campaignData);
      setSelected(leadData.filter((contact) => contact.status === "Qualified" || contact.status === "Viewing").map((contact) => contact.id));
    });
  }, []);

  const selectedContacts = useMemo(() => contacts.filter((contact) => selected.includes(contact.id)), [contacts, selected]);

  const toggleContact = (contactId: string) => {
    setSelected((current) => (current.includes(contactId) ? current.filter((id) => id !== contactId) : [...current, contactId]));
  };

  const handleQueue = async () => {
    setSending(true);
    const campaign = await sendBulkEmailDraft({ contactIds: selected, subject, body });
    setQueued(campaign);
    setCampaigns((current) => [campaign, ...current]);
    setSending(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Communication"
        title="Bulk email"
        description="Select leads, compose an update, and show the async queued-send flow with dummy data."
      />

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
            <CardDescription>{selectedContacts.length} active leads selected for this campaign.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Send</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <input
                        aria-label={`Select ${contact.firstName} ${contact.lastName}`}
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 accent-sky-500"
                        checked={selected.includes(contact.id)}
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
                <Input id="subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="body">Message</Label>
                <Textarea id="body" value={body} onChange={(event) => setBody(event.target.value)} />
              </div>
              <Button disabled={!selected.length || sending} onClick={handleQueue}>
                {sending ? <Mail className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
                {sending ? "Queueing" : "Queue email"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campaign history</CardTitle>
              <CardDescription>Recent mock email activity.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {campaigns.map((campaign) => (
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
