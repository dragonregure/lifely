import type { ReactNode } from "react";
import { useAuthorization } from "@/rbac/useAuthorization";
import type { PermissionName } from "@/rbac/permissions";

type PermissionGateProps = {
  allOf?: readonly (PermissionName | string)[];
  anyOf?: readonly (PermissionName | string)[];
  children: ReactNode;
  fallback?: ReactNode;
  permission?: PermissionName | string;
};

export function PermissionGate({ allOf, anyOf, children, fallback = null, permission }: PermissionGateProps) {
  const { can, canAll, canAny } = useAuthorization();
  const allowed =
    (permission ? can(permission) : true) &&
    (allOf ? canAll(allOf) : true) &&
    (anyOf ? canAny(anyOf) : true);

  return allowed ? <>{children}</> : <>{fallback}</>;
}
