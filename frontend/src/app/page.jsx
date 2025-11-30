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
    country: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Error al enviar el mensaje');
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Error:', err);
      setError('No se pudo enviar el mensaje. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

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
      <header className="fixed top-0 left-0 right-0 z-50 bg-dark-500/90 backdrop-blur-lg border-b border-dark-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img
                src="/logo.jpg"
                alt="anestrasplante.org"
                className="w-10 h-10 rounded-lg object-cover"
              />
              <span className="text-xl font-bold text-white hidden sm:block">
                anestras<span className="text-surgical-400">plante</span>.org
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-gray-400 hover:text-white transition-colors">
                Funcionalidades
              </a>
              <a href="#benefits" className="text-gray-400 hover:text-white transition-colors">
                Beneficios
              </a>
              <a href="#contact" className="text-gray-400 hover:text-white transition-colors">
                Contacto
              </a>
            </nav>
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
      <section className="pt-28 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-block px-4 py-1 bg-surgical-500/20 rounded-full text-surgical-400 text-sm font-medium mb-6">
                Sistema especializado para equipos de trasplante
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Registro Anestesiologico para{' '}
                <span className="text-surgical-400">Trasplante Hepatico</span>
              </h1>
              <p className="text-xl text-gray-400 mb-8 max-w-2xl">
                Plataforma integral para documentar, analizar y mejorar los resultados
                de procedimientos anestesiologicos en trasplante de higado y otros
                procedimientos de alta complejidad.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-surgical-500 hover:bg-surgical-600 text-white rounded-xl font-semibold text-lg transition-all hover:shadow-lg hover:shadow-surgical-500/25"
                >
                  Acceder al Sistema
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-dark-400 hover:bg-dark-300 text-white rounded-xl font-semibold text-lg transition-colors"
                >
                  Solicitar informacion
                </a>
              </div>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-surgical-500/20 blur-3xl rounded-full"></div>
                <img
                  src="/logo.jpg"
                  alt="Logo"
                  className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-3xl object-cover shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-dark-600">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Funcionalidades Principales
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Herramientas disenadas especificamente para equipos de anestesiologia
              en programas de trasplante hepatico
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              title="Gestion de Pacientes"
              description="Registro completo de pacientes con historial medico, datos demograficos, etiologia hepatica y seguimiento longitudinal desde la evaluacion hasta el alta."
            />
            <FeatureCard
              icon={
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              title="Evaluacion Preoperatoria"
              description="Formularios estructurados para MELD, Child-Pugh, comorbilidades cardiovasculares, renales, pulmonares y valoracion anestesica completa."
            />
            <FeatureCard
              icon={
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              title="Registro Intraoperatorio"
              description="Captura detallada de tiempos quirurgicos (hepatectomia, anhepatico, reperfusion), hemodinamia, transfusiones y eventos criticos."
            />
            <FeatureCard
              icon={
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
              title="Dashboards y KPIs"
              description="Indicadores de calidad en tiempo real: tiempos quirurgicos, uso de hemocomponentes, complicaciones y resultados clinicos agregados."
            />
            <FeatureCard
              icon={
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
              title="Seguridad y Compliance"
              description="Cifrado de datos sensibles (CI, nombres), control de acceso por roles, auditoria de cambios y cumplimiento de normativas de proteccion de datos."
            />
            <FeatureCard
              icon={
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              }
              title="Reportes y Exportacion"
              description="Generacion de reportes PDF por caso, exportacion de datos para investigacion academica y auditoria institucional."
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Por que elegir nuestra plataforma
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Disenada por anestesiologos de trasplante para equipos de trasplante
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <BenefitCard
              number="01"
              title="Especializada en Trasplante"
              description="A diferencia de los HIS genericos, nuestra plataforma esta disenada especificamente para las necesidades unicas del registro anestesiologico en trasplante hepatico, incluyendo fases quirurgicas, sindrome de reperfusion, y manejo de coagulopatia."
            />
            <BenefitCard
              number="02"
              title="Mejora de Resultados"
              description="El registro sistematico permite identificar patrones, optimizar protocolos y mejorar outcomes clinicos. Instituciones usuarias reportan reduccion en tiempos quirurgicos y uso de hemocomponentes."
            />
            <BenefitCard
              number="03"
              title="Investigacion y Docencia"
              description="Base de datos estructurada para estudios retrospectivos, tesis de postgrado y publicaciones cientificas. Exportacion facil para analisis estadistico."
            />
            <BenefitCard
              number="04"
              title="Implementacion Rapida"
              description="Configuracion multi-tenant que permite a cada institucion tener su propio espacio aislado. Sin necesidad de infraestructura propia - todo en la nube con backups automaticos."
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-dark-600">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-r from-surgical-600/20 to-medical-600/20 rounded-3xl p-8 sm:p-12 border border-dark-400">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Experiencia Comprobada</h3>
              <p className="text-gray-400">Desarrollado y validado en el Programa Nacional de Trasplante Hepatico de Uruguay</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-4xl sm:text-5xl font-bold text-surgical-400 mb-2">15+</p>
                <p className="text-gray-400">Anos de experiencia en trasplante</p>
              </div>
              <div>
                <p className="text-4xl sm:text-5xl font-bold text-medical-400 mb-2">400+</p>
                <p className="text-gray-400">Trasplantes documentados</p>
              </div>
              <div>
                <p className="text-4xl sm:text-5xl font-bold text-blue-400 mb-2">100%</p>
                <p className="text-gray-400">Digital desde 2009</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact" className="py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-dark-600 rounded-2xl p-8 border border-dark-400">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                Solicita mas informacion
              </h2>
              <p className="text-gray-400">
                Completa el formulario y nuestro equipo se pondra en contacto
                para coordinar una demostracion personalizada.
              </p>
            </div>

            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Solicitud enviada</h3>
                <p className="text-gray-400">
                  Gracias por tu interes. Nos pondremos en contacto en las proximas 48 horas.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                      Nombre completo *
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
                      Email institucional *
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
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="institution" className="block text-sm font-medium text-gray-300 mb-2">
                      Institucion *
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
                    <label htmlFor="country" className="block text-sm font-medium text-gray-300 mb-2">
                      Pais *
                    </label>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      required
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-dark-500 border border-dark-400 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-surgical-500 transition-colors"
                      placeholder="Uruguay"
                    />
                  </div>
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
                    placeholder="Cuentanos sobre tu programa de trasplantes, volumen anual, necesidades especificas..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-4 bg-surgical-500 hover:bg-surgical-600 disabled:bg-surgical-500/50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      Solicitar demostracion
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  Al enviar este formulario, aceptas que procesemos tus datos para contactarte.
                  No compartimos tu informacion con terceros.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-dark-400 bg-dark-600">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img
                src="/logo.jpg"
                alt="anestrasplante.org"
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div>
                <span className="text-white font-semibold">
                  anestras<span className="text-surgical-400">plante</span>.org
                </span>
                <p className="text-gray-500 text-sm">
                  Sistema de Registro Anestesiologico
                </p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-gray-400">contacto@anestrasplante.org</p>
              <p className="text-gray-500 text-sm mt-1">
                Desarrollado en Uruguay
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-dark-500 rounded-2xl p-6 border border-dark-400 hover:border-surgical-500/50 transition-all hover:shadow-lg group">
      <div className="w-14 h-14 bg-surgical-500/20 rounded-xl flex items-center justify-center text-surgical-400 mb-4 group-hover:bg-surgical-500/30 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

function BenefitCard({ number, title, description }) {
  return (
    <div className="bg-dark-600 rounded-2xl p-6 border border-dark-400 hover:border-surgical-500/30 transition-colors">
      <span className="text-5xl font-bold text-surgical-500/30">{number}</span>
      <h3 className="text-xl font-semibold text-white mt-2 mb-3">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}
