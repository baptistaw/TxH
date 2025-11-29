// src/app/sign-up/[[...sign-up]]/page.jsx
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-500 px-4">
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-surgical-500 shadow-glow mb-4">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-surgical-400 mb-2">
            Sistema Registro TxH
          </h1>
          <p className="text-gray-400">
            Registro Anestesiológico - Trasplante Hepático
          </p>
        </div>

        {/* Clerk SignUp Component */}
        <div className="flex justify-center">
          <SignUp
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
