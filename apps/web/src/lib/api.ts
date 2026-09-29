const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

type ApiOptions = { method?: string; headers?: Record<string, string>; body?: string };

export async function api<T>(path: string, options?: ApiOptions): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) }, ...options });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || `Request failed (${response.status})`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export { API_BASE };
