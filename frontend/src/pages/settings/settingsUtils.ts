import { PERMISSIONS } from "@/rbac/permissions";
import type { UserAccess } from "@/types";

export function permissionGroup(name: string) {
  return name.split(".")[0] ?? "general";
}

export function sortedNames(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

export function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function can(userAccess: UserAccess | null, permission: string) {
  return (
    userAccess?.permissions.includes(PERMISSIONS.system.bypass) ||
    userAccess?.permissions.includes(permission) ||
    false
  );
}

export function groupPermissionNames(values: string[]) {
  return sortedNames(values).reduce<Record<string, string[]>>((groups, permission) => {
    const group = permissionGroup(permission);
    groups[group] = [...(groups[group] ?? []), permission];
    return groups;
  }, {});
}
