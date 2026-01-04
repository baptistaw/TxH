// src/app/sign-in/[[...sign-in]]/page.jsx
// Página de login con branding dinámico
'use client';

import { SignIn, useUser, useOrganization } from '@clerk/nextjs';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useBranding } from '@/hooks/useBranding';

export default function SignInPage() {
  const { isLoaded: userLoaded, isSignedIn } = useUser();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { institutionName, logoUrl, appName } = useBranding();
  const hasRedirected = useRef(false);

  // Redirigir cuando el usuario está autenticado
  useEffect(() => {
    if (userLoaded && orgLoaded && isSignedIn && !hasRedirected.current) {
      hasRedirected.current = true;
      if (organization) {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/bootstrap';
      }
    }
  }, [userLoaded, orgLoaded, isSignedIn, organization]);

  // Mostrar loading mientras Clerk carga o si estamos redirigiendo
  if (!userLoaded || !orgLoaded || isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-500 px-4">
      <div className="w-full max-w-md">
        {/* Logo y título - Branding dinámico */}
        <div className="text-center mb-8">
          <Link href="/">
            <img
              src={logoUrl}
              alt={institutionName}
              className="w-20 h-20 mx-auto rounded-2xl object-cover shadow-glow mb-4 hover:opacity-90 transition-opacity"
            />
          </Link>
          <h1 className="text-2xl font-bold text-white mb-1">
            {institutionName}
          </h1>
          <p className="text-gray-400">
            {appName}
          </p>
        </div>

        {/* Clerk SignIn con colores de marca */}
        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'bg-dark-600 border border-dark-400 shadow-xl',
                headerTitle: 'text-white',
                headerSubtitle: 'text-gray-400',
                socialButtonsBlockButton:
                  'bg-dark-500 border-dark-400 text-white hover:bg-dark-400',
                socialButtonsBlockButtonText: 'text-white',
                dividerLine: 'bg-dark-400',
                dividerText: 'text-gray-500',
                formFieldLabel: 'text-gray-300',
                formFieldInput:
                  'bg-dark-700 border-dark-400 text-white focus:border-brand-500',
                formButtonPrimary:
                  'bg-brand-500 hover:bg-brand-600 text-white',
                footerActionLink: 'text-brand-400 hover:text-brand-300',
                identityPreviewText: 'text-white',
                identityPreviewEditButton: 'text-brand-400',
              },
            }}
          />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
