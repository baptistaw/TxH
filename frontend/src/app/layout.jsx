// src/app/layout.jsx

import { ClerkProvider } from '@clerk/nextjs';
import { esES } from '@clerk/localizations';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

export const metadata = {
  title: 'Sistema Registro TxH',
  description: 'Sistema de Registro Anestesiológico - Trasplante Hepático',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider localization={esES}>
      <html lang="es">
        <body>
          <AuthProvider>{children}</AuthProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
