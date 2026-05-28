import { UserPlus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AccessSettings } from "./settings/AccessSettings";
import { MemberSettings } from "./settings/MemberSettings";
import { OverviewSettings } from "./settings/OverviewSettings";
import type { SettingsView } from "./settings/settingsTypes";
import { inputClass } from "./settings/settingsUtils";
import { useRbacSettings } from "./settings/useRbacSettings";

export function SettingsPage() {
  const settings = useRbacSettings();

  return (
    <div>
      <PageHeader
        eyebrow="Office"
        title="Settings"
        description={settings.sectionDescription}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="settings-view" className="sr-only">
              Settings view
            </Label>
            <select
              id="settings-view"
              className={`${inputClass} min-w-56`}
              value={settings.activeView}
              onChange={(event) => settings.setActiveView(event.target.value as SettingsView)}
            >
              <option value="overview">Overview</option>
              <option value="members">Member Setting</option>
              <option value="access">Role & Permission Setting</option>
            </select>
            <Button variant="outline">
              <UserPlus className="h-4 w-4" />
              Invite member
            </Button>
          </div>
        }
      />

      {(settings.notice || settings.error) && (
        <div className={`mb-4 rounded-md border p-3 text-sm ${settings.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {settings.error || settings.notice}
        </div>
      )}

      {settings.activeView === "overview" && (
        <OverviewSettings
          access={settings.access}
          groupedEffectivePermissions={settings.groupedEffectivePermissions}
          isSaving={settings.isSaving}
          members={settings.members}
          reloadRbac={settings.reloadRbac}
          tenant={settings.tenant}
          user={settings.user}
        />
      )}

      {settings.activeView === "members" && (
        <MemberSettings
          canAssignPermissions={settings.canAssignPermissions}
          canAssignRoles={settings.canAssignRoles}
          groupedPermissions={settings.groupedPermissions}
          handleSyncPermissions={settings.handleSyncPermissions}
          handleSyncRoles={settings.handleSyncRoles}
          isSaving={settings.isSaving}
          members={settings.members}
          roles={settings.roles}
          selectedDirectPermissions={settings.selectedDirectPermissions}
          selectedMember={settings.selectedMember}
          selectedMemberId={settings.selectedMemberId}
          selectedRoles={settings.selectedRoles}
          setSelectedDirectPermissions={settings.setSelectedDirectPermissions}
          setSelectedMemberId={settings.setSelectedMemberId}
          setSelectedRoles={settings.setSelectedRoles}
        />
      )}

      {settings.activeView === "access" && <AccessSettings {...settings} />}
    </div>
  );
}
