import { useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Eye, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { DataTable, type DataTableColumn, type DataTableFilter } from "@/components/data-table";
import { ConfirmationDialog } from "@/components/dialogs/ConfirmationDialog";
import { LoadingState } from "@/components/Loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AccessRole, Permission } from "@/types";
import type { RoleDraft } from "./settingsTypes";
import { toggleValue } from "./settingsUtils";

const SYSTEM_ROLE_READONLY_MESSAGE = "You cannot modify system role.";

type RoleManagementProps = {
  canCreateRoles: boolean;
  canDeleteRoles: boolean;
  canManageSystemRoles: boolean;
  canUpdateRoles: boolean;
  canViewRoles: boolean;
  groupedPermissions: Record<string, Permission[]>;
  handleCreateRole: (event: FormEvent<HTMLFormElement>) => void;
  handleDeleteRole: (role: AccessRole) => void;
  handleUpdateRole: (role: AccessRole) => void;
  isLoading: boolean;
  isSaving: boolean;
  loadRoleDetails: (roleId: number) => Promise<AccessRole>;
  newRole: RoleDraft;
  roleDrafts: Record<number, RoleDraft>;
  roles: AccessRole[];
  setNewRole: Dispatch<SetStateAction<RoleDraft>>;
  setRoleDrafts: Dispatch<SetStateAction<Record<number, RoleDraft>>>;
};

export function RoleManagement({
  canCreateRoles,
  canDeleteRoles,
  canManageSystemRoles,
  canUpdateRoles,
  canViewRoles,
  groupedPermissions,
  handleCreateRole,
  handleDeleteRole,
  handleUpdateRole,
  isLoading,
  isSaving,
  loadRoleDetails,
  newRole,
  roleDrafts,
  roles,
  setNewRole,
  setRoleDrafts,
}: RoleManagementProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AccessRole | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedRoleDetail, setSelectedRoleDetail] = useState<AccessRole | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const selectedRoleSummary = useMemo(() => roles.find((role) => role.id === selectedRoleId) ?? null, [roles, selectedRoleId]);
  const selectedRole = selectedRoleDetail ?? selectedRoleSummary;
  const selectedDraft = selectedRole ? roleDrafts[selectedRole.id] ?? roleToDraft(selectedRole) : null;
  const canModifySelectedRole = selectedRole ? canUpdateRoles && (!selectedRole.isSystem || canManageSystemRoles) : false;
  const canDeletePendingRole = pendingDelete ? canDeleteRoles && (!pendingDelete.isSystem || canManageSystemRoles) : false;

  const roleColumns = useMemo<DataTableColumn<AccessRole>[]>(
    () => [
      {
        id: "role",
        header: "Role",
        cell: (role) => (
          <div className="grid gap-1">
            <span className="font-medium">{role.name}</span>
            <span className="text-xs text-muted-foreground">{role.guardName}</span>
          </div>
        ),
        searchValue: (role) => role.name,
        sortable: true,
        sortValue: (role) => role.name,
      },
      {
        id: "scope",
        header: "Scope",
        cell: (role) => (
          <Badge variant={role.isSystem ? "secondary" : "muted"}>
            {role.isSystem ? "System" : "Tenant"}
          </Badge>
        ),
        searchValue: (role) => (role.isSystem ? "system" : "tenant"),
        sortable: true,
        sortValue: (role) => (role.isSystem ? "System" : "Tenant"),
      },
    ],
    [],
  );

  const roleFilters = useMemo<DataTableFilter<AccessRole>[]>(
    () => [
      {
        id: "scope",
        label: "Scope",
        defaultValue: "all",
        options: [
          { label: "All scopes", value: "all" },
          { label: "Tenant roles", value: "tenant" },
          { label: "System roles", value: "system" },
        ],
        predicate: (role, selectedValue) => selectedValue === "all" || (selectedValue === "system" ? role.isSystem : !role.isSystem),
      },
    ],
    [],
  );

  const handleCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    handleCreateRole(event);

    if (newRole.name.trim()) {
      setIsCreateOpen(false);
    }
  };

  const openPreview = async (role: AccessRole) => {
    setSelectedRoleId(role.id);
    setSelectedRoleDetail(null);
    setDetailError("");
    setIsPreviewOpen(true);
    setIsDetailLoading(true);

    try {
      setSelectedRoleDetail(await loadRoleDetails(role.id));
    } catch (caught) {
      setDetailError(caught instanceof Error ? caught.message : "Unable to load role details.");
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete || !canDeletePendingRole) return;

    handleDeleteRole(pendingDelete);

    if (selectedRoleId === pendingDelete.id) {
      setSelectedRoleId(null);
      setIsPreviewOpen(false);
    }
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>Roles</CardTitle>
            <CardDescription>Search, filter, preview, and manage tenant role permission sets.</CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="ml-auto shrink-0" disabled={!canCreateRoles}>
                <Plus className="h-4 w-4" />
                Create role
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create role</DialogTitle>
                <DialogDescription>Assign available permissions before saving the tenant role.</DialogDescription>
              </DialogHeader>
              <RoleEditorCard
                canSave={canCreateRoles}
                draft={newRole}
                groupedPermissions={groupedPermissions}
                isSaving={isSaving}
                mode="create"
                onDraftChange={setNewRole}
                onSubmit={handleCreateSubmit}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!canViewRoles && !isLoading ? (
            <p className="rounded-md border bg-slate-50 p-4 text-sm text-muted-foreground">You do not have permission to view roles.</p>
          ) : (
            <DataTable
              actions={(role) => {
                const canRemoveRole = canDeleteRoles && (!role.isSystem || canManageSystemRoles);
                const deleteTooltip = role.isSystem && !canManageSystemRoles ? SYSTEM_ROLE_READONLY_MESSAGE : "Delete role";

                return (
                  <>
                    <Button variant="outline" size="icon" title="Preview role" aria-label="Preview role" onClick={() => void openPreview(role)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {(canRemoveRole || role.isSystem) && (
                      <span className="inline-flex" title={deleteTooltip}>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={deleteTooltip}
                          disabled={!canRemoveRole}
                          onClick={() => setPendingDelete(role)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </span>
                    )}
                  </>
                );
              }}
              columns={roleColumns}
              data={roles}
              emptyMessage={isLoading ? "Loading roles..." : "No roles found."}
              filters={roleFilters}
              initialPageSize={10}
              isLoading={isLoading}
              rowKey="id"
              search={{ enabled: true, placeholder: "Search roles" }}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRole?.name ?? "Role"}</DialogTitle>
            <DialogDescription>Preview and update the selected role.</DialogDescription>
          </DialogHeader>
          {isDetailLoading ? (
            <LoadingState label="Loading role details" />
          ) : detailError ? (
            <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{detailError}</p>
          ) : selectedRole && selectedDraft ? (
            <RoleEditorCard
              canSave={canModifySelectedRole}
              draft={selectedDraft}
              groupedPermissions={groupedPermissions}
              isSaving={isSaving}
              mode="update"
              onDraftChange={(draft: RoleDraft) =>
                setRoleDrafts((current) => ({
                  ...current,
                  [selectedRole.id]: draft,
                }))
              }
              onSubmit={(event) => {
                event.preventDefault();
                handleUpdateRole(selectedRole);
                setIsPreviewOpen(false);
              }}
              readOnlyReason={selectedRole.isSystem && !canModifySelectedRole ? SYSTEM_ROLE_READONLY_MESSAGE : undefined}
              role={selectedRole}
            />
          ) : (
            <p className="rounded-md border bg-slate-50 p-4 text-sm text-muted-foreground">Select a role to preview its permissions.</p>
          )}
        </DialogContent>
      </Dialog>

      {pendingDelete && (
        <ConfirmationDialog
          title="Delete role"
          description={`${pendingDelete.name} will be removed from ${pendingDelete.isSystem ? "system" : "tenant"} roles.`}
          confirmLabel="Delete"
          isSubmitting={isSaving}
          variant="destructive"
          open={Boolean(pendingDelete)}
          onOpenChange={(open) => {
            if (!open) setPendingDelete(null);
          }}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}

type RoleEditorCardProps = {
  canSave: boolean;
  draft: RoleDraft;
  groupedPermissions: Record<string, Permission[]>;
  isSaving: boolean;
  mode: "create" | "update";
  onDraftChange: Dispatch<SetStateAction<RoleDraft>> | ((draft: RoleDraft) => void);
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readOnlyReason?: string;
  role?: AccessRole;
};

function RoleEditorCard({
  canSave,
  draft,
  groupedPermissions,
  isSaving,
  mode,
  onDraftChange,
  onSubmit,
  readOnlyReason,
  role,
}: RoleEditorCardProps) {
  const title = mode === "create" ? "Role card" : role?.name ?? "Role card";
  const description = mode === "create" ? "Create a tenant role from available permissions." : "Modify the role name and permission set.";

  const updateDraft = (nextDraft: RoleDraft) => {
    onDraftChange(nextDraft);
  };

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-sky-700" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {role && (
            <Badge variant={role.isSystem ? "secondary" : "muted"}>
              {role.isSystem ? "System" : "Tenant"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor={`${mode}-role-name`}>Role name</Label>
            <Input
              id={`${mode}-role-name`}
              placeholder="Sales Manager"
              value={draft.name}
              disabled={!canSave}
              onChange={(event) => updateDraft({ ...draft, name: event.target.value })}
            />
          </div>
          <div className="grid max-h-[28rem] gap-4 overflow-auto pr-1">
            {Object.entries(groupedPermissions).map(([group, groupPermissions]) => (
              <div key={group} className="rounded-md border bg-slate-50 p-3">
                <p className="mb-2 text-sm font-semibold capitalize">{group}</p>
                <div className="grid gap-2">
                  {groupPermissions.map((permission) => (
                    <label key={permission.id} className="flex items-center gap-2 text-xs" title={!canSave ? readOnlyReason : undefined}>
                      <Checkbox
                        checked={draft.permissions.includes(permission.name)}
                        disabled={!canSave}
                        onChange={() => updateDraft({ ...draft, permissions: toggleValue(draft.permissions, permission.name) })}
                      />
                      <span>{permission.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button disabled={!canSave || !draft.name.trim()} isLoading={isSaving} loadingLabel={mode === "create" ? "Creating role" : "Saving role"}>
              {!isSaving && <Save className="h-4 w-4" />}
              {mode === "create" ? "Create role" : "Save role"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function roleToDraft(role: AccessRole): RoleDraft {
  return {
    name: role.name,
    permissions: role.permissions.map((permission) => permission.name),
  };
}
