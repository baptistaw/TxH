'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import Button from '@/components/ui/Button';
import Card, {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/Card';
import { casesApi, patientsApi } from '@/lib/api';

export default function HomePage() {
  return (
    <ProtectedRoute>
      <HomePageContent />
    </ProtectedRoute>
  );
}

function HomePageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [recentCases, setRecentCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar casos recientes
        const casesResponse = await casesApi.list({ page: 1, limit: 5 });
        setRecentCases(casesResponse.data || []);

        // Cargar estadísticas básicas
        const patientsResponse = await patientsApi.list({ page: 1, limit: 1 });
        const casesTotal = await casesApi.list({ page: 1, limit: 1 });

        setStats({
          totalPatients: patientsResponse.pagination?.total || 0,
          totalCases: casesTotal.pagination?.total || 0,
        });
      } catch (err) {
        console.error('Error al cargar datos del dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <AppLayout>
      <div className="h-full px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-100 mb-2">
            Bienvenido, {user?.name || 'Usuario'}
          </h1>
          <p className="text-gray-400">
            Sistema de Registro Anestesiológico - Trasplantes Hepáticos
          </p>
        </div>

        {/* Estadísticas Rápidas */}
        {!loading && stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">
                      Total Pacientes
                    </p>
                    <p className="text-3xl font-bold text-gray-100">
                      {stats.totalPatients}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">
                      Total Trasplantes
                    </p>
                    <p className="text-3xl font-bold text-gray-100">
                      {stats.totalCases}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-medical-500/20 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-medical-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">
                      Casos Recientes
                    </p>
                    <p className="text-3xl font-bold text-gray-100">
                      {recentCases.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Flujos de Trabajo Principales */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-100 mb-4">
            Gestión de Trasplantes
          </h2>
          <p className="text-gray-400 mb-6">
            Selecciona el punto de entrada según el flujo de trabajo
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Crear Paciente Nuevo */}
            <WorkflowCard
              title="Crear Paciente Nuevo"
              description="Registrar un nuevo paciente en el sistema"
              icon={
                <svg
                  className="w-8 h-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              }
              color="blue"
              href="/patients/new"
              steps={[
                'Ingresar datos demográficos',
                'Asignar prestador',
                'Luego: Crear evaluación preop',
              ]}
            />

            {/* Buscar Paciente Existente */}
            <WorkflowCard
              title="Buscar Paciente"
              description="Buscar paciente existente para gestionar"
              icon={
                <svg
                  className="w-8 h-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              }
              color="purple"
              href="/patients"
              steps={[
                'Buscar por CI o nombre',
                'Ver historial del paciente',
                'Crear evaluación o trasplante',
              ]}
            />

            {/* Crear Evaluación Preoperatoria */}
            <WorkflowCard
              title="Evaluación Preoperatoria"
              description="Crear evaluación pretrasplante para paciente"
              icon={
                <svg
                  className="w-8 h-8"
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
              }
              color="indigo"
              href="/preop/new"
              steps={[
                'Seleccionar paciente',
                'Registrar MELD, Child, comorbilidades',
                'Luego: Registrar trasplante',
              ]}
            />

            {/* Registrar Trasplante */}
            <WorkflowCard
              title="Registrar Trasplante"
              description="Crear nuevo registro de trasplante"
              icon={
                <svg
                  className="w-8 h-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              }
              color="medical"
              href="/cases/new"
              steps={[
                'Seleccionar paciente',
                'Configurar equipo quirúrgico',
                'Registrar datos del trasplante',
              ]}
            />

            {/* Ver Trasplantes */}
            <WorkflowCard
              title="Trasplantes Registrados"
              description="Ver y gestionar todos los trasplantes"
              icon={
                <svg
                  className="w-8 h-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              }
              color="green"
              href="/cases"
              steps={[
                'Filtrar por fecha, paciente, etc.',
                'Ver detalles completos',
                'Editar registro intraoperatorio',
              ]}
            />

            {/* Procedimientos No-Trasplante */}
            <WorkflowCard
              title="Procedimientos"
              description="Registrar procedimientos no-trasplante"
              icon={
                <svg
                  className="w-8 h-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
              }
              color="yellow"
              href="/procedures"
              steps={[
                'Biopsias, endoscopías, TIPS',
                'Registro simplificado',
                'Vinculado al paciente',
              ]}
            />
          </div>
        </div>

        {/* Casos Recientes */}
        {recentCases.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-100">
                Trasplantes Recientes
              </h2>
              <Link href="/cases">
                <Button variant="ghost" size="sm">
                  Ver todos
                  <svg
                    className="w-4 h-4 ml-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Button>
              </Link>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-dark-400">
                  {recentCases.map((transplantCase) => (
                    <Link
                      key={transplantCase.id}
                      href={`/cases/${transplantCase.id}`}
                      className="block hover:bg-dark-700 transition-colors"
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-200">
                              {transplantCase.patient?.name || 'Sin nombre'}
                            </p>
                            <p className="text-sm text-gray-400">
                              CI: {transplantCase.patientId}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-300">
                              {transplantCase.startAt
                                ? new Date(
                                    transplantCase.startAt
                                  ).toLocaleDateString('es-UY')
                                : '-'}
                            </p>
                            <div className="flex gap-2 mt-1 justify-end">
                              {transplantCase.isRetransplant && (
                                <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded">
                                  Retx
                                </span>
                              )}
                              {transplantCase.isHepatoRenal && (
                                <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-500 rounded">
                                  H-R
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navegación Adicional */}
        <div>
          <h2 className="text-2xl font-bold text-gray-100 mb-4">
            Otras Funciones
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/admin">
              <Card className="hover:bg-dark-700 transition-colors cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-200">
                        Administración
                      </p>
                      <p className="text-sm text-gray-400">
                        Usuarios, catálogos, configuración
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/profile">
              <Card className="hover:bg-dark-700 transition-colors cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-blue-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-200">Mi Perfil</p>
                      <p className="text-sm text-gray-400">
                        Configuración de cuenta
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/analytics">
              <Card className="hover:bg-dark-700 transition-colors cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-surgical-500/20 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-surgical-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-200">Estadísticas</p>
                      <p className="text-sm text-gray-400">
                        KPIs clínicos y calidad
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// Componente para las tarjetas de flujo de trabajo
function WorkflowCard({ title, description, icon, color, href, steps }) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-500 hover:bg-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-500 hover:bg-purple-500/30',
    indigo: 'bg-indigo-500/20 text-indigo-500 hover:bg-indigo-500/30',
    medical: 'bg-medical-500/20 text-medical-500 hover:bg-medical-500/30',
    green: 'bg-green-500/20 text-green-500 hover:bg-green-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30',
  };

  const iconBgClass = colorClasses[color] || colorClasses.blue;

  return (
    <Link href={href}>
      <Card className="hover:bg-dark-700 transition-all hover:shadow-lg cursor-pointer h-full">
        <CardHeader>
          <div className={`w-16 h-16 rounded-lg ${iconBgClass} flex items-center justify-center mb-4 transition-colors`}>
            {icon}
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-gray-500 text-sm mt-0.5">
                  {index + 1}.
                </span>
                <p className="text-sm text-gray-400">{step}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
