import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import * as authService from "@/services/auth.service";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      setLoading(true);

      const response = await authService.getProfile();

      setUser(response.data);

      return response.data;
    } catch (error) {
      setUser(null);

      return null;
    } finally {
      setLoading(false);
    }
  };

  const login = async (formData) => {
    await authService.login(formData);

    return await refreshProfile();
  };

  const register = async (formData) => {
    return await authService.register(formData);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,

      login,
      register,
      logout,

      refreshProfile,
    }),
    [user, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);