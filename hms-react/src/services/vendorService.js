// hms-react/src/services/vendorService.js
import API from '../utils/api';

const vendorService = {
  getVendors: (params) => API.get('/vendors', { params }),
  getVendor: (id) => API.get(`/vendors/${id}`),
  createVendor: (data) => API.post('/vendors', data),
  updateVendor: (id, data) => API.put(`/vendors/${id}`, data),
  deleteVendor: (id) => API.delete(`/vendors/${id}`),
  getActiveVendors: () => API.get('/vendors/list/active'),
  getVendorStats: () => API.get('/vendors/stats/summary'),
};

export default vendorService;