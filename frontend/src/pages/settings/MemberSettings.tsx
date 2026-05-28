import type { Dispatch, SetStateAction } from "react";
import { Save, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { AccessRole, Permission, User } from "@/types";
import { inputClass, toggleValue } from "./settingsUtils";

type MemberSettingsProps = {
  canAssignPermissions: boolean;
  canAssignRoles: boolean;
  groupedPermissions: Record<string, Permission[]>;
  handleSyncPermissions: () => void;
  handleSyncRoles: () => void;
  isSaving: boolean;
  members: User[];
  roles: AccessRole[];
  selectedDirectPermissions: string[];
  selectedMember: User | undefined;
  selectedMemberId: string;
  selectedRoles: string[];
  setSelectedDirectPermissions: Dispatch<SetStateAction<string[]>>;
  setSelectedMemberId: Dispatch<SetStateAction<string>>;
  setSelectedRoles: Dispatch<SetStateAction<string[]>>;
};

export function MemberSettings({
  canAssignPermissions,
  canAssignRoles,
  groupedPermissions,
  handleSyncPermissions,
  handleSyncRoles,
  isSaving,
  members,
  roles,
  selectedDirectPermissions,
  selectedMember,
  selectedMemberId,
  selectedRoles,
  setSelectedDirectPermissions,
  setSelectedMemberId,
  setSelectedRoles,
}: MemberSettingsProps) {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-sky-700" />
            Member Setting
          </CardTitle>
          <CardDescription>Select one member, then sync roles and direct permissions in separate panels.</CardDescription>
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

          {selectedMember && (
            <div className="rounded-md border bg-slate-50 p-4">
              <p className="font-semibold">{selectedMember.name}</p>
              <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedRoles.map((role) => (
                  <Badge key={role} variant={role === "Office Admin" ? "info" : "secondary"}>
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Assigned roles</CardTitle>
            <CardDescription>Role changes are saved only when you sync them.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              {roles.map((role) => (
                <label key={role.id} className="flex items-center gap-2 rounded-md border p-3 text-sm">
                  <input type="checkbox" checked={selectedRoles.includes(role.name)} disabled={!canAssignRoles} onChange={() => setSelectedRoles(toggleValue(selectedRoles, role.name))} />
                  <span className="font-medium">{role.name}</span>
                </label>
              ))}
            </div>
            <Button className="w-fit" disabled={!canAssignRoles || isSaving || !selectedMember} onClick={handleSyncRoles}>
              <Save className="h-4 w-4" />
              Sync roles
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Direct permissions</CardTitle>
            <CardDescription>Use direct permissions for exceptions beyond assigned roles.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid max-h-[28rem] gap-4 overflow-auto pr-1">
              {Object.entries(groupedPermissions).map(([group, groupPermissions]) => (
                <div key={group} className="rounded-md border p-3">
                  <p className="mb-2 text-sm font-semibold capitalize">{group}</p>
                  <div className="grid gap-2">
                    {groupPermissions.map((permission) => (
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
                </div>
              ))}
            </div>
            <Button className="w-fit" disabled={!canAssignPermissions || isSaving || !selectedMember} onClick={handleSyncPermissions}>
              <Save className="h-4 w-4" />
              Sync permissions
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
