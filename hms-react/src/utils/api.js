import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('hms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      console.log("401 ERROR:", err.config?.url);
      console.log(err.response);
      //localStorage.removeItem('hms_token');
      //localStorage.removeItem('hms_user');
      //window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default API;