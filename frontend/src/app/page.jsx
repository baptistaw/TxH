// src/app/page.jsx - Landing Page B2B
'use client';

import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    institution: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Si el usuario ya está autenticado, redirigir al dashboard
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // Simular envío (en producción conectar con backend o servicio de email)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // En producción: enviar a backend o servicio como Resend/SendGrid
    console.log('Form submitted:', formData);

    setSubmitted(true);
    setSubmitting(false);
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // Mostrar loading mientras Clerk carga
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-dark-500 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-surgical-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-500">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-dark-500/80 backdrop-blur-lg border-b border-dark-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img
                src="/logo.jpg"
                alt="anestrasplante.org"
                className="w-10 h-10 rounded-lg object-cover"
              />
              <span className="text-xl font-bold text-white">
                anestras<span className="text-surgical-400">plante</span>.org
              </span>
            </div>
            <Link
              href="/sign-in"
              className="px-4 py-2 bg-surgical-500 hover:bg-surgical-600 text-white rounded-lg font-medium transition-colors"
            >
              Iniciar sesion
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
                Sistema de Registro{' '}
                <span className="text-surgical-400">Anestesiologico</span>
              </h1>
              <p className="text-xl text-gray-400 mb-8 max-w-2xl">
                Plataforma especializada para el registro y seguimiento de
                procedimientos anestesiologicos en trasplante hepatico.
              </p>
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 px-8 py-4 bg-surgical-500 hover:bg-surgical-600 text-white rounded-xl font-semibold text-lg transition-all hover:shadow-lg hover:shadow-surgical-500/25"
              >
                Acceder al Sistema
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-surgical-500/20 blur-3xl rounded-full"></div>
                <img
                  src="/logo.jpg"
                  alt="Logo"
                  className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl object-cover shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact" className="py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-dark-600 rounded-2xl p-8 border border-dark-400">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                Contacto para Instituciones
              </h2>
              <p className="text-gray-400">
                Si tu institucion esta interesada en implementar el sistema,
                completa el formulario y nos pondremos en contacto.
              </p>
            </div>

            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Mensaje enviado</h3>
                <p className="text-gray-400">
                  Gracias por tu interes. Nos pondremos en contacto a la brevedad.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-dark-500 border border-dark-400 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-surgical-500 transition-colors"
                    placeholder="Dr. Juan Perez"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email institucional
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-dark-500 border border-dark-400 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-surgical-500 transition-colors"
                    placeholder="jperez@hospital.edu"
                  />
                </div>

                <div>
                  <label htmlFor="institution" className="block text-sm font-medium text-gray-300 mb-2">
                    Institucion
                  </label>
                  <input
                    type="text"
                    id="institution"
                    name="institution"
                    required
                    value={formData.institution}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-dark-500 border border-dark-400 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-surgical-500 transition-colors"
                    placeholder="Hospital Universitario"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                    Mensaje (opcional)
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-dark-500 border border-dark-400 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-surgical-500 transition-colors resize-none"
                    placeholder="Cuentanos sobre tu programa de trasplantes..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-3 bg-surgical-500 hover:bg-surgical-600 disabled:bg-surgical-500/50 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar solicitud
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-dark-400">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.jpg"
                alt="anestrasplante.org"
                className="w-8 h-8 rounded-lg object-cover"
              />
              <span className="text-gray-400">
                anestras<span className="text-surgical-400">plante</span>.org
              </span>
            </div>
            <p className="text-gray-500 text-sm">
              contacto@anestrasplante.org
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
