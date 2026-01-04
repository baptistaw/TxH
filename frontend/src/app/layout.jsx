// src/app/layout.jsx

import { ClerkProvider } from '@clerk/nextjs';
import { esES } from '@clerk/localizations';
import { AuthProvider } from '@/contexts/AuthContext';
import BrandingProvider from '@/components/providers/BrandingProvider';
import './globals.css';

// Metadata dinámica basada en variables de entorno
const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Sistema Registro TxH';
const institutionName = process.env.NEXT_PUBLIC_INSTITUTION_NAME;

export const metadata = {
  title: institutionName ? `${appName} - ${institutionName}` : appName,
  description: 'Sistema de Registro Anestesiológico - Trasplante Hepático',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      localization={esES}
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <html lang="es">
        <body>
          <AuthProvider>
            <BrandingProvider>{children}</BrandingProvider>
          </AuthProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
