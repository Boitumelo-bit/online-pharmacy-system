import api from './api';

export const addressAPI = {
  // Get all addresses for current user
  getAll: () => api.get('/addresses'),
  
  // Get single address
  getById: (id) => api.get(`/addresses/${id}`),
  
  // Create new address
  create: (data) => api.post('/addresses', data),
  
  // Update address
  update: (id, data) => api.put(`/addresses/${id}`, data),
  
  // Delete address
  delete: (id) => api.delete(`/addresses/${id}`),
  
  // Set address as default
  setDefault: (id) => api.put(`/addresses/${id}/default`),
};