import axios from 'axios';
import { getToken, clearAuth } from './auth';
import { API_URL } from './env';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['ngrok-skip-browser-warning'] = 'true';
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      clearAuth();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const meetApi = {
  list: () => api.get('/meet'),
  create: (title) => api.post('/meet/create', { title }),
  get: (roomId) => api.get(`/meet/${roomId}`),
  join: (roomId) => api.post(`/meet/${roomId}/join`),
  remove: (roomId) => api.delete(`/meet/${roomId}`),
  getSettings: (roomId) => api.get(`/meet/${roomId}/settings`),
  updateSettings: (roomId, settings) => api.patch(`/meet/${roomId}/settings`, settings),
};

export const chatApi = {
  getMessages: (roomId, subgroupId) =>
    api.get(`/chat/${roomId}`, { params: subgroupId ? { subgroupId } : {} }),
  sendMessage: (roomId, content, subgroupId) =>
    api.post(`/chat/${roomId}`, { content, subgroupId }),
  getSubgroups: (roomId) => api.get(`/chat/${roomId}/subgroups`),
  createSubgroup: (roomId, name) => api.post(`/chat/${roomId}/subgroups`, { name }),
};

export const transcriptApi = {
  get: (roomId) => api.get(`/transcript/${roomId}`),
  save: (roomId, text, isFinal) => api.post(`/transcript/${roomId}`, { text, isFinal }),
};

export const sarvamApi = {
  ask: (question, context) => api.post('/sarvam/ask', { question, context }),
};

export const adminApi = {
  users: () => api.get('/admin/users'),
  banUser: (id, banned) => api.patch(`/admin/users/${id}/ban`, { banned }),
  meetings: () => api.get('/admin/meetings'),
  endMeeting: (id) => api.patch(`/admin/meetings/${id}/end`),
  analytics: () => api.get('/admin/analytics'),
  transcripts: () => api.get('/admin/transcripts'),
};
