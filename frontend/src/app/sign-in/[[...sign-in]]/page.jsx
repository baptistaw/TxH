// src/app/sign-in/[[...sign-in]]/page.jsx
// Página de login - usa Clerk directamente
'use client';

import { SignIn, useUser, useOrganization } from '@clerk/nextjs';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

export default function SignInPage() {
  const { isLoaded: userLoaded, isSignedIn } = useUser();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const hasRedirected = useRef(false);

  // Debug
  console.log('SignInPage:', {
    userLoaded,
    orgLoaded,
    isSignedIn,
    hasOrg: !!organization
  });

  // Redirigir a dashboard cuando el usuario está autenticado
  useEffect(() => {
    if (userLoaded && isSignedIn && !hasRedirected.current) {
      console.log('SignInPage: Already authenticated, redirecting to dashboard...');
      hasRedirected.current = true;
      window.location.href = '/dashboard';
    }
  }, [userLoaded, isSignedIn]);

  // Mostrar loading mientras Clerk carga o si estamos redirigiendo
  if (!userLoaded || !orgLoaded || isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-surgical-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-500 px-4">
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <Link href="/">
            <img
              src="/logo.jpg"
              alt="anestrasplante.org"
              className="w-20 h-20 mx-auto rounded-2xl object-cover shadow-glow mb-4 hover:opacity-90 transition-opacity"
            />
          </Link>
          <h1 className="text-2xl font-bold text-white mb-1">
            anestras<span className="text-surgical-400">plante</span>.org
          </h1>
          <p className="text-gray-400">
            Sistema de Registro Anestesiologico
          </p>
        </div>

        {/* Clerk SignIn */}
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
                  'bg-dark-700 border-dark-400 text-white focus:border-surgical-500',
                formButtonPrimary:
                  'bg-surgical-500 hover:bg-surgical-600 text-white',
                footerActionLink: 'text-surgical-400 hover:text-surgical-300',
                identityPreviewText: 'text-white',
                identityPreviewEditButton: 'text-surgical-400',
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
