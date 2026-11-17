import axios from "axios";
import { getErrorMessage } from "@/utils/errorHandler";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  timeout: 30000, // 30s timeout to prevent hanging forever on bad connections
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;

    // Check if error is 401, not already retried, and not an auth entry point
    const url = originalRequest?.url || "";
    const isAuthRoute =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/verify-email") ||
      url.includes("/auth/resend-verification") ||
      url.includes("/auth/forgot-password") ||
      url.includes("/auth/reset-password") ||
      url.includes("/auth/refresh-token");

    if (
      error?.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRoute
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => axiosInstance(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const baseURL =
          axiosInstance.defaults.baseURL ||
          import.meta.env.VITE_API_BASE_URL ||
          "";
        await axios.post(
          `${baseURL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );
        processQueue(null);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (error) {
          error.userMessage = getErrorMessage(error);
        }
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // Attach normalized human-readable message to error object
    if (error) {
      error.userMessage = getErrorMessage(error);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
