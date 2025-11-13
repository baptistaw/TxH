// src/contexts/AuthContext.jsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { getToken, getUser, setToken, setUser, removeToken } from '@/lib/auth';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Cargar usuario desde localStorage al montar
  useEffect(() => {
    const token = getToken();
    const savedUser = getUser();

    if (token && savedUser) {
      setUserState(savedUser);
    }

    setLoading(false);
  }, []);

  // Login
  const login = async (email, password) => {
    try {
      const data = await authApi.login(email, password);

      if (data.user) {
        setUserState(data.user);
        setUser(data.user);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al iniciar sesión',
      };
    }
  };

  // Logout
  const logout = () => {
    setUserState(null);
    removeToken();
    router.push('/login');
  };

  // Verificar si está autenticado
  const isAuthenticated = () => {
    return !!user && !!getToken();
  };

  // Verificar rol
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Verificar si tiene alguno de los roles
  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated,
    hasRole,
    hasAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}
