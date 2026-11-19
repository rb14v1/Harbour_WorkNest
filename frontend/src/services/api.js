import axios from 'axios';

const baseURL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

const http = axios.create({
  baseURL: `${baseURL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

export function errorMessage(error) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => {
      const field = item.loc?.slice(-1)[0];
      return field ? `${field}: ${item.msg}` : item.msg;
    }).join('; ');
  }
  if (error?.response) return 'The server returned an unexpected error.';
  return 'Cannot reach the server. Check that the backend is running.';
}

const get = (path, params) => http.get(path, { params }).then((r) => r.data);
const post = (path, body) => http.post(path, body).then((r) => r.data);
const patch = (path, body) => http.patch(path, body).then((r) => r.data);
const del = (path) => http.delete(path).then((r) => r.data);

export const api = {
  dashboard: () => get('/dashboard/stats'),

  listEmployees: (params) => get('/employees', params),
  getEmployee: (id) => get(`/employees/${id}`),
  createEmployee: (body) => post('/employees', body),
  updateEmployee: (id, body) => patch(`/employees/${id}`, body),

  listProjects: (params) => get('/projects', params),
  getProject: (id) => get(`/projects/${id}`),
  createProject: (body) => post('/projects', body),
  updateProject: (id, body) => patch(`/projects/${id}`, body),
  deleteProject: (id) => del(`/projects/${id}`),

  listTasks: (params) => get('/tasks', params),
  getTask: (id) => get(`/tasks/${id}`),
  createTask: (body) => post('/tasks', body),
  updateTask: (id, body) => patch(`/tasks/${id}`, body),
  deleteTask: (id) => del(`/tasks/${id}`),

  listHandovers: (params) => get('/handovers', params),
  getHandover: (id) => get(`/handovers/${id}`),
  createHandover: (body) => post('/handovers', body),
  updateHandover: (id, body) => patch(`/handovers/${id}`, body),
  submitHandover: (id) => post(`/handovers/${id}/submit`),
  acknowledgeHandover: (id) => post(`/handovers/${id}/acknowledge`),
};
