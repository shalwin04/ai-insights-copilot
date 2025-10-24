import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth endpoints
export const authApi = {
  getAuthUrl: () => api.get('/api/auth/google'),
  getCurrentUser: () => api.get('/api/auth/user'),
  logout: () => api.post('/api/auth/logout'),
};

// Drive endpoints
export const driveApi = {
  getFiles: () => api.get('/api/drive/files'),
  getFile: (fileId: string) => api.get(`/api/drive/files/${fileId}`),
  downloadFile: (fileId: string) => api.get(`/api/drive/files/${fileId}/download`, {
    responseType: 'blob',
  }),
  searchFiles: (query: string) => api.get('/api/drive/search', {
    params: { query },
  }),
};

// Ingestion endpoints
export const ingestionApi = {
  autoIngestDrive: () => api.post('/api/ingest/google-drive/auto'),
  processFile: (fileId: string, fileName: string, mimeType: string) =>
    api.post(`/api/ingest/file/${fileId}`, { fileName, mimeType }),
  getJobStatus: (jobId: string) => api.get(`/api/ingest/job/${jobId}`),
  getAllJobs: () => api.get('/api/ingest/jobs'),
};

// Explorer endpoints
export const explorerApi = {
  getDatasets: () => api.get('/api/explorer/datasets'),
  getDatasetOverview: (datasetId: string) => api.get(`/api/explorer/datasets/${datasetId}/overview`),
  generateInsights: (datasetId: string) => api.post(`/api/explorer/datasets/${datasetId}/insights`),
  generateVisualizations: (datasetId: string, query?: string) =>
    api.post(`/api/explorer/datasets/${datasetId}/visualizations`, { query }),
  getColumnDetails: (datasetId: string, columnName: string) =>
    api.get(`/api/explorer/datasets/${datasetId}/columns/${encodeURIComponent(columnName)}`),
};

// Workflow endpoints
export const workflowApi = {
  getWorkflows: () => api.get('/api/workflows'),
  getWorkflow: (id: string) => api.get(`/api/workflows/${id}`),
  createWorkflow: (data: any) => api.post('/api/workflows', data),
  updateWorkflow: (id: string, data: any) => api.put(`/api/workflows/${id}`, data),
  deleteWorkflow: (id: string) => api.delete(`/api/workflows/${id}`),
  executeWorkflow: (id: string) => api.post(`/api/workflows/${id}/execute`),
  getExecutions: (id: string, limit?: number) =>
    api.get(`/api/workflows/${id}/executions`, { params: { limit } }),
  getStats: () => api.get('/api/workflows/stats/overview'),
};

// Insights endpoints
export const insightsApi = {
  getInsights: () => api.get('/api/insights'),
  deleteInsight: (id: string) => api.delete(`/api/insights/${id}`),
};
