import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  createPermission,
  createRole,
  deletePermission,
  deleteRole,
  getRole,
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

function roleToDraft(role: AccessRole): RoleDraft {
  return {
    name: role.name,
    permissions: role.permissions.map((permission) => permission.name),
  };
}

function isRbacListView(view: SettingsView) {
  return view === "members" || view === "access";
}

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
  const [hasLoadedRoles, setHasLoadedRoles] = useState(false);
  const [hasLoadedPermissions, setHasLoadedPermissions] = useState(false);

  const selectedMember = useMemo(() => members.find((member) => member.id === selectedMemberId), [members, selectedMemberId]);

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, Permission[]>>((groups, permission) => {
      const group = permissionGroup(permission.name);
      groups[group] = [...(groups[group] ?? []), permission];
      return groups;
    }, {});
  }, [permissions]);

  const groupedEffectivePermissions = useMemo(() => groupPermissionNames(access?.permissions ?? []), [access]);

  const canViewRolesFromAccess = useCallback((nextAccess: UserAccess | null) => can(nextAccess, PERMISSIONS.roles.view), []);
  const canViewPermissionsFromAccess = useCallback((nextAccess: UserAccess | null) => can(nextAccess, PERMISSIONS.permissions.view), []);

  const applyAccess = useCallback(
    (nextAccess: UserAccess) => {
      setAccess(nextAccess);

      if (!canViewRolesFromAccess(nextAccess)) {
        setRoles([]);
        setRoleDrafts({});
        setHasLoadedRoles(false);
      }

      if (!canViewPermissionsFromAccess(nextAccess)) {
        setPermissions([]);
        setPermissionDrafts({});
        setHasLoadedPermissions(false);
      }
    },
    [canViewPermissionsFromAccess, canViewRolesFromAccess],
  );

  const applyRoles = useCallback((nextRoles: AccessRole[]) => {
    setRoles(nextRoles);
    setHasLoadedRoles(true);
    setRoleDrafts((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([roleId]) => nextRoles.some((role) => role.id === Number(roleId))),
      ),
    );
  }, []);

  const applyPermissions = useCallback((nextPermissions: Permission[]) => {
    setPermissions(nextPermissions);
    setHasLoadedPermissions(true);
    setPermissionDrafts(Object.fromEntries(nextPermissions.map((permission) => [permission.id, { name: permission.name }])));
  }, []);

  const loadRbacLists = useCallback(
    async (nextAccess: UserAccess, options: { force?: boolean } = {}) => {
      const shouldLoadRoles = canViewRolesFromAccess(nextAccess) && (options.force || !hasLoadedRoles);
      const shouldLoadPermissions = canViewPermissionsFromAccess(nextAccess) && (options.force || !hasLoadedPermissions);

      const [nextRoles, nextPermissions] = await Promise.all([
        shouldLoadRoles ? getRoles() : Promise.resolve<AccessRole[] | null>(null),
        shouldLoadPermissions ? getPermissions() : Promise.resolve<Permission[] | null>(null),
      ]);

      if (nextRoles) {
        applyRoles(nextRoles);
      }

      if (nextPermissions) {
        applyPermissions(nextPermissions);
      }
    },
    [applyPermissions, applyRoles, canViewPermissionsFromAccess, canViewRolesFromAccess, hasLoadedPermissions, hasLoadedRoles],
  );

  const reloadRbac = useCallback(async () => {
    const nextAccess = await getMyPermissions();
    applyAccess(nextAccess);

    if (isRbacListView(activeView)) {
      await loadRbacLists(nextAccess, { force: true });
    }
  }, [activeView, applyAccess, loadRbacLists]);

  const loadRoleDetails = useCallback(async (roleId: number) => {
    const role = await getRole(roleId, { include: ["permissions"] });

    setRoles((current) => current.map((item) => (item.id === role.id ? role : item)));
    setRoleDrafts((current) => ({
      ...current,
      [role.id]: roleToDraft(role),
    }));

    return role;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadAccessData() {
      setIsLoading(true);
      setError("");

      try {
        const nextAccess = await getMyPermissions();

        if (isMounted) {
          applyAccess(nextAccess);
        }
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
  }, [applyAccess]);

  useEffect(() => {
    if (!access || !isRbacListView(activeView)) {
      return;
    }

    const shouldLoadRoles = canViewRolesFromAccess(access) && !hasLoadedRoles;
    const shouldLoadPermissions = canViewPermissionsFromAccess(access) && !hasLoadedPermissions;

    if (!shouldLoadRoles && !shouldLoadPermissions) {
      return;
    }

    const currentAccess = access;
    let isMounted = true;

    async function loadRelatedSettingsData() {
      setIsLoading(true);
      setError("");

      try {
        await loadRbacLists(currentAccess);
      } catch (caught) {
        if (!isMounted) return;
        setError(caught instanceof Error ? caught.message : "Unable to load role and permission settings.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadRelatedSettingsData();

    return () => {
      isMounted = false;
    };
  }, [
    access,
    activeView,
    canViewPermissionsFromAccess,
    canViewRolesFromAccess,
    hasLoadedPermissions,
    hasLoadedRoles,
    loadRbacLists,
  ]);

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
    canManageSystemRoles: can(access, PERMISSIONS.roles.manageSystem),
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
    loadRoleDetails,
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
