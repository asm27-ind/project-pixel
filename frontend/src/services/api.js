import axios from "axios";


const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, 
  withCredentials: true, 
});

API.defaults.headers.common["Bypass-Tunnel-Reminder"] = "true";
API.defaults.headers.post["Content-Type"] = "application/json";


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
