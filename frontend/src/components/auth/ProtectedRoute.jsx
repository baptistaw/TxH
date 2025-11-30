// src/components/auth/ProtectedRoute.jsx - Integración con Clerk
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageSpinner } from '@/components/ui/Spinner';

export default function ProtectedRoute({ children, requiredRoles = [] }) {
  const { user, loading, hasAnyRole, isSignedIn, hasOrganization, tokenReady } = useAuth();
  const router = useRouter();

  // Estado de carga completo:
  // - loading: auth context aún cargando
  // - isSignedIn && !tokenReady: usuario autenticado pero token sin org_id
  // - isSignedIn && !hasOrganization: esperando activación de org
  const isFullyLoaded = !loading && (isSignedIn ? (tokenReady && hasOrganization) : true);

  useEffect(() => {
    // Solo redirigir cuando TODO está cargado
    if (!isFullyLoaded) return;

    // Si no está autenticado en Clerk, redirigir a sign-in
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }

    // Si requiere roles específicos y no los tiene, redirigir
    if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
      router.push('/unauthorized');
      return;
    }
  }, [isFullyLoaded, isSignedIn, hasAnyRole, requiredRoles, router]);

  // Mostrar spinner mientras cualquier cosa esté cargando
  if (!isFullyLoaded) {
    return <PageSpinner />;
  }

  // Si no está autenticado, no renderizar nada (se redirige)
  if (!isSignedIn) {
    return null;
  }

  // Si requiere roles y no los tiene, no renderizar
  if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    return null;
  }

  // Renderizar children - ya tenemos org y token listos
  return <>{children}</>;
}
