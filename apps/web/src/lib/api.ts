const configuredApiUrl = import.meta.env.VITE_API_URL;
const isLocalApiUrl = configuredApiUrl && /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/i.test(configuredApiUrl);
const API_BASE = (configuredApiUrl && !(import.meta.env.PROD && isLocalApiUrl)
  ? configuredApiUrl
  : (import.meta.env.DEV ? 'http://localhost:4000/api/v1' : '/api/v1')).replace(/\/+$/, '');

type ApiOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

export async function api<T>(path: string, options?: ApiOptions): Promise<T> {
  const token = localStorage.getItem('solaragent.token');
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers || {}),
      },
    });
  } catch {
    throw new Error('Unable to reach the SolarAgent API. Check the deployed /api route and database configuration.');
  }

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
