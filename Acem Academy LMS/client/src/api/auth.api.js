import axiosInstance from "./axios";

export const loginApi = (data) =>
  axiosInstance.post("/auth/login", data);

export const registerApi = (data) =>
  axiosInstance.post("/auth/register", data);

export const logoutApi = () =>
  axiosInstance.post("/auth/logout");

export const profileApi = () =>
  axiosInstance.get("/auth/profile");

export const refreshTokenApi = () =>
  axiosInstance.post("/auth/refresh-token");

export const changePasswordApi = (data) =>
  axiosInstance.patch("/auth/change-password", data);

export const updateProfileApi = (data) =>
  axiosInstance.patch("/auth/profile", data);

export const verifyEmailApi = (data) =>
  axiosInstance.post("/auth/verify-email", data);

export const resendVerificationApi = (data) =>
  axiosInstance.post("/auth/resend-verification", data);

export const forgotPasswordApi = (data) =>
  axiosInstance.post("/auth/forgot-password", data);

export const resetPasswordApi = (data) =>
  axiosInstance.post("/auth/reset-password", data);