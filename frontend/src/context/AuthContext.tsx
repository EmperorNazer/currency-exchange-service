import React, { createContext, useContext, useState, useEffect } from 'react';
import { EMAIL_STORAGE_KEY, TOKEN_STORAGE_KEY, apiClient } from '../api/client';

interface AuthContextType {
  token: string | null;
  email: string | null;
  isAuthenticated: boolean;
  loginSuccess: (token: string, email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [email, setEmail] = useState<string | null>(() => localStorage.getItem(EMAIL_STORAGE_KEY));

  const loginSuccess = (newToken: string, userEmail: string) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    localStorage.setItem(EMAIL_STORAGE_KEY, userEmail);
    setToken(newToken);
    setEmail(userEmail);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(EMAIL_STORAGE_KEY);
    setToken(null);
    setEmail(null);
  };

  // Автоматический выход при ответе 401 (если токен протух или невалиден)
  useEffect(() => {
    const interceptor = apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && token) {
          logout();
        }
        return Promise.reject(error);
      },
    );
    return () => apiClient.interceptors.response.eject(interceptor);
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        token,
        email,
        isAuthenticated: Boolean(token),
        loginSuccess,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
}