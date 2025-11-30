// src/contexts/AuthContext.jsx - Integración con Clerk
'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useUser, useAuth as useClerkAuth, useClerk } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import { authApi, initializeAuth } from '@/lib/api';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  // Hooks de Clerk
  const { user: clerkUser, isLoaded: isClerkLoaded, isSignedIn } = useUser();
  const { getToken } = useClerkAuth();
  const { signOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();

  // Estado local para datos de BD
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [synced, setSynced] = useState(false);
  const [bootstrapStatus, setBootstrapStatus] = useState(null);

  // Inicializar API con función de obtención de token de Clerk
  useEffect(() => {
    if (getToken) {
      initializeAuth(getToken);
    }
  }, [getToken]);

  // Sincronizar usuario de Clerk con BD local
  const syncUserWithDB = useCallback(async () => {
    if (!isSignedIn || !clerkUser) {
      setDbUser(null);
      setLoading(false);
      return;
    }

    try {
      // Obtener datos del usuario desde nuestra BD
      const response = await authApi.me();

      if (response.user && !response.user.isNewUser) {
        setDbUser(response.user);
        setSynced(true);
      } else {
        // Usuario nuevo - intentar sincronizar por email
        try {
          const syncResponse = await authApi.sync();
          if (syncResponse.user) {
            setDbUser(syncResponse.user);
            setSynced(true);
          }
        } catch (syncError) {
          // Si falla la sincronización, verificar si el bootstrap está disponible
          if (syncError.status === 404) {
            try {
              const bootstrapResponse = await authApi.getBootstrapStatus();
              setBootstrapStatus(bootstrapResponse);

              // Si el bootstrap está disponible y el usuario es elegible, redirigir
              if (bootstrapResponse.bootstrapAvailable && bootstrapResponse.isEligible) {
                if (pathname !== '/bootstrap') {
                  router.push('/bootstrap');
                }
              }
            } catch (bootstrapError) {
              console.error('Error checking bootstrap status:', bootstrapError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error syncing user:', error);
      // Usuario autenticado en Clerk pero no en BD
      setDbUser(null);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, clerkUser, pathname, router]);

  // Efecto para sincronizar cuando Clerk carga
  useEffect(() => {
    if (isClerkLoaded) {
      if (isSignedIn) {
        syncUserWithDB();
      } else {
        setDbUser(null);
        setLoading(false);
      }
    }
  }, [isClerkLoaded, isSignedIn, syncUserWithDB]);

  // Usuario combinado (Clerk + BD)
  const user = dbUser
    ? {
        ...dbUser,
        clerkId: clerkUser?.id,
        imageUrl: clerkUser?.imageUrl,
      }
    : isSignedIn
      ? {
          clerkId: clerkUser?.id,
          email: clerkUser?.primaryEmailAddress?.emailAddress,
          name: clerkUser?.fullName || clerkUser?.firstName,
          imageUrl: clerkUser?.imageUrl,
          role: 'VIEWER', // Rol por defecto para usuarios no registrados
          isNewUser: true,
        }
      : null;

  // Logout - usar Clerk
  const logout = async () => {
    setDbUser(null);
    setSynced(false);
    await signOut();
  };

  // Verificar si está autenticado
  const isAuthenticated = useCallback(() => {
    return isSignedIn && !!user;
  }, [isSignedIn, user]);

  // Verificar rol
  const hasRole = useCallback(
    (role) => {
      return user?.role === role;
    },
    [user]
  );

  // Verificar si tiene alguno de los roles
  const hasAnyRole = useCallback(
    (roles) => {
      return roles.includes(user?.role);
    },
    [user]
  );

  // Actualizar datos del usuario local
  const updateUser = (userData) => {
    setDbUser((prev) => ({ ...prev, ...userData }));
  };

  // Función para obtener token de Clerk (para API calls)
  const getAuthToken = useCallback(async () => {
    if (!isSignedIn) return null;
    return await getToken();
  }, [isSignedIn, getToken]);

  const value = {
    user,
    loading: !isClerkLoaded || loading,
    isSignedIn,
    synced,
    bootstrapStatus,
    logout,
    isAuthenticated,
    hasRole,
    hasAnyRole,
    updateUser,
    getAuthToken,
    syncUserWithDB,
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
