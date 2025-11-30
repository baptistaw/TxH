// src/components/auth/ProtectedRoute.jsx - Integración con Clerk
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { PageSpinner } from '@/components/ui/Spinner';

export default function ProtectedRoute({ children, requiredRoles = [] }) {
  const { user, loading, hasAnyRole, isSignedIn } = useAuth();
  const { hasOrganization, isLoaded: orgLoaded } = useOrganization();
  const router = useRouter();

  // Estado de carga combinado
  const isLoading = loading || !orgLoaded;

  useEffect(() => {
    if (!isLoading) {
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
    }
  }, [user, isLoading, isSignedIn, hasAnyRole, requiredRoles, router]);

  // Mostrar spinner mientras carga auth o org
  if (isLoading) {
    return <PageSpinner />;
  }

  // Si no está autenticado, no renderizar nada (se redirige)
  if (!isSignedIn) {
    return null;
  }

  // Si no tiene organización activa, mostrar mensaje de espera
  // La auto-activación de org debería estar en proceso en AuthContext
  if (!hasOrganization) {
    return (
      <div className="min-h-screen bg-dark-700 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-dark-600 rounded-xl p-8 text-center border border-dark-400">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-surgical-500 mx-auto mb-6"></div>
          <h2 className="text-xl font-semibold text-white mb-4">Activando organización...</h2>
          <p className="text-gray-400 mb-4">
            Estamos configurando tu acceso al sistema. Por favor espera un momento.
          </p>
          <p className="text-sm text-gray-500">
            Si este mensaje persiste, contacta al administrador de tu organización en Clerk.
          </p>
        </div>
      </div>
    );
  }

  // Si requiere roles y no los tiene, no renderizar
  if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    return null;
  }

  // Renderizar children
  return <>{children}</>;
}
