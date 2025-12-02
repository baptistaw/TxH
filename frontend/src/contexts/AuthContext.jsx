// src/contexts/AuthContext.jsx - Integración simplificada con Clerk
// Flujo: Superusuario crea org y usuarios en Clerk -> Usuario se logea con org activa
'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useUser, useAuth as useClerkAuth, useClerk, useOrganization } from '@clerk/nextjs';
import { authApi, initializeAuth } from '@/lib/api';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  // Hooks de Clerk
  const { user: clerkUser, isLoaded: isClerkLoaded, isSignedIn } = useUser();
  const { getToken } = useClerkAuth();
  const { signOut } = useClerk();
  const { organization: activeOrg, isLoaded: orgLoaded } = useOrganization();

  // Debug AuthProvider
  console.log('AuthProvider:', {
    isClerkLoaded,
    orgLoaded,
    isSignedIn,
    hasActiveOrg: !!activeOrg,
    activeOrgId: activeOrg?.id,
    activeOrgName: activeOrg?.name
  });

  // Estado local para datos de BD
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [synced, setSynced] = useState(false);
  const [apiReady, setApiReady] = useState(false);

  // Ref para evitar sincronizaciones duplicadas y re-renders innecesarios
  const syncInProgress = useRef(false);
  const lastOrgId = useRef(null);

  // Inicializar API con función de obtención de token de Clerk
  // Solo re-inicializar cuando cambia la organización
  useEffect(() => {
    if (getToken && activeOrg) {
      // Solo re-inicializar si cambió la organización
      if (lastOrgId.current === activeOrg.id && apiReady) {
        return;
      }
      lastOrgId.current = activeOrg.id;

      // Wrapper que obtiene token con org claims
      const getTokenWithOrg = async () => {
        // Usar skipCache solo cuando realmente necesitamos un token fresco
        const token = await getToken();

        // Debug solo en desarrollo
        if (process.env.NODE_ENV === 'development' && token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (!payload.org_id) {
              console.warn('Token does not contain org_id! Check Clerk Dashboard > Sessions');
            }
          } catch (e) {
            // Silently ignore parse errors
          }
        }

        return token;
      };
      initializeAuth(getTokenWithOrg);
      setApiReady(true);
    } else if (!activeOrg) {
      lastOrgId.current = null;
      setApiReady(false);
    }
  }, [getToken, activeOrg, apiReady]);

  // Sincronizar usuario de Clerk con BD local (solo cuando hay org activa)
  const syncUserWithDB = useCallback(async () => {
    if (!isSignedIn || !clerkUser || !activeOrg || !apiReady) {
      // Solo limpiar dbUser si realmente no hay sesión
      if (!isSignedIn) {
        setDbUser(null);
      }
      setLoading(false);
      return;
    }

    // Evitar sincronizaciones duplicadas
    if (syncInProgress.current) {
      return;
    }

    // Si ya está sincronizado y la org no cambió, no re-sincronizar
    if (synced && dbUser && lastOrgId.current === activeOrg.id) {
      setLoading(false);
      return;
    }

    syncInProgress.current = true;

    try {
      // Obtener datos del usuario desde nuestra BD
      const response = await authApi.me();

      if (response.user && !response.user.isNewUser) {
        // Usuario existe y está vinculado
        setDbUser(response.user);
        setSynced(true);
      } else {
        // Usuario en Clerk pero no vinculado en BD - intentar sincronizar
        try {
          const syncResponse = await authApi.sync();

          if (syncResponse.user) {
            // Sync exitoso - usuario vinculado
            setDbUser(syncResponse.user);
            setSynced(true);
          }
        } catch (syncError) {
          console.error('syncUserWithDB: Sync error:', syncError);
          // Usuario no existe en BD - mantener dbUser anterior si existe
          // para evitar flash a VIEWER
          if (!dbUser) {
            setDbUser(null);
          }
        }
      }
    } catch (error) {
      console.error('syncUserWithDB: Error getting user:', error);
      // No limpiar dbUser en error para mantener el rol anterior
      // Esto evita el flash a VIEWER cuando hay errores de red temporales
    } finally {
      syncInProgress.current = false;
      setLoading(false);
    }
  }, [isSignedIn, clerkUser, activeOrg, apiReady, synced, dbUser]);

  // Efecto para sincronizar cuando Clerk, org y API están listos
  // Solo sincronizar una vez por cambio de organización
  useEffect(() => {
    if (!isClerkLoaded || !orgLoaded) {
      return;
    }

    if (!isSignedIn) {
      setDbUser(null);
      setSynced(false);
      setLoading(false);
      return;
    }

    if (!activeOrg) {
      // Usuario logueado pero sin org seleccionada
      setLoading(false);
      return;
    }

    if (apiReady) {
      syncUserWithDB();
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

  // Estado de carga:
  // - Esperar que Clerk y org estén cargados
  // - Si hay usuario sincronizado, ya no mostrar loading
  // - Solo mostrar loading inicial, no en re-sincronizaciones
  const isLoading = !isClerkLoaded || !orgLoaded || (loading && !synced);

  // Memoizar el valor del contexto para evitar re-renders innecesarios
  const value = useMemo(() => ({
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
  }), [
    user,
    isLoading,
    isSignedIn,
    synced,
    logout,
    isAuthenticated,
    hasRole,
    hasAnyRole,
    getAuthToken,
    syncUserWithDB,
    hasOrganization,
    organizationId,
    organizationName,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}
