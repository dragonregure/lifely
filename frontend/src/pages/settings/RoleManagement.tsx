import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Save, ShieldCheck, Trash2 } from "lucide-react";
import { LoadingState } from "@/components/Loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AccessRole, Permission } from "@/types";
import type { RoleDraft } from "./settingsTypes";
import { toggleValue } from "./settingsUtils";

type RoleManagementProps = {
  canCreateRoles: boolean;
  canDeleteRoles: boolean;
  canUpdateRoles: boolean;
  canViewRoles: boolean;
  groupedPermissions: Record<string, Permission[]>;
  handleCreateRole: (event: FormEvent<HTMLFormElement>) => void;
  handleDeleteRole: (role: AccessRole) => void;
  handleUpdateRole: (role: AccessRole) => void;
  isLoading: boolean;
  isSaving: boolean;
  newRole: RoleDraft;
  roleDrafts: Record<number, RoleDraft>;
  roles: AccessRole[];
  setNewRole: Dispatch<SetStateAction<RoleDraft>>;
  setRoleDrafts: Dispatch<SetStateAction<Record<number, RoleDraft>>>;
};

export function RoleManagement({
  canCreateRoles,
  canDeleteRoles,
  canUpdateRoles,
  canViewRoles,
  groupedPermissions,
  handleCreateRole,
  handleDeleteRole,
  handleUpdateRole,
  isLoading,
  isSaving,
  newRole,
  roleDrafts,
  roles,
  setNewRole,
  setRoleDrafts,
}: RoleManagementProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Create role</CardTitle>
          <CardDescription>Assign any subset of permissions when creating the role.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleCreateRole}>
            <div className="grid gap-2">
              <Label htmlFor="new-role-name">Role name</Label>
              <Input
                id="new-role-name"
                placeholder="Sales Manager"
                value={newRole.name}
                disabled={!canCreateRoles}
                onChange={(event) => setNewRole((draft) => ({ ...draft, name: event.target.value }))}
              />
            </div>
            <div className="grid max-h-80 gap-4 overflow-auto pr-1">
              {isLoading ? <LoadingState label="Loading permissions" /> : Object.entries(groupedPermissions).map(([group, groupPermissions]) => (
                <div key={group} className="rounded-md border p-3">
                  <p className="mb-2 text-sm font-semibold capitalize">{group}</p>
                  <div className="grid gap-2">
                    {groupPermissions.map((permission) => (
                      <label key={permission.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={newRole.permissions.includes(permission.name)}
                          disabled={!canCreateRoles}
                          onChange={() => setNewRole((draft) => ({ ...draft, permissions: toggleValue(draft.permissions, permission.name) }))}
                        />
                        <span>{permission.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-fit" disabled={!canCreateRoles || !newRole.name.trim()} isLoading={isSaving} loadingLabel="Saving role">
              {!isSaving && <ShieldCheck className="h-4 w-4" />}
              Create role
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing roles</CardTitle>
          <CardDescription>Edit role names and permission membership. Save each role independently.</CardDescription>
        </CardHeader>
        <CardContent>
          {!canViewRoles && !isLoading ? (
            <p className="rounded-md border bg-slate-50 p-4 text-sm text-muted-foreground">You do not have permission to view roles.</p>
          ) : isLoading ? (
            <LoadingState label="Loading roles" />
          ) : (
            <div className="grid gap-4">
              {roles.map((role) => {
                const draft = roleDrafts[role.id] ?? { name: role.name, permissions: role.permissions.map((permission) => permission.name) };
                return (
                  <div key={role.id} className="rounded-md border p-4">
                    <div className="grid gap-3 lg:grid-cols-[18rem_1fr_auto]">
                      <Input
                        value={draft.name}
                        disabled={!canUpdateRoles}
                        onChange={(event) =>
                          setRoleDrafts((current) => ({
                            ...current,
                            [role.id]: { ...draft, name: event.target.value },
                          }))
                        }
                      />
                      <div className="flex flex-wrap gap-1">
                        {draft.permissions.slice(0, 8).map((permission) => (
                          <Badge key={permission} variant="muted">
                            {permission}
                          </Badge>
                        ))}
                        {draft.permissions.length > 8 && <Badge variant="secondary">+{draft.permissions.length - 8}</Badge>}
                      </div>
                      <div className="flex gap-2 lg:justify-end">
                        <Button size="icon" variant="outline" disabled={!canUpdateRoles} isLoading={isSaving} onClick={() => handleUpdateRole(role)} title="Update role">
                          {!isSaving && <Save className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="outline" disabled={!canDeleteRoles} isLoading={isSaving} onClick={() => handleDeleteRole(role)} title="Delete role">
                          {!isSaving && <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {Object.entries(groupedPermissions).map(([group, groupPermissions]) => (
                        <div key={group} className="rounded-md border bg-slate-50 p-3">
                          <p className="mb-2 text-sm font-semibold capitalize">{group}</p>
                          <div className="grid gap-2">
                            {groupPermissions.map((permission) => (
                              <label key={permission.id} className="flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={draft.permissions.includes(permission.name)}
                                  disabled={!canUpdateRoles}
                                  onChange={() =>
                                    setRoleDrafts((current) => ({
                                      ...current,
                                      [role.id]: {
                                        ...draft,
                                        permissions: toggleValue(draft.permissions, permission.name),
                                      },
                                    }))
                                  }
                                />
                                <span>{permission.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
