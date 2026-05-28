import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import type { PermissionName } from "./permissions";

type PermissionInput = PermissionName | string;

export function useAuthorization() {
  const { user } = useAuth();
  const permissionSet = useMemo(() => new Set(user?.permissions ?? []), [user?.permissions]);

  const can = (permission: PermissionInput) => permissionSet.has(permission);
  const canAny = (permissions: readonly PermissionInput[]) => permissions.length === 0 || permissions.some((permission) => can(permission));
  const canAll = (permissions: readonly PermissionInput[]) => permissions.every((permission) => can(permission));

  return {
    can,
    canAll,
    canAny,
    permissions: permissionSet,
  };
}
