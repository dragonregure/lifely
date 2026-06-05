import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
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
import { PERMISSIONS } from "@/rbac/permissions";
import type { AccessRole, Permission, UserAccess } from "@/types";
import type { PermissionDraft, RoleDraft, SettingsView } from "./settingsTypes";
import { can, groupPermissionNames, permissionGroup } from "./settingsUtils";

export function useRbacSettings() {
  const { members, refreshSession, tenant, user } = useAuth();
  const [activeView, setActiveView] = useState<SettingsView>("overview");
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

  const selectedMember = useMemo(() => members.find((member) => member.id === selectedMemberId), [members, selectedMemberId]);

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, Permission[]>>((groups, permission) => {
      const group = permissionGroup(permission.name);
      groups[group] = [...(groups[group] ?? []), permission];
      return groups;
    }, {});
  }, [permissions]);

  const groupedEffectivePermissions = useMemo(() => groupPermissionNames(access?.permissions ?? []), [access]);

  const applyAccessState = useCallback((nextAccess: UserAccess, nextRoles: AccessRole[], nextPermissions: Permission[]) => {
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
  }, []);

  const reloadRbac = useCallback(async () => {
    const nextAccess = await getMyPermissions();
    const [nextRoles, nextPermissions] = await Promise.all([
      nextAccess.permissions.includes(PERMISSIONS.roles.view) ? getRoles() : Promise.resolve([]),
      nextAccess.permissions.includes(PERMISSIONS.permissions.view) ? getPermissions() : Promise.resolve([]),
    ]);
    applyAccessState(nextAccess, nextRoles, nextPermissions);
  }, [applyAccessState]);

  useEffect(() => {
    let isMounted = true;

    async function loadAccessData() {
      setIsLoading(true);
      setError("");

      try {
        await reloadRbac();
      } catch (caught) {
        if (!isMounted) return;
        setError(caught instanceof Error ? caught.message : "Unable to load access controls.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadAccessData();

    return () => {
      isMounted = false;
    };
  }, [reloadRbac]);

  useEffect(() => {
    if (selectedMemberId || members.length === 0) return;
    setSelectedMemberId(members[0].id);
  }, [members, selectedMemberId]);

  useEffect(() => {
    if (!selectedMember) return;
    setSelectedRoles(selectedMember.roles.length > 0 ? selectedMember.roles : [selectedMember.role]);
    setSelectedDirectPermissions(selectedMember.directPermissions);
  }, [selectedMember]);

  const runAction = useCallback(async (action: () => Promise<void>, successMessage: string) => {
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
  }, []);

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

  const sectionDescription =
    activeView === "overview"
      ? "Office profile, members, and your effective backend permissions."
      : activeView === "members"
        ? "Assign roles and direct permissions to individual members."
        : activeView === "references"
          ? "Manage reusable reference values for CRM forms and workflows."
          : "Manage reusable backend roles and permissions.";

  return {
    access,
    activeView,
    canAssignPermissions: can(access, PERMISSIONS.users.assignPermissions),
    canAssignRoles: can(access, PERMISSIONS.users.assignRoles),
    canCreatePermissions: can(access, PERMISSIONS.system.bypass),
    canCreateRoles: can(access, PERMISSIONS.roles.create),
    canDeletePermissions: can(access, PERMISSIONS.system.bypass),
    canDeleteRoles: can(access, PERMISSIONS.roles.delete),
    canManageSystemReferences: can(access, PERMISSIONS.references.manageSystem),
    canManageSystemRoles: can(access, PERMISSIONS.system.bypass),
    canViewReferences: can(access, PERMISSIONS.references.view),
    canUpdatePermissions: can(access, PERMISSIONS.system.bypass),
    canUpdateRoles: can(access, PERMISSIONS.roles.update),
    canViewPermissions: can(access, PERMISSIONS.permissions.view),
    canViewRoles: can(access, PERMISSIONS.roles.view),
    error,
    groupedEffectivePermissions,
    groupedPermissions,
    handleCreatePermission,
    handleCreateRole,
    handleDeletePermission,
    handleDeleteRole,
    handleSyncPermissions,
    handleSyncRoles,
    handleUpdatePermission,
    handleUpdateRole,
    isLoading,
    isSaving,
    members,
    newPermission,
    newRole,
    notice,
    permissionDrafts,
    permissions,
    reloadRbac,
    roleDrafts,
    roles,
    sectionDescription,
    selectedDirectPermissions,
    selectedMember,
    selectedMemberId,
    selectedRoles,
    setActiveView,
    setNewPermission,
    setNewRole,
    setPermissionDrafts,
    setRoleDrafts,
    setSelectedDirectPermissions,
    setSelectedMemberId,
    setSelectedRoles,
    tenant,
    user,
  };
}
