import * as authApi from "@/api/auth.api";

export const login = async (data) => {
  const response = await authApi.loginApi(data);
  return response.data;
};

export const register = async (data) => {
  const response = await authApi.registerApi(data);
  return response.data;
};

export const logout = async () => {
  const response = await authApi.logoutApi();
  return response.data;
};

export const getProfile = async () => {
    const response = await authApi.profileApi();
    return response.data;
};

export const changePassword = async (data) => {
  const response = await authApi.changePasswordApi(data);
  return response.data;
};

export const updateProfile = async (data) => {
  const response = await authApi.updateProfileApi(data);
  return response.data;
};