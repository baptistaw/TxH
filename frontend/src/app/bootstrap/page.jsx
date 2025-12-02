// src/app/bootstrap/page.jsx - Página de bootstrap para crear primer ADMIN
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useOrganizationList } from '@clerk/nextjs';
import { authApi } from '@/lib/api';
import { useOrganization } from '@/hooks/useOrganization';

// Valores deben coincidir con enum Specialty en schema.prisma
const SPECIALTIES = [
  { value: 'ANESTESIOLOGO', label: 'Anestesiólogo' },
  { value: 'CIRUJANO', label: 'Cirujano' },
  { value: 'INTENSIVISTA', label: 'Intensivista' },
  { value: 'HEPATOLOGO', label: 'Hepatólogo' },
  { value: 'COORDINADORA', label: 'Coordinador/a' },
  { value: 'OTRO', label: 'Otro' },
];

export default function BootstrapPage() {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const { userMemberships, setActive, isLoaded: orgListLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const { name: orgName, logoUrl: orgLogoUrl, memberRole, isLoaded: orgLoaded, hasOrganization, id: currentOrgId } = useOrganization();

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [activatingOrg, setActivatingOrg] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    specialty: 'ANESTESIOLOGO',
  });

  // Activar automáticamente la primera organización si el usuario tiene una pero no está activa
  useEffect(() => {
    async function activateFirstOrganization() {
      if (!orgListLoaded || !userLoaded || activatingOrg) return;

      // Si ya tiene organización activa, no hacer nada
      if (hasOrganization && currentOrgId) return;

      // Verificar si tiene membresías
      const memberships = userMemberships?.data || [];
      if (memberships.length > 0) {
        const firstOrg = memberships[0].organization;
        console.log('Activating organization:', firstOrg.name);
        setActivatingOrg(true);

        try {
          await setActive({ organization: firstOrg.id });
          // La página se recargará automáticamente con la organización activa
        } catch (err) {
          console.error('Error activating organization:', err);
          setActivatingOrg(false);
        }
      }
    }

    activateFirstOrganization();
  }, [orgListLoaded, userLoaded, hasOrganization, currentOrgId, userMemberships, setActive, activatingOrg]);

  // Verificar estado del bootstrap al cargar
  useEffect(() => {
    async function checkBootstrapStatus() {
      if (!userLoaded || !orgLoaded || activatingOrg) return;

      // Si no tiene organización activa, esperar a que se active
      if (!hasOrganization) {
        setLoading(true);
        return;
      }

      try {
        const response = await authApi.getBootstrapStatus();
        setStatus(response);

        // Si el bootstrap no está disponible, redirigir
        if (!response.bootstrapAvailable) {
          router.push('/dashboard');
          return;
        }

        // Pre-llenar nombre del usuario de Clerk
        if (user?.fullName) {
          setFormData((prev) => ({ ...prev, name: user.fullName }));
        }
      } catch (err) {
        console.error('Error checking bootstrap status:', err);
        setError('Error al verificar el estado del sistema');
      } finally {
        setLoading(false);
      }
    }

    checkBootstrapStatus();
  }, [userLoaded, orgLoaded, user, router, hasOrganization, activatingOrg]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await authApi.bootstrap(formData);
      // Redirigir al dashboard después del bootstrap exitoso
      router.push('/dashboard');
    } catch (err) {
      console.error('Bootstrap error:', err);
      setError(err.data?.message || err.message || 'Error al crear el administrador');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading || !userLoaded || !orgLoaded) {
    return (
      <div className="min-h-screen bg-dark-700 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-surgical-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Verificando estado del sistema...</p>
        </div>
      </div>
    );
  }

  // No elegible (no es org:admin en Clerk)
  if (status && !status.isEligible) {
    return (
      <div className="min-h-screen bg-dark-700 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-dark-600 rounded-xl p-8 text-center border border-dark-400">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Acceso Denegado</h1>
          <p className="text-gray-400 mb-6">
            Solo los administradores de la organización en Clerk pueden inicializar el sistema.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Tu rol actual en Clerk: <span className="text-yellow-400">{memberRole || 'Sin organización'}</span>
          </p>
          <p className="text-sm text-gray-500">
            Contacta al administrador de tu organización en Clerk para que te asigne el rol <code className="bg-dark-500 px-2 py-1 rounded">org:admin</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-dark-600 rounded-xl p-8 border border-dark-400">
        {/* Logo y nombre de la organización */}
        <div className="text-center mb-8">
          <img
            src={orgLogoUrl}
            alt={orgName}
            className="w-20 h-20 rounded-xl object-cover mx-auto mb-4 shadow-glow"
          />
          <h1 className="text-2xl font-bold text-white mb-2">{orgName}</h1>
          <p className="text-gray-400">Configuración Inicial del Sistema</p>
        </div>

        {/* Indicador de estado */}
        <div className="bg-surgical-500/10 border border-surgical-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-surgical-500/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-surgical-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-surgical-400">Eres administrador en Clerk</p>
              <p className="text-xs text-gray-500">Puedes crear el primer administrador del sistema</p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre completo
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-3 bg-dark-500 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
              placeholder="Dr. Juan Pérez"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Especialidad
            </label>
            <select
              value={formData.specialty}
              onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
              className="w-full px-4 py-3 bg-dark-500 border border-dark-400 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
            >
              {SPECIALTIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !formData.name}
            className="w-full py-3 px-4 bg-surgical-600 hover:bg-surgical-700 disabled:bg-dark-500 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Creando administrador...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Inicializar Sistema
              </>
            )}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-6">
          Email: {user?.primaryEmailAddress?.emailAddress}
        </p>
      </div>
    </div>
  );
}
