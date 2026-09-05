/**
 * Centralized API Client
 * Manages Authorization Bearer token attachment, JSON payload serialization,
 * envelope unwrapping ({ success, data, error }), and centralized error handling.
 */

export class ApiError extends Error {
  constructor(message, code = 'API_ERROR', status = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const getToken = () => localStorage.getItem('sahkar_admin_token');
export const setToken = (token) => localStorage.setItem('sahkar_admin_token', token);
export const removeToken = () => localStorage.removeItem('sahkar_admin_token');

export const getStoredAdmin = () => {
  const admin = localStorage.getItem('sahkar_admin_user');
  if (!admin) return null;
  try {
    return JSON.parse(admin);
  } catch {
    return null;
  }
};

export const setStoredAdmin = (admin) => {
  localStorage.setItem('sahkar_admin_user', JSON.stringify(admin));
};

export const removeStoredAdmin = () => {
  localStorage.removeItem('sahkar_admin_user');
};

export async function request(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    let json;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      json = await res.json();
    } else {
      const text = await res.text();
      json = { success: res.ok, data: text };
    }

    if (!res.ok) {
      if (res.status === 401 && !url.includes('/auth/admin/login')) {
        removeToken();
        removeStoredAdmin();
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }

      const errorMessage = json?.error?.message || json?.message || `Request failed with status ${res.status}`;
      const errorCode = json?.error?.code || json?.code || 'REQUEST_FAILED';
      throw new ApiError(errorMessage, errorCode, res.status, json?.error);
    }

    // Backend responds with { success: true, data: ... }
    return json?.data !== undefined ? json.data : json;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Network connection failed', 'NETWORK_ERROR', 0);
  }
}

export const api = {
  get: (url, options) => request(url, { ...options, method: 'GET' }),
  post: (url, body, options) => request(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
  patch: (url, body, options) => request(url, { ...options, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: (url, options) => request(url, { ...options, method: 'DELETE' }),
};
