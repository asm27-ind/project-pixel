import axios from "axios";

// Dynamically fetch the API base URL from the environment config
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Auto-inject JWT token into outbound headers for protected routes
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
