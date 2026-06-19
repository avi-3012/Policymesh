const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed: ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  getStatus: () => request('/api/status'),
  getBudget: () => request('/api/budget'),
  getPolicies: () => request('/api/policies'),
  updatePolicies: (body) =>
    request('/api/policies', { method: 'POST', body: JSON.stringify(body) }),
  getAudit: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/audit${q ? `?${q}` : ''}`);
  },
  getProviders: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/providers${q ? `?${q}` : ''}`);
  },
  getProcurements: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/procurements${q ? `?${q}` : ''}`);
  },
  getProcurement: (id) => request(`/api/procurements/${id}`),
  createStorage: (body) =>
    request('/api/procure/storage', { method: 'POST', body: JSON.stringify(body) }),
  createCompute: (body) =>
    request('/api/procure/compute', { method: 'POST', body: JSON.stringify(body) }),
  confirmProcurement: (id, body = {}) =>
    request(`/api/procurements/${id}/confirm`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getNotifications: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/notifications${q ? `?${q}` : ''}`);
  },
  setEmergencyStop: (stopped) =>
    request('/api/emergency-stop', {
      method: 'POST',
      body: JSON.stringify({ stopped }),
    }),
  getAgentStatus: () => request('/api/agent/status'),
  agentChat: (message, threadId) =>
    request('/api/agent/chat', {
      method: 'POST',
      body: JSON.stringify({ message, threadId }),
    }),
};
