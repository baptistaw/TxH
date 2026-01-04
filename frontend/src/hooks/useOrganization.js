// src/hooks/useOrganization.js - Hook para obtener datos de la organización
'use client';

import { useOrganization as useClerkOrganization } from '@clerk/nextjs';
import { useBranding } from './useBranding';

/**
 * Hook personalizado para obtener datos de la organización actual
 * Integra branding dinámico (variables de entorno) con datos de Clerk
 *
 * Prioridad para nombre/logo:
 * 1. Variables de entorno (B2B single-tenant)
 * 2. Datos de Clerk Organization (multi-tenant/desarrollo)
 * 3. Valores por defecto
 */
export function useOrganization() {
  const { organization, membership, isLoaded: clerkLoaded } = useClerkOrganization();
  const { institutionName, logoUrl, appName, primaryColor, isLoaded: brandingLoaded } = useBranding();

  // Datos de la organización (branding tiene prioridad)
  const orgData = {
    // Nombre de la organización (branding > Clerk > default)
    name: institutionName,

    // Logo de la organización (branding > Clerk > default)
    logoUrl: logoUrl,

    // Nombre de la aplicación
    appName: appName,

    // Color primario de la marca
    primaryColor: primaryColor,

    // Slug de la organización (solo de Clerk)
    slug: organization?.slug || null,

    // ID de la organización (solo de Clerk)
    id: organization?.id || null,

    // Rol del usuario en la organización de Clerk
    memberRole: membership?.role || null,

    // Verificar si es admin de la organización en Clerk
    isOrgAdmin: membership?.role === 'org:admin',

    // Estado de carga
    isLoaded: clerkLoaded && brandingLoaded,

    // Tiene organización activa en Clerk
    hasOrganization: !!organization,
  };

  return orgData;
}

export default useOrganization;
