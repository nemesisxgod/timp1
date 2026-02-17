import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" }
});
let authErrorHandled = false;
let isRefreshing = false;
let refreshPromise = null;

api.interceptors.request.use((config) => {
  if (window.location.pathname === "/login") {
    authErrorHandled = false;
  }
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) {
      error.userMessage = "Сервер временно недоступен. Повторите попытку позже.";
      sessionStorage.setItem("global_error_message", error.userMessage);
      window.dispatchEvent(new Event("global-error"));
    }

    const originalRequest = error.config;
    const isAuthEndpoint = originalRequest?.url?.includes("/auth/login") || originalRequest?.url?.includes("/auth/register");

    if (error.response?.status === 401 && !isAuthEndpoint && !originalRequest?._retry) { // ловим 401
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        originalRequest._retry = true;
        try {
          if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = api.post("/auth/refresh", null, {  // шлем пост с рефреш токеном
              headers: { Authorization: `Bearer ${refreshToken}` }
            });
          }
          const refreshResponse = await refreshPromise;
          const newAccessToken = refreshResponse.data?.access_token; // сейвим новый акцес токен
          if (newAccessToken) {
            localStorage.setItem("access_token", newAccessToken);
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest); // повторяем автоматически
          }
        } catch (_refreshError) {

        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      }
    }

    if (error.response?.status === 401 || error.response?.status === 403) {
      if (authErrorHandled) {
        return Promise.reject(error);
      }
      authErrorHandled = true;
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      sessionStorage.setItem("auth_error_message", "Сессия истекла или доступ запрещен. Выполните вход снова.");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login?auth=required";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
