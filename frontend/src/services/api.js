import axios from 'axios';

const API = axios.create({
  baseURL: 'https://pixel-backend-api.onrender.com/api/v1', 
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default API;

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("pixel_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default API;
