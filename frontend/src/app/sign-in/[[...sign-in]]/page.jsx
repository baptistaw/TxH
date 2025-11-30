// src/app/sign-in/[[...sign-in]]/page.jsx
import { SignIn } from '@clerk/nextjs';

// Logo de la organización desde Clerk
const ORG_LOGO_URL = '/logo.jpg';
const ORG_NAME = 'Programa Nacional Trasplante Hepático Uruguay';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-500 px-4">
      <div className="w-full max-w-md">
        {/* Logo y título de la organización */}
        <div className="text-center mb-8">
          <img
            src={ORG_LOGO_URL}
            alt={ORG_NAME}
            className="w-24 h-24 mx-auto rounded-2xl object-cover shadow-glow mb-4"
          />
          <h1 className="text-2xl font-bold text-surgical-400 mb-2">
            {ORG_NAME}
          </h1>
          <p className="text-gray-400">
            Sistema de Registro Anestesiológico
          </p>
        </div>

        {/* Clerk SignIn Component */}
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
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Hospital de Clínicas - Universidad de la República</p>
          <p className="mt-1">Montevideo, Uruguay</p>
        </div>
      </div>
    </div>
  );
}
