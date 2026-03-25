const API_BASE = process.env.REACT_APP_API_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Not authenticated');
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

const api = {
  // Auth
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),

  // Daily view (the Franklin heart)
  getDaily: (date) => request(`/api/daily/${date}`),
  generateJobs: (date) => request(`/api/daily/generate/${date}`, { method: 'POST' }),

  // Jobs
  getJobs: (params) => request(`/api/jobs?${new URLSearchParams(params)}`),
  createJob: (data) => request('/api/jobs', { method: 'POST', body: JSON.stringify(data) }),
  completeJob: (id) => request(`/api/jobs/${id}/complete`, { method: 'PATCH' }),
  deferJob: (id, data) => request(`/api/jobs/${id}/defer`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateJob: (id, data) => request(`/api/jobs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Appointments
  getAppointments: (params) => request(`/api/appointments?${new URLSearchParams(params)}`),
  createAppointment: (data) => request('/api/appointments', { method: 'POST', body: JSON.stringify(data) }),
  completeAppointment: (id, data) => request(`/api/appointments/${id}/complete`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateAppointment: (id, data) => request(`/api/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAppointment: (id) => request(`/api/appointments/${id}`, { method: 'DELETE' }),

  // Clients
  getClients: () => request('/api/clients'),
  createClient: (data) => request('/api/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id, data) => request(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Contracts
  getContracts: () => request('/api/contracts'),
  createContract: (data) => request('/api/contracts', { method: 'POST', body: JSON.stringify(data) }),
  updateContract: (id, data) => request(`/api/contracts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleContract: (id) => request(`/api/contracts/${id}/toggle`, { method: 'PATCH' }),

  // Invoices
  getInvoices: (params) => request(`/api/invoices?${new URLSearchParams(params || {})}`),
  sendInvoice: (id, data) => request(`/api/invoices/${id}/send`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateInvoice: (id, data) => request(`/api/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Users
  getUsers: () => request('/api/users'),
  createUser: (data) => request('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

export default api;
