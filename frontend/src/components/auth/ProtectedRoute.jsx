// src/components/auth/ProtectedRoute.jsx
// Protege rutas que requieren autenticación
'use client';

import { useUser, useOrganization } from '@clerk/nextjs';
import { useAuth } from '@/contexts/AuthContext';
import { PageSpinner } from '@/components/ui/Spinner';
import Link from 'next/link';

export default function ProtectedRoute({ children, requiredRoles = [] }) {
  // Estado de Clerk (fuente de verdad para autenticación)
  const { isLoaded: userLoaded, isSignedIn } = useUser();
  const { organization, isLoaded: orgLoaded } = useOrganization();

  // Estado de AuthContext (para roles y datos de BD)
  const { loading: authLoading, hasAnyRole, user } = useAuth();

  // Debug
  console.log('ProtectedRoute:', {
    userLoaded,
    orgLoaded,
    isSignedIn,
    hasOrg: !!organization,
    orgId: organization?.id,
    authLoading,
    userRole: user?.role
  });

  // 1. Esperar a que Clerk cargue
  if (!userLoaded || !orgLoaded) {
    console.log('ProtectedRoute: Waiting for Clerk to load...');
    return <PageSpinner />;
  }

  // 2. Si no está autenticado en Clerk, redirigir a sign-in
  if (!isSignedIn) {
    console.log('ProtectedRoute: Not signed in, redirecting...');
    if (typeof window !== 'undefined' && window.location.pathname !== '/sign-in') {
      window.location.replace('/sign-in');
    }
    return <PageSpinner />;
  }

  // 3. Si está autenticado pero NO tiene organización activa
  // NO redirigir - mostrar mensaje para evitar loop
  if (!organization) {
    console.log('ProtectedRoute: No organization active');
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-500 px-4">
        <div className="max-w-md w-full bg-dark-600 rounded-xl p-8 text-center border border-dark-400">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Sin Organización Activa</h1>
          <p className="text-gray-400 mb-6">
            Tu cuenta no tiene una organización activa. Contacta al administrador para ser agregado a una organización.
          </p>
          <Link
            href="/sign-in"
            className="inline-block px-6 py-3 bg-surgical-600 hover:bg-surgical-700 text-white font-medium rounded-lg transition-colors"
            onClick={() => {
              // Forzar logout para limpiar sesión
              if (typeof window !== 'undefined') {
                window.Clerk?.signOut();
              }
            }}
          >
            Cerrar Sesión
          </Link>
        </div>
      </div>
    );
  }

  // 4. Usuario autenticado con org - esperar AuthContext si hay roles requeridos
  if (requiredRoles.length > 0) {
    if (authLoading) {
      console.log('ProtectedRoute: Waiting for AuthContext...');
      return <PageSpinner />;
    }

    if (!hasAnyRole(requiredRoles)) {
      console.log('ProtectedRoute: Missing required roles');
      return (
        <div className="min-h-screen flex items-center justify-center bg-dark-500 px-4">
          <div className="max-w-md w-full bg-dark-600 rounded-xl p-8 text-center border border-dark-400">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Acceso Denegado</h1>
            <p className="text-gray-400 mb-6">
              No tienes permisos para acceder a esta sección.
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-surgical-600 hover:bg-surgical-700 text-white font-medium rounded-lg transition-colors"
            >
              Volver al Dashboard
            </Link>
          </div>
        </div>
      );
    }
  }

  // 5. Todo OK - renderizar contenido
  console.log('ProtectedRoute: Rendering children');
  return <>{children}</>;
}
