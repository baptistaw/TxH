// src/components/auth/ProtectedRoute.jsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageSpinner } from '@/components/ui/Spinner';

export default function ProtectedRoute({ children, requiredRoles = [] }) {
  const { user, loading, isAuthenticated, hasAnyRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Si no está autenticado, redirigir a login
      if (!isAuthenticated()) {
        router.push('/login');
        return;
      }

      // Si requiere roles específicos y no los tiene, redirigir
      if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [user, loading, isAuthenticated, hasAnyRole, requiredRoles, router]);

  // Mostrar spinner mientras carga
  if (loading) {
    return <PageSpinner />;
  }

  // Si no está autenticado, no renderizar nada (se redirige)
  if (!isAuthenticated()) {
    return null;
  }

  // Si requiere roles y no los tiene, no renderizar
  if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    return null;
  }

  // Renderizar children
  return <>{children}</>;
}
