// src/app/layout.jsx

import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

export const metadata = {
  title: 'Sistema Registro TxH',
  description: 'Sistema de Registro Anestesiológico - Trasplante Hepático',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
