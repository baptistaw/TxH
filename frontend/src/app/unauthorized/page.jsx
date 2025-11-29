'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Acceso Denegado</h2>
          <p className="mt-2 text-sm text-gray-600">
            No tienes permiso para acceder a esta página.
          </p>
          {user && (
            <div className="mt-4 p-4 bg-gray-100 rounded text-left text-xs">
              <p><strong>Usuario:</strong> {user.email}</p>
              <p><strong>Rol:</strong> {user.role}</p>
              <p><strong>Especialidad:</strong> {user.specialty}</p>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <button
            onClick={() => router.back()}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Volver
          </button>
          <button
            onClick={() => router.push('/cases')}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Ir a Casos
          </button>
        </div>
      </div>
    </div>
  );
}
