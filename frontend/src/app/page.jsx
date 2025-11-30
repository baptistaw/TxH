// src/app/page.jsx - Landing Page AI-Driven
'use client';

import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    <div className="min-h-screen bg-dark-500 overflow-x-hidden">
      {/* Floating Login Button */}
      <div className={`fixed top-6 right-6 z-50 transition-all duration-500 ${scrolled ? 'scale-100 opacity-100' : 'scale-95 opacity-90'}`}>
        <Link
          href="/sign-in"
          className="group flex items-center gap-2 px-5 py-2.5 bg-dark-600/80 backdrop-blur-xl border border-dark-400/50 hover:border-surgical-500/50 text-white rounded-full font-medium transition-all duration-300 hover:shadow-lg hover:shadow-surgical-500/20"
        >
          <span>Acceder</span>
          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>

      {/* Hero Section - Full Screen */}
      <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-surgical-500/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-medical-500/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8 inline-block">
            <div className="relative">
              <div className="absolute inset-0 bg-surgical-500/30 blur-2xl rounded-full animate-pulse"></div>
              <img
                src="/logo.jpg"
                alt="anestrasplante.org"
                className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-3xl object-cover shadow-2xl ring-2 ring-surgical-500/30"
              />
            </div>
          </div>

          {/* AI Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-surgical-500/20 to-medical-500/20 backdrop-blur-sm border border-surgical-500/30 rounded-full mb-8 animate-fade-in">
            <div className="w-2 h-2 bg-surgical-400 rounded-full animate-ping"></div>
            <span className="text-surgical-400 font-medium text-sm">Potenciado por Inteligencia Artificial</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
            <span className="block">El futuro del</span>
            <span className="block bg-gradient-to-r from-surgical-400 via-medical-400 to-blue-400 bg-clip-text text-transparent">
              Registro Anestesiologico
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl sm:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
            Plataforma <span className="text-white font-medium">AI-driven</span> para equipos de trasplante hepatico.
            Captura inteligente, analisis predictivo y soporte al diagnostico impulsado por machine learning.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/sign-in"
              className="group relative px-8 py-4 bg-gradient-to-r from-surgical-500 to-surgical-600 text-white rounded-2xl font-semibold text-lg transition-all duration-300 hover:shadow-2xl hover:shadow-surgical-500/30 hover:scale-105"
            >
              <span className="relative z-10 flex items-center gap-2">
                Comenzar ahora
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
            <a
              href="#ai-features"
              className="px-8 py-4 text-gray-300 hover:text-white font-medium transition-colors flex items-center gap-2"
            >
              Explorar funcionalidades
              <svg className="w-5 h-5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </a>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-gray-600 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-gray-500 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* AI Features Section */}
      <section id="ai-features" className="py-32 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-dark-500 via-dark-600 to-dark-500"></div>

        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-6">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="text-blue-400 font-medium text-sm">Inteligencia Artificial</span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              AI que transforma
              <span className="block text-gray-500">la anestesiologia</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Tecnologia de vanguardia disenada por especialistas para optimizar cada fase del procedimiento
            </p>
          </div>

          {/* AI Feature Cards */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* OCR Card */}
            <div className="group relative bg-gradient-to-br from-dark-600 to-dark-700 rounded-3xl p-8 border border-dark-400 hover:border-surgical-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-surgical-500/10 hover:-translate-y-2">
              <div className="absolute top-0 right-0 w-32 h-32 bg-surgical-500/10 rounded-full blur-3xl group-hover:bg-surgical-500/20 transition-colors"></div>

              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-surgical-500/20 to-surgical-600/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-surgical-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>

                <h3 className="text-2xl font-bold text-white mb-3">Vision por Computadora</h3>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  OCR inteligente que captura automaticamente datos de monitores, bombas de infusion y planillas anestesicas.
                  Extraccion precisa de parametros vitales y gasometrias.
                </p>

                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-surgical-500/10 text-surgical-400 text-sm rounded-full">OCR Medico</span>
                  <span className="px-3 py-1 bg-surgical-500/10 text-surgical-400 text-sm rounded-full">Auto-captura</span>
                  <span className="px-3 py-1 bg-surgical-500/10 text-surgical-400 text-sm rounded-full">98% precision</span>
                </div>
              </div>
            </div>

            {/* ML Predictive Card */}
            <div className="group relative bg-gradient-to-br from-dark-600 to-dark-700 rounded-3xl p-8 border border-dark-400 hover:border-medical-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-medical-500/10 hover:-translate-y-2">
              <div className="absolute top-0 right-0 w-32 h-32 bg-medical-500/10 rounded-full blur-3xl group-hover:bg-medical-500/20 transition-colors"></div>

              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-medical-500/20 to-medical-600/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-medical-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>

                <h3 className="text-2xl font-bold text-white mb-3">Analisis Predictivo</h3>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  Modelos de machine learning entrenados con datos de trasplantes para predecir riesgo de
                  complicaciones, necesidad de hemocomponentes y outcomes postoperatorios.
                </p>

                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-medical-500/10 text-medical-400 text-sm rounded-full">Risk Score</span>
                  <span className="px-3 py-1 bg-medical-500/10 text-medical-400 text-sm rounded-full">Predictivo</span>
                  <span className="px-3 py-1 bg-medical-500/10 text-medical-400 text-sm rounded-full">Real-time</span>
                </div>
              </div>
            </div>

            {/* Clinical Decision Support Card */}
            <div className="group relative bg-gradient-to-br from-dark-600 to-dark-700 rounded-3xl p-8 border border-dark-400 hover:border-blue-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors"></div>

              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>

                <h3 className="text-2xl font-bold text-white mb-3">Soporte a Decisiones</h3>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  Recomendaciones basadas en evidencia y patrones detectados en tu base de datos institucional.
                  Alertas inteligentes y protocolos sugeridos para cada situacion clinica.
                </p>

                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-sm rounded-full">Guidelines</span>
                  <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-sm rounded-full">Alertas</span>
                  <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-sm rounded-full">Protocolos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-surgical-500/10 rounded-full blur-[100px]"></div>
          <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-medical-500/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-surgical-500/10 border border-surgical-500/20 rounded-full mb-6">
                <svg className="w-5 h-5 text-surgical-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-surgical-400 font-medium text-sm">Flujo de trabajo</span>
              </div>

              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
                Captura datos en
                <span className="block text-surgical-400">segundos, no minutos</span>
              </h2>

              <p className="text-xl text-gray-400 mb-10 leading-relaxed">
                Nuestra AI elimina la carga administrativa. Fotografias que se convierten en datos estructurados,
                formularios que se autocompletan y validaciones en tiempo real.
              </p>

              {/* Steps */}
              <div className="space-y-6">
                <WorkflowStep
                  number="01"
                  title="Captura con camara"
                  description="Fotografa monitores, gasometrias o planillas fisicas"
                  color="surgical"
                />
                <WorkflowStep
                  number="02"
                  title="Procesamiento AI"
                  description="Extraccion automatica y validacion de datos"
                  color="medical"
                />
                <WorkflowStep
                  number="03"
                  title="Registro automatico"
                  description="Datos estructurados listos para analisis"
                  color="blue"
                />
              </div>
            </div>

            {/* Right - Visual */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-surgical-500/20 to-medical-500/20 rounded-3xl blur-3xl"></div>
              <div className="relative bg-gradient-to-br from-dark-600 to-dark-700 rounded-3xl p-8 border border-dark-400">
                {/* Mock Interface */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b border-dark-400">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-500 text-sm ml-2">AI OCR Processing</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-dark-500 rounded-xl p-4">
                      <div className="text-gray-500 text-xs mb-2">pH arterial</div>
                      <div className="text-2xl font-bold text-surgical-400">7.35</div>
                      <div className="text-green-500 text-xs mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Detectado
                      </div>
                    </div>
                    <div className="bg-dark-500 rounded-xl p-4">
                      <div className="text-gray-500 text-xs mb-2">Lactato</div>
                      <div className="text-2xl font-bold text-medical-400">2.1</div>
                      <div className="text-green-500 text-xs mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Detectado
                      </div>
                    </div>
                    <div className="bg-dark-500 rounded-xl p-4">
                      <div className="text-gray-500 text-xs mb-2">pCO2</div>
                      <div className="text-2xl font-bold text-blue-400">38</div>
                      <div className="text-green-500 text-xs mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Detectado
                      </div>
                    </div>
                    <div className="bg-dark-500 rounded-xl p-4">
                      <div className="text-gray-500 text-xs mb-2">HCO3</div>
                      <div className="text-2xl font-bold text-purple-400">22</div>
                      <div className="text-green-500 text-xs mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Detectado
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-dark-400">
                    <span className="text-gray-400 text-sm">4 valores extraidos</span>
                    <span className="text-surgical-400 text-sm font-medium">Confianza: 98.5%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <div className="relative bg-gradient-to-r from-surgical-600/10 via-medical-600/10 to-blue-600/10 rounded-[2.5rem] p-12 sm:p-16 border border-dark-400 overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

            <div className="relative z-10">
              <div className="text-center mb-12">
                <h3 className="text-3xl sm:text-4xl font-bold text-white mb-3">Respaldado por experiencia real</h3>
                <p className="text-gray-400 text-lg">Desarrollado en uno de los programas de trasplante mas activos de Sudamerica</p>
              </div>

              <div className="grid sm:grid-cols-4 gap-8 text-center">
                <div className="group">
                  <p className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-surgical-400 to-surgical-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">15+</p>
                  <p className="text-gray-400">Anos de desarrollo</p>
                </div>
                <div className="group">
                  <p className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-medical-400 to-medical-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">400+</p>
                  <p className="text-gray-400">Trasplantes registrados</p>
                </div>
                <div className="group">
                  <p className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">50k+</p>
                  <p className="text-gray-400">Parametros capturados</p>
                </div>
                <div className="group">
                  <p className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-purple-400 to-purple-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">99%</p>
                  <p className="text-gray-400">Uptime garantizado</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Coming Soon Section */}
      <section id="coming-soon" className="py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-6">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-ping"></div>
              <span className="text-amber-400 font-medium text-sm">Proximamente</span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              Expandiendo fronteras
              <span className="block text-gray-500">en trasplante</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Nuestra plataforma esta evolucionando para soportar todos los programas de trasplante de organos solidos.
              Misma tecnologia AI, adaptada a cada especialidad.
            </p>
          </div>

          {/* Coming Soon Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Renal Card - Featured / Most Requested */}
            <div className="group relative md:col-span-2 lg:col-span-1 lg:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative bg-gradient-to-br from-dark-600 to-dark-700 rounded-3xl p-8 border-2 border-emerald-500/30 hover:border-emerald-500/60 transition-all duration-500">
                {/* Featured Badge */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-dark-600 text-xs font-bold rounded-full shadow-lg shadow-emerald-500/30">
                    MAS SOLICITADO
                  </span>
                </div>

                {/* Coming Soon Badge */}
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/30">
                    Q1 2025
                  </span>
                </div>

                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform mt-2">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>

                <h3 className="text-2xl font-bold text-white mb-3">Trasplante Renal</h3>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  Soporte completo para trasplante renal incluyendo donante vivo, tipaje HLA, crossmatch y seguimiento inmunologico.
                </p>

                <div className="space-y-3 mb-6">
                  <FeatureItem text="Donante vivo y cadaverico" color="emerald" />
                  <FeatureItem text="Panel de anticuerpos (PRA)" color="emerald" />
                  <FeatureItem text="Compatibilidad HLA" color="emerald" />
                  <FeatureItem text="Seguimiento de creatinina" color="emerald" />
                </div>

                <div className="pt-4 border-t border-dark-400">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      Alta prioridad
                    </div>
                    <span className="text-gray-500 text-xs">Documentacion disponible</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reno-Pancreatico (SPK) Card - Active Development */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative bg-gradient-to-br from-dark-600 to-dark-700 rounded-3xl p-8 border border-dark-400 hover:border-amber-500/50 transition-all duration-500">
                {/* Coming Soon Badge */}
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full border border-amber-500/30">
                    Q2 2025
                  </span>
                </div>

                <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>

                <h3 className="text-2xl font-bold text-white mb-1">Trasplante Reno-Pancreatico</h3>
                <p className="text-amber-400 text-sm font-medium mb-3">SPK - Simultaneous Pancreas-Kidney</p>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  El trasplante combinado mas frecuente (85-90%). Soporte integral para diabeticos tipo 1 con nefropatia terminal.
                </p>

                <div className="space-y-3 mb-6">
                  <FeatureItem text="Flujo SPK optimizado" color="amber" />
                  <FeatureItem text="Tiempos de isquemia por organo" color="amber" />
                  <FeatureItem text="Seguimiento C-peptido y HbA1c" color="amber" />
                  <FeatureItem text="Drenaje exocrino (enterico/vesical)" color="amber" />
                </div>

                <div className="pt-4 border-t border-dark-400">
                  <div className="flex items-center gap-2 text-amber-400 text-sm">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    En desarrollo activo
                  </div>
                </div>
              </div>
            </div>

            {/* Hepato-Renal Card - Active Development */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative bg-gradient-to-br from-dark-600 to-dark-700 rounded-3xl p-8 border border-dark-400 hover:border-purple-500/50 transition-all duration-500">
                {/* Coming Soon Badge */}
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-medium rounded-full border border-purple-500/30">
                    Q2 2025
                  </span>
                </div>

                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>

                <h3 className="text-2xl font-bold text-white mb-3">Trasplante Hepato-Renal</h3>
                <p className="text-gray-400 mb-6 leading-relaxed">
                  Trasplante combinado de higado y rinon para sindrome hepatorrenal, poliquistosis o hiperoxaluria primaria.
                </p>

                <div className="space-y-3 mb-6">
                  <FeatureItem text="Extension del modulo hepatico actual" color="purple" />
                  <FeatureItem text="Manejo de sindrome hepatorrenal" color="purple" />
                  <FeatureItem text="Tiempos de isquemia separados" color="purple" />
                </div>

                <div className="pt-4 border-t border-dark-400">
                  <div className="flex items-center gap-2 text-purple-400 text-sm">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    En desarrollo activo
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Newsletter / Interest Form */}
          <div className="mt-16 text-center">
            <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 bg-dark-600/50 backdrop-blur-xl rounded-2xl border border-dark-400">
              <div className="text-left">
                <p className="text-white font-medium">¿Interesado en estos programas?</p>
                <p className="text-gray-400 text-sm">Contactanos para ser parte del programa piloto</p>
              </div>
              <a
                href="#contact"
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-dark-600 font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 flex items-center gap-2 whitespace-nowrap"
              >
                Solicitar acceso anticipado
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact" className="py-32 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-dark-500 to-dark-600"></div>

        <div className="relative z-10 max-w-xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-surgical-500/10 border border-surgical-500/20 rounded-full mb-6">
              <svg className="w-5 h-5 text-surgical-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-surgical-400 font-medium text-sm">Contacto</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Agenda una demo
            </h2>
            <p className="text-xl text-gray-400">
              Descubre como la AI puede transformar tu programa de trasplantes
            </p>
          </div>

          <div className="bg-dark-600/50 backdrop-blur-xl rounded-3xl p-8 border border-dark-400">
            {submitted ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Solicitud recibida</h3>
                <p className="text-gray-400 text-lg">
                  Nos pondremos en contacto en las proximas 24-48 horas para coordinar tu demo personalizada.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
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
                      className="w-full px-4 py-3.5 bg-dark-500/50 border border-dark-400 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-surgical-500 focus:ring-1 focus:ring-surgical-500/50 transition-all"
                      placeholder="Dr. Juan Perez"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3.5 bg-dark-500/50 border border-dark-400 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-surgical-500 focus:ring-1 focus:ring-surgical-500/50 transition-all"
                      placeholder="jperez@hospital.edu"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
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
                      className="w-full px-4 py-3.5 bg-dark-500/50 border border-dark-400 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-surgical-500 focus:ring-1 focus:ring-surgical-500/50 transition-all"
                      placeholder="Hospital Universitario"
                    />
                  </div>
                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-300 mb-2">
                      Pais
                    </label>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      required
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full px-4 py-3.5 bg-dark-500/50 border border-dark-400 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-surgical-500 focus:ring-1 focus:ring-surgical-500/50 transition-all"
                      placeholder="Argentina"
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
                    className="w-full px-4 py-3.5 bg-dark-500/50 border border-dark-400 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-surgical-500 focus:ring-1 focus:ring-surgical-500/50 transition-all resize-none"
                    placeholder="Volumen anual de trasplantes, interes especifico..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-4 bg-gradient-to-r from-surgical-500 to-surgical-600 hover:from-surgical-600 hover:to-surgical-700 disabled:from-surgical-500/50 disabled:to-surgical-600/50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-surgical-500/25 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      Solicitar demo
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
      <footer className="py-12 px-4 border-t border-dark-400">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <img
                src="/logo.jpg"
                alt="anestrasplante.org"
                className="w-12 h-12 rounded-xl object-cover"
              />
              <div>
                <span className="text-white font-semibold text-lg">
                  anestras<span className="text-surgical-400">plante</span>.org
                </span>
                <p className="text-gray-500 text-sm">
                  AI-Powered Anesthesia Registry
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-gray-400">
              <span className="text-sm">contacto@anestrasplante.org</span>
              <span className="text-dark-400">|</span>
              <span className="text-sm">Montevideo, Uruguay</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Custom Styles for Animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}

function WorkflowStep({ number, title, description, color }) {
  const colors = {
    surgical: 'text-surgical-400 bg-surgical-500/10 border-surgical-500/20',
    medical: 'text-medical-400 bg-medical-500/10 border-medical-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  };

  return (
    <div className="flex items-start gap-4 group">
      <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${colors[color]} border flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform`}>
        {number}
      </div>
      <div>
        <h4 className="text-lg font-semibold text-white mb-1">{title}</h4>
        <p className="text-gray-400">{description}</p>
      </div>
    </div>
  );
}

function FeatureItem({ text, color }) {
  const colors = {
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    purple: 'text-purple-400',
  };

  return (
    <div className="flex items-center gap-2">
      <svg className={`w-4 h-4 ${colors[color]} flex-shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-gray-300 text-sm">{text}</span>
    </div>
  );
}
