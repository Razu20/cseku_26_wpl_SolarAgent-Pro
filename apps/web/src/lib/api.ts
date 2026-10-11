const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

type ApiOptions = { method?: string; headers?: Record<string, string>; body?: string };

export async function api<T>(path: string, options?: ApiOptions): Promise<T> {
  const token = localStorage.getItem('solaragent.token');
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || `Request failed (${response.status})`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export { API_BASE };
