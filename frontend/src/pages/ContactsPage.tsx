import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { getContacts } from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import type { Contact, ContactStatus } from "@/types";

const statuses: Array<ContactStatus | "All"> = ["All", "New", "Qualified", "Viewing", "Negotiating", "Closed", "Dormant"];

export function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ContactStatus | "All">("All");
  const { members } = useAuth();

  useEffect(() => {
    getContacts().then(setContacts);
  }, []);

  const filtered = useMemo(() => {
    return contacts.filter((contact) => {
      const haystack = `${contact.firstName} ${contact.lastName} ${contact.email} ${contact.source}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesStatus = status === "All" || contact.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [contacts, query, status]);

  return (
    <div>
      <PageHeader
        eyebrow="CRM"
        title="Contacts"
        description="Track buyer and seller leads with ownership, source, budget, and current status."
        actions={
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Add lead
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add lead</DialogTitle>
                <DialogDescription>This mock form shows the intended lead capture shape.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="lead-name">Lead name</Label>
                  <Input id="lead-name" placeholder="Avery Stone" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lead-email">Email</Label>
                  <Input id="lead-email" type="email" placeholder="avery@example.com" />
                </div>
                <Button type="button">Save dummy lead</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search contacts, email, or source" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <Tabs value={status} onValueChange={(value) => setStatus(value as ContactStatus | "All")}>
          <TabsList className="flex h-auto flex-wrap justify-start">
            {statuses.map((item) => (
              <TabsTrigger key={item} value={item} className="text-xs">
                {item}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Last contacted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((contact) => {
              const owner = members.find((user) => user.id === contact.ownerId);
              return (
                <TableRow key={contact.id}>
                  <TableCell>
                    <p className="font-medium">
                      {contact.firstName} {contact.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{contact.email}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={contact.status} />
                  </TableCell>
                  <TableCell>{owner?.name}</TableCell>
                  <TableCell>{formatCurrency(contact.budget)}</TableCell>
                  <TableCell>{contact.source}</TableCell>
                  <TableCell>{new Date(contact.lastContactedAt).toLocaleDateString()}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
