import { Outlet } from "react-router-dom";
import { AccessDenied } from "@/components/rbac/AccessDenied";
import type { PermissionName } from "@/rbac/permissions";
import { useAuthorization } from "@/rbac/useAuthorization";

type PermissionRouteProps = {
  anyOf?: readonly PermissionName[];
};

export function PermissionRoute({ anyOf }: PermissionRouteProps) {
  const { canAny } = useAuthorization();

  if (anyOf && !canAny(anyOf)) {
    return <AccessDenied />;
  }

  return <Outlet />;
}
