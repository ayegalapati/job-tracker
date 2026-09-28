const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details = data.details ? Object.values(data.details).join('. ') : '';
    throw new Error(details || data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const listApplications = () => request('/applications');
export const getStats = () => request('/stats');
export const createApplication = (body) => request('/applications', { method: 'POST', body: JSON.stringify(body) });
export const updateApplication = (id, body) => request(`/applications/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
export const deleteApplication = (id) => request(`/applications/${id}`, { method: 'DELETE' });
