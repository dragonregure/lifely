import { ShieldCheck, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";

const permissions = [
  { role: "Office Admin", scope: "Manage members, settings, all contacts, reports, and bulk email." },
  { role: "Senior Agent", scope: "Manage assigned contacts, listings, deals, and campaigns." },
  { role: "Simple Agent", scope: "Manage own contacts, pipeline tasks, and listing matches." },
];

export function SettingsPage() {
  const { members, tenant } = useAuth();

  return (
    <div>
      <PageHeader
        eyebrow="Office"
        title="Settings"
        description="Tenant profile, member management, and RBAC-flavored controls for the demo office."
        actions={
          <Button>
            <UserPlus className="h-4 w-4" />
            Invite member
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>{tenant?.name ?? "Loading office"}</CardTitle>
            <CardDescription>Tenant ID: {tenant?.id ?? "Loading"}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="mt-1 font-semibold">{tenant?.plan ?? "Growth"}</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="mt-1 font-semibold">{tenant?.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : "Unknown"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>Office staff with role-specific access expectations.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "Office Admin" ? "info" : "secondary"}>{user.role}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-sky-700" />
            Access policy preview
          </CardTitle>
          <CardDescription>Static role descriptions for the frontend prototype.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {permissions.map((permission) => (
            <div key={permission.role} className="rounded-lg border bg-slate-50 p-4">
              <p className="font-semibold">{permission.role}</p>
              <p className="mt-2 text-sm text-muted-foreground">{permission.scope}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
