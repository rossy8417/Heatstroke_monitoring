import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 世帯管理
export const householdsApi = {
  search: async (query?: string) => {
    const { data } = await api.get('/api/households', { params: { q: query } });
    return data.data || [];
  },
  
  get: async (id: string) => {
    const { data } = await api.get(`/api/households/${id}`);
    return data;
  },
  
  create: async (household: any) => {
    const { data } = await api.post('/api/households', household);
    return data;
  },
  
  update: async (id: string, updates: any) => {
    const { data } = await api.put(`/api/households/${id}`, updates);
    return data;
  },
  
  delete: async (id: string) => {
    const { data } = await api.delete(`/api/households/${id}`);
    return data;
  },
};

// アラート管理
export const alertsApi = {
  getToday: async () => {
    const { data } = await api.get('/api/alerts/today');
    return data.data || [];
  },
  
  getSummary: async () => {
    const { data } = await api.get('/api/alerts/today');
    return data.summary || {};
  },
  
  getDetail: async (id: string) => {
    const { data } = await api.get(`/api/alerts/${id}`);
    return data;
  },
  
  updateStatus: async (id: string, status: string) => {
    const { data } = await api.put(`/api/alerts/${id}/status`, { status });
    return data;
  },
  
  retry: async (alertId: string) => {
    const { data } = await api.post('/api/alerts/retry', { alert_id: alertId });
    return data;
  },
};

// 通話履歴
export const callsApi = {
  getByAlert: async (alertId: string) => {
    const { data } = await api.get(`/api/calls/alert/${alertId}`);
    return data;
  },
};

// 天気情報
export const weatherApi = {
  getCurrent: async (meshCode?: string) => {
    const { data } = await api.get('/api/weather', { params: { grid: meshCode || '5339-24' } });
    return data;
  },
};

export default api;