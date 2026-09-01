const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Auth ───────────────────────────────────────────────────────────────────────
export function register(payload) {
  return request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) });
}
export function login(email, password) {
  return request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}
export function logout(token) {
  return request('/api/auth/logout', { method: 'POST', headers: authHeader(token) });
}
export function getMe(token) {
  return request('/api/auth/me', { headers: authHeader(token) });
}
export function updateMe(token, payload) {
  return request('/api/auth/me', {
    method: 'PUT', body: JSON.stringify(payload), headers: authHeader(token),
  });
}

// ── Session ────────────────────────────────────────────────────────────────────
export function createSession() {
  const token = localStorage.getItem('access_token');
  return request('/api/session', { method: 'POST', headers: authHeader(token) });
}
export function submitSite(sessionId, site) {
  return request(`/api/session/${sessionId}/site`, { method: 'POST', body: JSON.stringify(site) });
}
export function submitLoad(sessionId, load) {
  return request(`/api/session/${sessionId}/load`, { method: 'POST', body: JSON.stringify(load) });
}
export function sendChat(sessionId, message) {
  return request(`/api/session/${sessionId}/chat`, {
    method: 'POST', body: JSON.stringify({ message }),
  });
}
export function getMySessions() {
  const token = localStorage.getItem('access_token');
  return request('/api/session/my', { headers: authHeader(token) });
}
export function reportUrl(sessionId) {
  return `${API_BASE}/api/session/${sessionId}/report`;
}
