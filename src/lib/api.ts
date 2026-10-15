const API_BASE = '/api/v1';

type ApiOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

export async function api<T>(path: string, options?: ApiOptions): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('solaragent.token') : null;
  let response: Awaited<ReturnType<typeof fetch>>;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: AbortSignal.timeout(30_000),
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers || {}),
      },
    });
  } catch {
    throw new Error('Unable to reach the SolarAgent API.');
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string; message?: string } | null;
    if (response.status === 401) {
      localStorage.removeItem('solaragent.token');
      localStorage.removeItem('solaragent.role');
      localStorage.removeItem('solaragent.user');
    }
    const details = typeof payload?.error === 'object' && payload?.error ? Object.values((payload.error as any).fieldErrors || {}).flat().join(' ') : payload?.error;
    throw new Error(payload?.message || String(details || `Request failed (${response.status})`));
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export { API_BASE };


