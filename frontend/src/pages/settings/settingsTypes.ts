export type SettingsView = "overview" | "members" | "access";

export type RoleDraft = {
  name: string;
  permissions: string[];
};

export type PermissionDraft = {
  name: string;
};
