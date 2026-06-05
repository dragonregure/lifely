import { ShieldCheck } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionManagement } from "./PermissionManagement";
import { RoleManagement } from "./RoleManagement";
import type { useRbacSettings } from "./useRbacSettings";

type AccessSettingsProps = Pick<
  ReturnType<typeof useRbacSettings>,
  | "canCreatePermissions"
  | "canCreateRoles"
  | "canDeletePermissions"
  | "canDeleteRoles"
  | "canManageSystemRoles"
  | "canUpdatePermissions"
  | "canUpdateRoles"
  | "canViewPermissions"
  | "canViewRoles"
  | "groupedPermissions"
  | "handleCreatePermission"
  | "handleCreateRole"
  | "handleDeletePermission"
  | "handleDeleteRole"
  | "handleUpdatePermission"
  | "handleUpdateRole"
  | "isLoading"
  | "isSaving"
  | "loadRoleDetails"
  | "newPermission"
  | "newRole"
  | "permissionDrafts"
  | "permissions"
  | "roleDrafts"
  | "roles"
  | "setNewPermission"
  | "setNewRole"
  | "setPermissionDrafts"
  | "setRoleDrafts"
>;

export function AccessSettings(props: AccessSettingsProps) {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-sky-700" />
            Role & Permission Setting
          </CardTitle>
          <CardDescription>Manage reusable backend roles and permission records. Protected admin access is enforced by Laravel.</CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="roles">
        <TabsList className="grid h-auto w-full grid-cols-2 sm:w-fit">
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>
        <TabsContent value="roles">
          <RoleManagement
            canCreateRoles={props.canCreateRoles}
            canDeleteRoles={props.canDeleteRoles}
            canManageSystemRoles={props.canManageSystemRoles}
            canUpdateRoles={props.canUpdateRoles}
            canViewRoles={props.canViewRoles}
            groupedPermissions={props.groupedPermissions}
            handleCreateRole={props.handleCreateRole}
            handleDeleteRole={props.handleDeleteRole}
            handleUpdateRole={props.handleUpdateRole}
            isLoading={props.isLoading}
            isSaving={props.isSaving}
            loadRoleDetails={props.loadRoleDetails}
            newRole={props.newRole}
            roleDrafts={props.roleDrafts}
            roles={props.roles}
            setNewRole={props.setNewRole}
            setRoleDrafts={props.setRoleDrafts}
          />
        </TabsContent>
        <TabsContent value="permissions">
          <PermissionManagement
            canCreatePermissions={props.canCreatePermissions}
            canDeletePermissions={props.canDeletePermissions}
            canUpdatePermissions={props.canUpdatePermissions}
            canViewPermissions={props.canViewPermissions}
            handleCreatePermission={props.handleCreatePermission}
            handleDeletePermission={props.handleDeletePermission}
            handleUpdatePermission={props.handleUpdatePermission}
            isLoading={props.isLoading}
            isSaving={props.isSaving}
            newPermission={props.newPermission}
            permissionDrafts={props.permissionDrafts}
            permissions={props.permissions}
            setNewPermission={props.setNewPermission}
            setPermissionDrafts={props.setPermissionDrafts}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
