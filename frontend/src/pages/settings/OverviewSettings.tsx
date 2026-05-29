import { RotateCcw } from "lucide-react";
import { LoadingState } from "@/components/Loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Tenant, User, UserAccess } from "@/types";

type OverviewSettingsProps = {
  access: UserAccess | null;
  groupedEffectivePermissions: Record<string, string[]>;
  isLoading: boolean;
  isSaving: boolean;
  members: User[];
  reloadRbac: () => Promise<void>;
  tenant: Tenant | null;
  user: User | null;
};

export function OverviewSettings({
  access,
  groupedEffectivePermissions,
  isLoading,
  isSaving,
  members,
  reloadRbac,
  tenant,
  user,
}: OverviewSettingsProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>{tenant?.name ?? "Office"}</CardTitle>
            <CardDescription>Tenant ID: {tenant?.id ?? "Pending"}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="mt-1 font-semibold">{isLoading ? "Loading" : tenant?.plan ?? "Growth"}</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="mt-1 font-semibold">{isLoading ? "Loading" : tenant?.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : "Unknown"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Signed in access</CardTitle>
            <CardDescription>Roles and permissions returned by the backend for the current user.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <p className="text-sm text-muted-foreground">User</p>
              <p className="mt-1 font-semibold">{isLoading ? "Loading" : user?.name ?? "Unknown"}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Roles</p>
              <div className="flex flex-wrap gap-2">
                {(access?.roles ?? user?.roles ?? []).map((role) => (
                  <Badge key={role} variant={role === "Office Admin" ? "info" : "secondary"}>
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
            <Button variant="outline" className="w-fit" onClick={() => void reloadRbac()} isLoading={isSaving} loadingLabel="Refreshing access">
              {!isSaving && <RotateCcw className="h-4 w-4" />}
              Refresh access
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>Current office members and their primary display roles.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
              {isLoading ? <LoadingState label="Loading members" /> : <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(member.roles.length > 0 ? member.roles : [member.role]).map((role) => (
                          <Badge key={role} variant={role === "Office Admin" ? "info" : "secondary"}>
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Effective permissions</CardTitle>
          <CardDescription>Grouped permissions for the signed-in user. Backend policies remain authoritative.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {isLoading ? <LoadingState label="Loading permissions" /> : Object.entries(groupedEffectivePermissions).map(([group, names]) => (
              <div key={group} className="rounded-md border bg-slate-50 p-3">
                <p className="mb-2 text-sm font-semibold capitalize">{group}</p>
                <div className="flex flex-wrap gap-1">
                  {names.map((permission) => (
                    <Badge key={permission} variant="muted">
                      {permission}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
