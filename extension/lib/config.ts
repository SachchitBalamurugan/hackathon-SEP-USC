// The API origin is fixed at build time (WXT_API_BASE in extension/.env), never hardcoded, so
// local and deployed builds don't need hand edits.
export const API_BASE = (import.meta.env.WXT_API_BASE as string | undefined)?.replace(/\/$/, "") || "http://localhost:3000";

export const apiKey = storage.defineItem<string | null>("local:apiKey", { fallback: null });

export type Settings = { tracking_enabled: boolean; paused_hosts: string[]; auto_check_hosts: string[] };
export const settingsCache = storage.defineItem<Settings>("local:settings", {
  fallback: { tracking_enabled: false, paused_hosts: [], auto_check_hosts: [] },
});

/** Hosts where the dock starts collapsed to a small tab instead of hidden entirely. */
export const dockHidden = storage.defineItem<string[]>("local:dockHiddenHosts", { fallback: [] });

export const syncTimes = storage.defineItem<Record<string, number>>("local:syncTimes", { fallback: {} });
