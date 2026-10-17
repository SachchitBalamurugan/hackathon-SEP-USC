import { API_BASE, apiKey } from "./config";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Background-only: call the StudyLens API with the paired extension key. */
export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await rawApi(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.message || data.error || `HTTP ${res.status}`);
  return data as T;
}

export async function rawApi(path: string, init: { method?: string; body?: unknown } = {}): Promise<Response> {
  const key = await apiKey.getValue();
  if (!key && path !== "/api/pair") throw new ApiError(401, "Not paired. Open the StudyLens popup to connect.");
  const res = await fetch(`${API_BASE}${path}`, {
    method: init.method ?? (init.body === undefined ? "GET" : "POST"),
    headers: { "content-type": "application/json", ...(key ? { authorization: `Bearer ${key}` } : {}) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (res.status === 401 && key) {
    // The key was revoked from the dashboard: forget it so the popup asks to pair again.
    await apiKey.setValue(null);
  }
  return res;
}
