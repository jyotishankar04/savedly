import { apiFetch } from "@/lib/auth";

export interface VaultStatus {
  hasPin: boolean;
  unlocked: boolean;
}

export const getVaultStatus = () => apiFetch<VaultStatus>("/vault/status");

export const setVaultPin = (input: { currentPin?: string; newPin: string }) =>
  apiFetch<void>("/vault/pin", { method: "POST", body: input });

export const unlockVault = (pin: string) => apiFetch<{ unlocked: true }>("/vault/unlock", { method: "POST", body: { pin } });

export const lockVault = () => apiFetch<void>("/vault/lock", { method: "POST" });
