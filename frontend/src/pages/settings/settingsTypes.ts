export type SettingsView = "overview" | "members" | "access" | "references";

export type RoleDraft = {
  name: string;
  permissions: string[];
};

export type PermissionDraft = {
  name: string;
};
