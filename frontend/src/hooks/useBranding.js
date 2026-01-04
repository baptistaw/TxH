// src/hooks/useBranding.js - Hook para branding dinámico B2B
'use client';

import { useMemo } from 'react';
import { useOrganization as useClerkOrganization } from '@clerk/nextjs';

/**
 * Convierte un color hex a HSL para usar en CSS variables
 * @param {string} hex - Color en formato #RRGGBB
 * @returns {object} - { h, s, l } valores HSL
 */
function hexToHSL(hex) {
  // Remover # si existe
  hex = hex.replace(/^#/, '');

  // Convertir a RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Genera una paleta de colores a partir de un color base
 * @param {string} baseColor - Color hex base
 * @returns {object} - Objeto con variantes del color (50-900)
 */
function generateColorPalette(baseColor) {
  const { h, s } = hexToHSL(baseColor);

  return {
    50: `hsl(${h}, ${s}%, 95%)`,
    100: `hsl(${h}, ${s}%, 85%)`,
    200: `hsl(${h}, ${s}%, 75%)`,
    300: `hsl(${h}, ${s}%, 65%)`,
    400: `hsl(${h}, ${s}%, 55%)`,
    500: `hsl(${h}, ${s}%, 45%)`, // Color base
    600: `hsl(${h}, ${s}%, 38%)`,
    700: `hsl(${h}, ${s}%, 30%)`,
    800: `hsl(${h}, ${s}%, 22%)`,
    900: `hsl(${h}, ${s}%, 14%)`,
  };
}

/**
 * Hook para obtener configuración de branding
 * Prioridad: Variables de entorno > Datos de Clerk Organization
 *
 * Variables de entorno soportadas:
 * - NEXT_PUBLIC_INSTITUTION_NAME: Nombre de la institución
 * - NEXT_PUBLIC_INSTITUTION_LOGO_URL: URL del logo
 * - NEXT_PUBLIC_PRIMARY_COLOR: Color primario (#hex)
 * - NEXT_PUBLIC_APP_NAME: Nombre de la aplicación
 */
export function useBranding() {
  const { organization, isLoaded: clerkLoaded } = useClerkOrganization();

  const branding = useMemo(() => {
    // Valores de variables de entorno (prioridad para B2B single-tenant)
    const envInstitutionName = process.env.NEXT_PUBLIC_INSTITUTION_NAME;
    const envLogoUrl = process.env.NEXT_PUBLIC_INSTITUTION_LOGO_URL;
    const envPrimaryColor = process.env.NEXT_PUBLIC_PRIMARY_COLOR || '#00a0a0';
    const envAppName = process.env.NEXT_PUBLIC_APP_NAME || 'Sistema Registro TxH';

    // Valores de Clerk Organization (fallback para multi-tenant/desarrollo)
    const clerkName = organization?.name;
    const clerkLogoUrl = organization?.imageUrl;

    // Determinar valores finales (env tiene prioridad)
    const institutionName = envInstitutionName || clerkName || 'Sistema TxH';
    const logoUrl = envLogoUrl || clerkLogoUrl || '/logo.jpg';
    const primaryColor = envPrimaryColor;
    const appName = envAppName;

    // Generar paleta de colores
    const colorPalette = generateColorPalette(primaryColor);

    return {
      // Información de la institución
      institutionName,
      logoUrl,
      appName,

      // Colores
      primaryColor,
      colorPalette,

      // Estado
      isLoaded: clerkLoaded,

      // Helpers
      isCustomBranding: !!envInstitutionName || !!envLogoUrl,

      // CSS Variables para inyectar
      cssVariables: {
        '--brand-primary': primaryColor,
        '--brand-primary-50': colorPalette[50],
        '--brand-primary-100': colorPalette[100],
        '--brand-primary-200': colorPalette[200],
        '--brand-primary-300': colorPalette[300],
        '--brand-primary-400': colorPalette[400],
        '--brand-primary-500': colorPalette[500],
        '--brand-primary-600': colorPalette[600],
        '--brand-primary-700': colorPalette[700],
        '--brand-primary-800': colorPalette[800],
        '--brand-primary-900': colorPalette[900],
      },
    };
  }, [organization, clerkLoaded]);

  return branding;
}

export default useBranding;
