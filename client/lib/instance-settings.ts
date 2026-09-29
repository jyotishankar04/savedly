import { apiFetch } from "@/lib/auth";

export type SettingValue = string | number | boolean;

export interface SettingField {
  name: string;
  label: string;
  kind: "text" | "password" | "number" | "boolean" | "select";
  secret: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
  showWhen?: { field: string; equals: SettingValue[] };
  /** env wins over settings, settings over defaults. */
  source: "env" | "settings" | "default";
  /** Never sent for secret fields — see `isSet`. */
  value?: SettingValue | null;
  isSet?: boolean;
}

export interface SettingSection {
  id: string;
  title: string;
  description: string;
  testable: boolean;
  /** Self-hosted: every section. Hosted production: only the ones the team changes at runtime (Included AI). */
  editable: boolean;
  fields: SettingField[];
}

export interface InstanceSettings {
  selfHosted: boolean;
  callbackUrls: { google: string; github: string };
  sections: SettingSection[];
}

export function getInstanceSettings(): Promise<InstanceSettings> {
  return apiFetch<InstanceSettings>("/admin/instance-settings");
}

export function saveInstanceSection(id: string, values: Record<string, SettingValue | null>): Promise<SettingSection> {
  return apiFetch<SettingSection>(`/admin/instance-settings/${id}`, { method: "PUT", body: values });
}

export function testInstanceSection(id: string, values: Record<string, SettingValue | null>): Promise<{ ok: boolean; message: string }> {
  return apiFetch(`/admin/instance-settings/${id}/test`, { method: "POST", body: values });
}
