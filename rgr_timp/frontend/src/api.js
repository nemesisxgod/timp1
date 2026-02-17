import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const publicApi = axios.create({
  baseURL: API_BASE_URL,
});

export const operatorApi = axios.create({
  baseURL: API_BASE_URL,
});

operatorApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("operator_access_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
