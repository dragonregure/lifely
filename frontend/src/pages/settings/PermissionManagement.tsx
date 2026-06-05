import type { Dispatch, FormEvent, SetStateAction } from "react";
import { KeyRound, Save, Trash2 } from "lucide-react";
import { LoadingState } from "@/components/Loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Permission } from "@/types";
import type { PermissionDraft } from "./settingsTypes";
import { permissionGroup } from "./settingsUtils";

type PermissionManagementProps = {
  canCreatePermissions: boolean;
  canDeletePermissions: boolean;
  canUpdatePermissions: boolean;
  canViewPermissions: boolean;
  handleCreatePermission: (event: FormEvent<HTMLFormElement>) => void;
  handleDeletePermission: (permission: Permission) => void;
  handleUpdatePermission: (permission: Permission) => void;
  isLoading: boolean;
  isSaving: boolean;
  newPermission: string;
  permissionDrafts: Record<number, PermissionDraft>;
  permissions: Permission[];
  setNewPermission: Dispatch<SetStateAction<string>>;
  setPermissionDrafts: Dispatch<SetStateAction<Record<number, PermissionDraft>>>;
};

export function PermissionManagement({
  canCreatePermissions,
  canDeletePermissions,
  canUpdatePermissions,
  canViewPermissions,
  handleCreatePermission,
  handleDeletePermission,
  handleUpdatePermission,
  isLoading,
  isSaving,
  newPermission,
  permissionDrafts,
  permissions,
  setNewPermission,
  setPermissionDrafts,
}: PermissionManagementProps) {
  return (
    <>
      {canCreatePermissions && (
        <Card>
          <CardHeader>
            <CardTitle>Create permission</CardTitle>
            <CardDescription>Use dot notation so permissions stay scannable.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleCreatePermission}>
              <div className="grid gap-2">
                <Label htmlFor="new-permission-name">Permission name</Label>
                <Input
                  id="new-permission-name"
                  placeholder="reports.export"
                  value={newPermission}
                  onChange={(event) => setNewPermission(event.target.value)}
                />
              </div>
              <Button className="w-fit" disabled={!newPermission.trim()} isLoading={isSaving} loadingLabel="Saving permission">
                {!isSaving && <KeyRound className="h-4 w-4" />}
                Create permission
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Existing permissions</CardTitle>
          <CardDescription>Rename or remove custom permissions. Protected permissions are blocked by the API.</CardDescription>
        </CardHeader>
        <CardContent>
          {!canViewPermissions && !isLoading ? (
            <p className="rounded-md border bg-slate-50 p-4 text-sm text-muted-foreground">You do not have permission to view permissions.</p>
          ) : isLoading ? (
            <LoadingState label="Loading permissions" />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    <TableHead>Group</TableHead>
                    {(canUpdatePermissions || canDeletePermissions) && <TableHead className="w-44 text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map((permission) => {
                    const draft = permissionDrafts[permission.id] ?? { name: permission.name };
                    return (
                      <TableRow key={permission.id}>
                        <TableCell className="min-w-72">
                          <Input
                            value={draft.name}
                            disabled={!canUpdatePermissions}
                            onChange={(event) =>
                              setPermissionDrafts((current) => ({
                                ...current,
                                [permission.id]: { name: event.target.value },
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="muted">{permissionGroup(permission.name)}</Badge>
                        </TableCell>
                        {(canUpdatePermissions || canDeletePermissions) && (
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              <Button size="icon" variant="outline" disabled={!canUpdatePermissions} isLoading={isSaving} onClick={() => handleUpdatePermission(permission)} title="Update permission">
                                {!isSaving && <Save className="h-4 w-4" />}
                              </Button>
                              <Button size="icon" variant="outline" disabled={!canDeletePermissions} isLoading={isSaving} onClick={() => handleDeletePermission(permission)} title="Delete permission">
                                {!isSaving && <Trash2 className="h-4 w-4" />}
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
