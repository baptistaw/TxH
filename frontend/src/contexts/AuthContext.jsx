// src/contexts/AuthContext.jsx - Integración simplificada con Clerk
// Flujo: Superusuario crea org y usuarios en Clerk -> Usuario se logea con org activa
'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useUser, useAuth as useClerkAuth, useClerk, useOrganization } from '@clerk/nextjs';
import { authApi, initializeAuth } from '@/lib/api';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  // Hooks de Clerk
  const { user: clerkUser, isLoaded: isClerkLoaded, isSignedIn } = useUser();
  const { getToken } = useClerkAuth();
  const { signOut } = useClerk();
  const { organization: activeOrg, isLoaded: orgLoaded } = useOrganization();

  // Estado local para datos de BD
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [synced, setSynced] = useState(false);
  const [apiReady, setApiReady] = useState(false);

  // Inicializar API con función de obtención de token de Clerk
  // Pasamos una función que siempre obtiene token fresco con org_id
  useEffect(() => {
    if (getToken && activeOrg) {
      // Wrapper que fuerza skipCache para asegurar que el token tenga org_id
      const getTokenWithOrg = async () => {
        return await getToken({ skipCache: true });
      };
      initializeAuth(getTokenWithOrg);
      setApiReady(true);
    } else {
      setApiReady(false);
    }
  }, [getToken, activeOrg]);

  // Sincronizar usuario de Clerk con BD local (solo cuando hay org activa)
  const syncUserWithDB = useCallback(async () => {
    if (!isSignedIn || !clerkUser || !activeOrg) {
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
        // Usuario en Clerk pero no en BD - intentar sincronizar
        try {
          const syncResponse = await authApi.sync();
          if (syncResponse.user) {
            setDbUser(syncResponse.user);
            setSynced(true);
          }
        } catch (syncError) {
          console.error('Error syncing user:', syncError);
          // Usuario no existe en BD - será creado por admin
          setDbUser(null);
        }
      }
    } catch (error) {
      console.error('Error getting user:', error);
      setDbUser(null);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, clerkUser, activeOrg]);

  // Efecto para sincronizar cuando Clerk y org están listos
  useEffect(() => {
    if (isClerkLoaded && orgLoaded) {
      if (isSignedIn && activeOrg) {
        syncUserWithDB();
      } else {
        setDbUser(null);
        setLoading(false);
      }
    }
  }, [isClerkLoaded, orgLoaded, isSignedIn, activeOrg, syncUserWithDB]);

  // Usuario combinado (Clerk + BD)
  const user = dbUser
    ? {
        ...dbUser,
        clerkId: clerkUser?.id,
        imageUrl: clerkUser?.imageUrl,
      }
    : isSignedIn && activeOrg
      ? {
          clerkId: clerkUser?.id,
          email: clerkUser?.primaryEmailAddress?.emailAddress,
          name: clerkUser?.fullName || clerkUser?.firstName,
          imageUrl: clerkUser?.imageUrl,
          role: 'VIEWER', // Rol por defecto hasta que admin asigne
          isNewUser: true,
        }
      : null;

  // Logout - usar Clerk
  const logout = async () => {
    setDbUser(null);
    setSynced(false);
    await signOut();
  };

  // Verificar si está autenticado (requiere org activa)
  const isAuthenticated = useCallback(() => {
    return isSignedIn && !!activeOrg && !!user;
  }, [isSignedIn, activeOrg, user]);

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

  // Estado de organización
  const hasOrganization = !!activeOrg;
  const organizationId = activeOrg?.id || null;
  const organizationName = activeOrg?.name || 'Sistema TxH';

  // Estado de carga: esperar Clerk + org + API inicializada
  // Si el usuario está autenticado con org, también esperar a que la API esté lista
  const isLoading = !isClerkLoaded || !orgLoaded || loading || (isSignedIn && activeOrg && !apiReady);

  const value = {
    user,
    loading: isLoading,
    isSignedIn,
    synced,
    logout,
    isAuthenticated,
    hasRole,
    hasAnyRole,
    updateUser,
    getAuthToken,
    syncUserWithDB,
    // Organización
    hasOrganization,
    organizationId,
    organizationName,
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
