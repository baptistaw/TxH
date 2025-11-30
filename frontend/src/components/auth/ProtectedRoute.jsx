// src/components/auth/ProtectedRoute.jsx - Versión simplificada
// Usuarios ya vienen con org activa desde Clerk (creados por superusuario)
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageSpinner } from '@/components/ui/Spinner';

export default function ProtectedRoute({ children, requiredRoles = [] }) {
  const { loading, hasAnyRole, isSignedIn, hasOrganization } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Solo redirigir cuando auth está cargado
    if (loading) return;

    // Si no está autenticado o no tiene org, ir a sign-in
    if (!isSignedIn || !hasOrganization) {
      router.push('/sign-in');
      return;
    }

    // Si requiere roles específicos y no los tiene
    if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
      router.push('/unauthorized');
      return;
    }
  }, [loading, isSignedIn, hasOrganization, hasAnyRole, requiredRoles, router]);

  // Mostrar spinner mientras carga
  if (loading) {
    return <PageSpinner />;
  }

  // Si no está autenticado o sin org, no renderizar (se redirige)
  if (!isSignedIn || !hasOrganization) {
    return null;
  }

  // Si requiere roles y no los tiene
  if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    return null;
  }

  return <>{children}</>;
}
