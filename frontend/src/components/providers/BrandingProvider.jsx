// src/components/providers/BrandingProvider.jsx
'use client';

import { useEffect } from 'react';
import { useBranding } from '@/hooks/useBranding';

/**
 * Provider que inyecta CSS variables de branding dinámico
 * Debe envolver la aplicación para que los colores estén disponibles globalmente
 */
export function BrandingProvider({ children }) {
  const { cssVariables, isLoaded } = useBranding();

  useEffect(() => {
    if (!isLoaded) return;

    // Inyectar CSS variables en el documento
    const root = document.documentElement;
    Object.entries(cssVariables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }, [cssVariables, isLoaded]);

  return children;
}

export default BrandingProvider;
