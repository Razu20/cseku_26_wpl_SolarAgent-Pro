const productionBackendUrl = 'https://cseku-26-wpl-solar-agent-pro-backen.vercel.app';
const configuredApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? productionBackendUrl : undefined);
const isLocalApiUrl = configuredApiUrl && /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/i.test(configuredApiUrl);
const configuredApiBase = configuredApiUrl && !(import.meta.env.PROD && isLocalApiUrl)
  ? configuredApiUrl.replace(/\/+$/, '')
  : undefined;
const API_BASE = configuredApiBase
  ? (configuredApiBase.endsWith('/api/v1') ? configuredApiBase : `${configuredApiBase}/api/v1`)
  : (import.meta.env.DEV ? 'http://localhost:4000/api/v1' : '/api/v1');

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
    throw new Error('Unable to reach the SolarAgent API. Check VITE_API_URL, the backend health endpoint, and CORS configuration.');
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
