const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1').replace(/\/+$/, '');

type ApiOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

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

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string; message?: string } | null;
    if (response.status === 401) {
      localStorage.removeItem('solaragent.token');
      localStorage.removeItem('solaragent.role');
      localStorage.removeItem('solaragent.user');
    }
    throw new Error(payload?.message || payload?.error || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export { API_BASE };
