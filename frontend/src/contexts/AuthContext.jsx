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
      // Wrapper que fuerza skipCache para obtener token con org claims actuales
      const getTokenWithOrg = async () => {
        // No usar template, los claims de org se configuran en Clerk Dashboard > Sessions
        const token = await getToken({ skipCache: true });

        // Debug: verificar que el token tiene org_id
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log('Token org_id:', payload.org_id, 'Expected:', activeOrg.id);
            if (!payload.org_id) {
              console.warn('Token does not contain org_id! Check Clerk Dashboard > Sessions > Customize session token');
            }
          } catch (e) {
            console.error('Error parsing token:', e);
          }
        }

        return token;
      };
      initializeAuth(getTokenWithOrg);
      setApiReady(true);
    } else {
      setApiReady(false);
    }
  }, [getToken, activeOrg]);

  // Sincronizar usuario de Clerk con BD local (solo cuando hay org activa)
  const syncUserWithDB = useCallback(async () => {
    if (!isSignedIn || !clerkUser || !activeOrg || !apiReady) {
      setDbUser(null);
      setLoading(false);
      return;
    }

    console.log('syncUserWithDB: Starting sync...');

    try {
      // Obtener datos del usuario desde nuestra BD
      const response = await authApi.me();
      console.log('syncUserWithDB: me() response:', response);

      if (response.user && !response.user.isNewUser) {
        // Usuario existe y está vinculado
        console.log('syncUserWithDB: User found with role:', response.user.role);
        setDbUser(response.user);
        setSynced(true);
      } else {
        // Usuario en Clerk pero no vinculado en BD - intentar sincronizar
        console.log('syncUserWithDB: User is new, attempting sync...');
        try {
          const syncResponse = await authApi.sync();
          console.log('syncUserWithDB: sync() response:', syncResponse);

          if (syncResponse.user) {
            // Sync exitoso - usuario vinculado
            console.log('syncUserWithDB: Sync successful, role:', syncResponse.user.role);
            setDbUser(syncResponse.user);
            setSynced(true);
          }
        } catch (syncError) {
          console.error('syncUserWithDB: Sync error:', syncError);
          // Usuario no existe en BD - será creado por admin
          // Mantener datos básicos de Clerk
          setDbUser(null);
        }
      }
    } catch (error) {
      console.error('syncUserWithDB: Error getting user:', error);
      setDbUser(null);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, clerkUser, activeOrg, apiReady]);

  // Efecto para sincronizar cuando Clerk, org y API están listos
  useEffect(() => {
    if (isClerkLoaded && orgLoaded) {
      if (isSignedIn && activeOrg && apiReady) {
        syncUserWithDB();
      } else if (!isSignedIn || !activeOrg) {
        setDbUser(null);
        setLoading(false);
      }
      // Si apiReady es false pero tenemos org, mantener loading=true
    }
  }, [isClerkLoaded, orgLoaded, isSignedIn, activeOrg, apiReady, syncUserWithDB]);

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

  // Estado de carga: esperar Clerk + org + sync completado
  const isLoading = !isClerkLoaded || !orgLoaded || loading;

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
