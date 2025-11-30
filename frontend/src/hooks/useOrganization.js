// src/hooks/useOrganization.js - Hook para obtener datos de la organización de Clerk
'use client';

import { useOrganization as useClerkOrganization } from '@clerk/nextjs';

/**
 * Hook personalizado para obtener datos de la organización actual
 * Proporciona acceso al nombre, logo y rol del usuario en la organización
 */
export function useOrganization() {
  const { organization, membership, isLoaded } = useClerkOrganization();

  // Datos de la organización
  const orgData = {
    // Nombre de la organización
    name: organization?.name || 'Sistema TxH',

    // Logo de la organización (con fallback)
    logoUrl: organization?.imageUrl || '/logo.jpg',

    // Slug de la organización
    slug: organization?.slug || null,

    // ID de la organización
    id: organization?.id || null,

    // Rol del usuario en la organización de Clerk
    memberRole: membership?.role || null,

    // Verificar si es admin de la organización en Clerk
    isOrgAdmin: membership?.role === 'org:admin',

    // Estado de carga
    isLoaded,

    // Tiene organización activa
    hasOrganization: !!organization,
  };

  return orgData;
}

export default useOrganization;
