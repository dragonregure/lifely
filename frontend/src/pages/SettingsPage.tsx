import { useEffect, useMemo, useState, type FormEvent } from "react";
import { KeyRound, RotateCcw, Save, ShieldCheck, Trash2, UserCog, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import {
  createPermission,
  createRole,
  deletePermission,
  deleteRole,
  getMyPermissions,
  getPermissions,
  getRoles,
  syncUserPermissions,
  syncUserRoles,
  updatePermission,
  updateRole,
} from "@/services/api";
import type { AccessRole, Permission, UserAccess } from "@/types";

const inputClass =
  "h-10 rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring";

type RoleDraft = {
  name: string;
  permissions: string[];
};

type PermissionDraft = {
  name: string;
};

function permissionGroup(name: string) {
  return name.split(".")[0] ?? "general";
}

function sortedNames(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function can(userAccess: UserAccess | null, permission: string) {
  return userAccess?.permissions.includes(permission) ?? false;
}

export function SettingsPage() {
  const { members, refreshSession, tenant, user } = useAuth();
  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [access, setAccess] = useState<UserAccess | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<number, RoleDraft>>({});
  const [permissionDrafts, setPermissionDrafts] = useState<Record<number, PermissionDraft>>({});
  const [newRole, setNewRole] = useState<RoleDraft>({ name: "", permissions: [] });
  const [newPermission, setNewPermission] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedDirectPermissions, setSelectedDirectPermissions] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const selectedMember = members.find((member) => member.id === selectedMemberId);
  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, Permission[]>>((groups, permission) => {
      const group = permissionGroup(permission.name);
      groups[group] = [...(groups[group] ?? []), permission];
      return groups;
    }, {});
  }, [permissions]);

  const canViewRoles = can(access, "roles.view");
  const canCreateRoles = can(access, "roles.create");
  const canUpdateRoles = can(access, "roles.update");
  const canDeleteRoles = can(access, "roles.delete");
  const canViewPermissions = can(access, "permissions.view");
  const canCreatePermissions = can(access, "permissions.create");
  const canUpdatePermissions = can(access, "permissions.update");
  const canDeletePermissions = can(access, "permissions.delete");
  const canAssignRoles = can(access, "users.assign_roles");
  const canAssignPermissions = can(access, "users.assign_permissions");

  useEffect(() => {
    let isMounted = true;

    async function loadAccessData() {
      setIsLoading(true);
      setError("");

      try {
        const currentAccess = await getMyPermissions();
        const [roleData, permissionData] = await Promise.all([
          currentAccess.permissions.includes("roles.view") ? getRoles() : Promise.resolve([]),
          currentAccess.permissions.includes("permissions.view") ? getPermissions() : Promise.resolve([]),
        ]);

        if (!isMounted) return;

        setAccess(currentAccess);
        setRoles(roleData);
        setPermissions(permissionData);
        setRoleDrafts(
          Object.fromEntries(
            roleData.map((role) => [
              role.id,
              {
                name: role.name,
                permissions: role.permissions.map((permission) => permission.name),
              },
            ]),
          ),
        );
        setPermissionDrafts(Object.fromEntries(permissionData.map((permission) => [permission.id, { name: permission.name }])));
      } catch (caught) {
        if (!isMounted) return;
        setError(caught instanceof Error ? caught.message : "Unable to load access controls.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAccessData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (selectedMemberId || members.length === 0) return;
    setSelectedMemberId(members[0].id);
  }, [members, selectedMemberId]);

  useEffect(() => {
    if (!selectedMember) return;
    setSelectedRoles(selectedMember.roles.length > 0 ? selectedMember.roles : [selectedMember.role]);
    setSelectedDirectPermissions(selectedMember.directPermissions);
  }, [selectedMember]);

  const reloadRbac = async () => {
    const [nextAccess, nextRoles, nextPermissions] = await Promise.all([getMyPermissions(), getRoles(), getPermissions()]);
    setAccess(nextAccess);
    setRoles(nextRoles);
    setPermissions(nextPermissions);
    setRoleDrafts(
      Object.fromEntries(
        nextRoles.map((role) => [
          role.id,
          {
            name: role.name,
            permissions: role.permissions.map((permission) => permission.name),
          },
        ]),
      ),
    );
    setPermissionDrafts(Object.fromEntries(nextPermissions.map((permission) => [permission.id, { name: permission.name }])));
  };

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    setIsSaving(true);
    setError("");
    setNotice("");

    try {
      await action();
      setNotice(successMessage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The access change could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRole = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void runAction(async () => {
      await createRole({ name: newRole.name, permissions: newRole.permissions });
      setNewRole({ name: "", permissions: [] });
      await reloadRbac();
    }, "Role created.");
  };

  const handleUpdateRole = (role: AccessRole) => {
    const draft = roleDrafts[role.id];
    if (!draft) return;

    void runAction(async () => {
      await updateRole(role.id, draft);
      await reloadRbac();
      await refreshSession();
    }, "Role updated.");
  };

  const handleDeleteRole = (role: AccessRole) => {
    void runAction(async () => {
      await deleteRole(role.id);
      await reloadRbac();
      await refreshSession();
    }, "Role deleted.");
  };

  const handleCreatePermission = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void runAction(async () => {
      await createPermission({ name: newPermission });
      setNewPermission("");
      await reloadRbac();
    }, "Permission created.");
  };

  const handleUpdatePermission = (permission: Permission) => {
    const draft = permissionDrafts[permission.id];
    if (!draft) return;

    void runAction(async () => {
      await updatePermission(permission.id, draft);
      await reloadRbac();
      await refreshSession();
    }, "Permission updated.");
  };

  const handleDeletePermission = (permission: Permission) => {
    void runAction(async () => {
      await deletePermission(permission.id);
      await reloadRbac();
      await refreshSession();
    }, "Permission deleted.");
  };

  const handleSyncRoles = () => {
    if (!selectedMember) return;

    void runAction(async () => {
      await syncUserRoles(selectedMember.id, selectedRoles, tenant?.id);
      await refreshSession();
    }, "Member roles synced.");
  };

  const handleSyncPermissions = () => {
    if (!selectedMember) return;

    void runAction(async () => {
      await syncUserPermissions(selectedMember.id, selectedDirectPermissions, tenant?.id);
      await refreshSession();
    }, "Member direct permissions synced.");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Office"
        title="Settings"
        description="Tenant profile, member access, roles, and permission controls backed by Laravel authorization."
        actions={
          <Button variant="outline">
            <UserPlus className="h-4 w-4" />
            Invite member
          </Button>
        }
      />

      {(notice || error) && (
        <div className={`mb-4 rounded-md border p-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {error || notice}
        </div>
      )}

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
              <p className="text-sm text-muted-foreground">Signed in as</p>
              <p className="mt-1 font-semibold">{user?.name ?? "Loading"}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {(access?.roles ?? user?.roles ?? []).map((role) => (
                  <Badge key={role} variant={role === "Office Admin" ? "info" : "secondary"}>
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-sky-700" />
              Member access
            </CardTitle>
            <CardDescription>Assign Spatie roles and direct permissions to office members.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="member-select">Member</Label>
              <select id="member-select" className={inputClass} value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)}>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} - {member.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border p-3">
                <p className="mb-2 text-sm font-semibold">Roles</p>
                <div className="grid max-h-48 gap-2 overflow-auto pr-1">
                  {roles.map((role) => (
                    <label key={role.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role.name)}
                        disabled={!canAssignRoles}
                        onChange={() => setSelectedRoles(toggleValue(selectedRoles, role.name))}
                      />
                      <span>{role.name}</span>
                    </label>
                  ))}
                </div>
                <Button className="mt-3" size="sm" disabled={!canAssignRoles || isSaving || !selectedMember} onClick={handleSyncRoles}>
                  <Save className="h-4 w-4" />
                  Sync roles
                </Button>
              </div>

              <div className="rounded-md border p-3">
                <p className="mb-2 text-sm font-semibold">Direct permissions</p>
                <div className="grid max-h-48 gap-2 overflow-auto pr-1">
                  {permissions.map((permission) => (
                    <label key={permission.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedDirectPermissions.includes(permission.name)}
                        disabled={!canAssignPermissions}
                        onChange={() => setSelectedDirectPermissions(toggleValue(selectedDirectPermissions, permission.name))}
                      />
                      <span>{permission.name}</span>
                    </label>
                  ))}
                </div>
                <Button className="mt-3" size="sm" disabled={!canAssignPermissions || isSaving || !selectedMember} onClick={handleSyncPermissions}>
                  <Save className="h-4 w-4" />
                  Sync permissions
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="roles" className="mt-4">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="effective">My Access</TabsTrigger>
        </TabsList>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-sky-700" />
                Roles
              </CardTitle>
              <CardDescription>Create, update, and delete backend roles. Office Admin is protected by the API.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <form className="grid gap-3 rounded-md border bg-slate-50 p-3 lg:grid-cols-[16rem_1fr_auto]" onSubmit={handleCreateRole}>
                <Input
                  placeholder="Role name"
                  value={newRole.name}
                  disabled={!canCreateRoles}
                  onChange={(event) => setNewRole((draft) => ({ ...draft, name: event.target.value }))}
                />
                <div className="flex flex-wrap gap-2">
                  {permissions.slice(0, 12).map((permission) => (
                    <label key={permission.id} className="flex items-center gap-1 rounded-md border bg-white px-2 py-1 text-xs">
                      <input
                        type="checkbox"
                        checked={newRole.permissions.includes(permission.name)}
                        disabled={!canCreateRoles}
                        onChange={() => setNewRole((draft) => ({ ...draft, permissions: toggleValue(draft.permissions, permission.name) }))}
                      />
                      {permission.name}
                    </label>
                  ))}
                </div>
                <Button disabled={!canCreateRoles || isSaving || !newRole.name.trim()}>
                  <ShieldCheck className="h-4 w-4" />
                  Create role
                </Button>
              </form>

              {!canViewRoles && !isLoading ? (
                <p className="rounded-md border bg-slate-50 p-4 text-sm text-muted-foreground">You do not have permission to view roles.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role</TableHead>
                        <TableHead>Permissions</TableHead>
                        <TableHead className="w-44 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roles.map((role) => {
                        const draft = roleDrafts[role.id] ?? { name: role.name, permissions: role.permissions.map((permission) => permission.name) };
                        return (
                          <TableRow key={role.id}>
                            <TableCell className="min-w-56">
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
                            </TableCell>
                            <TableCell>
                              <div className="grid max-h-32 gap-2 overflow-auto pr-1 md:grid-cols-2">
                                {permissions.map((permission) => (
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
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button size="icon" variant="outline" disabled={!canUpdateRoles || isSaving} onClick={() => handleUpdateRole(role)} title="Update role">
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="outline" disabled={!canDeleteRoles || isSaving} onClick={() => handleDeleteRole(role)} title="Delete role">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-sky-700" />
                Permissions
              </CardTitle>
              <CardDescription>Create, rename, and delete backend permissions. Admin-critical permissions are protected by the API.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <form className="grid gap-3 rounded-md border bg-slate-50 p-3 md:grid-cols-[1fr_auto]" onSubmit={handleCreatePermission}>
                <Input
                  placeholder="permissions.example"
                  value={newPermission}
                  disabled={!canCreatePermissions}
                  onChange={(event) => setNewPermission(event.target.value)}
                />
                <Button disabled={!canCreatePermissions || isSaving || !newPermission.trim()}>
                  <KeyRound className="h-4 w-4" />
                  Create permission
                </Button>
              </form>

              {!canViewPermissions && !isLoading ? (
                <p className="rounded-md border bg-slate-50 p-4 text-sm text-muted-foreground">You do not have permission to view permissions.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Permission</TableHead>
                        <TableHead>Group</TableHead>
                        <TableHead className="w-44 text-right">Actions</TableHead>
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
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  disabled={!canUpdatePermissions || isSaving}
                                  onClick={() => handleUpdatePermission(permission)}
                                  title="Update permission"
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  disabled={!canDeletePermissions || isSaving}
                                  onClick={() => handleDeletePermission(permission)}
                                  title="Delete permission"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="effective">
          <Card>
            <CardHeader>
              <CardTitle>My effective access</CardTitle>
              <CardDescription>Roles, direct permissions, and effective permissions returned by `/me/permissions`.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div>
                <p className="mb-2 text-sm font-semibold">Roles</p>
                <div className="flex flex-wrap gap-2">
                  {(access?.roles ?? []).map((role) => (
                    <Badge key={role} variant="info">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold">Direct permissions</p>
                <div className="flex flex-wrap gap-2">
                  {(access?.directPermissions ?? []).length > 0 ? (
                    sortedNames(access?.directPermissions ?? []).map((permission) => (
                      <Badge key={permission} variant="secondary">
                        {permission}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No direct permissions assigned.</span>
                  )}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold">Effective permissions</p>
                <div className="grid gap-3 md:grid-cols-3">
                  {Object.entries(groupedPermissions).map(([group]) => {
                    const names = sortedNames((access?.permissions ?? []).filter((permission) => permissionGroup(permission) === group));
                    if (names.length === 0) return null;
                    return (
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
                    );
                  })}
                </div>
              </div>
              <Button variant="outline" className="w-fit" onClick={() => void reloadRbac()} disabled={isSaving}>
                <RotateCcw className="h-4 w-4" />
                Refresh access
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
