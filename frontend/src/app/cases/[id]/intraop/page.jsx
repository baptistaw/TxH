// src/app/cases/[id]/intraop/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { casesApi } from '@/lib/api';
import { formatCI } from '@/lib/utils';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import Button from '@/components/ui/Button';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import IntegratedIntraopRegistry from '@/components/intraop/IntegratedIntraopRegistry';
import IntraopCharts from '@/components/cases/IntraopCharts';
import Spinner, { PageSpinner } from '@/components/ui/Spinner';
import { useAuth } from '@/contexts/AuthContext';

// Fases del intraoperatorio
const PHASES = [
  { key: 'ESTADO_BASAL', label: 'Estado Basal', color: 'bg-gray-900' },
  { key: 'INDUCCION', label: 'Inducción', color: 'bg-blue-900' },
  { key: 'DISECCION', label: 'Disección', color: 'bg-purple-900' },
  { key: 'ANHEPATICA', label: 'Anhepática', color: 'bg-pink-900' },
  { key: 'PRE_REPERFUSION', label: 'Pre-Reperfusión', color: 'bg-red-900' },
  { key: 'POST_REPERFUSION', label: 'Post-Reperfusión', color: 'bg-orange-900' },
  { key: 'VIA_BILIAR', label: 'Vía Biliar', color: 'bg-yellow-900' },
  { key: 'CIERRE', label: 'Cierre', color: 'bg-green-900' },
  { key: 'SALIDA_BQ', label: 'Salida de BQ', color: 'bg-teal-900' },
];

export default function IntraopPage() {
  return (
    <ProtectedRoute>
      <IntraopPageContent />
    </ProtectedRoute>
  );
}

function IntraopPageContent() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id;
  const { user } = useAuth();

  const [caseData, setCaseData] = useState(null);
  const [team, setTeam] = useState([]);
  const [expandedPhases, setExpandedPhases] = useState(['ESTADO_BASAL']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verificar si el usuario puede editar
  // Admin o cualquier anestesiólogo pueden editar
  const canEdit = user && (
    user.role === 'ADMIN' ||
    user.role === 'ANESTESIOLOGO'
  );

  // Cargar datos del caso
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const caseResponse = await casesApi.getById(caseId);
        setCaseData(caseResponse);

        // Cargar equipo
        try {
          const teamResponse = await casesApi.getTeam(caseId);
          setTeam(teamResponse || []);
        } catch (err) {
          console.warn('No se pudo cargar equipo:', err);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (caseId) {
      fetchData();
    }
  }, [caseId]);

  // Toggle fase expandida
  const togglePhase = (phaseKey) => {
    setExpandedPhases((prev) =>
      prev.includes(phaseKey)
        ? prev.filter((p) => p !== phaseKey)
        : [...prev, phaseKey]
    );
  };

  if (loading) {
    return <PageSpinner />;
  }

  if (error) {
    return (
      <AppLayout>
        <div className="h-full px-8 py-6">
          <div className="alert alert-error">Error al cargar datos: {error}</div>
          <Button onClick={() => router.push(`/cases/${caseId}`)} className="mt-4">
            Volver al Caso
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (!caseData) {
    return null;
  }

  return (
    <AppLayout>
      <div className="h-full px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/cases/${caseId}`}>
            <Button variant="ghost" size="sm" className="mb-4">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver al Caso
            </Button>
          </Link>

          <h1 className="text-3xl font-bold text-gray-100 mb-2">
            Registro Intraoperatorio
          </h1>
          <p className="text-gray-400">
            Paciente: {caseData.patient?.name} - CI: {formatCI(caseData.patientId)}
          </p>
        </div>

        {/* Fases */}
        <div className="space-y-4">
          {PHASES.map((phase) => {
            const isExpanded = expandedPhases.includes(phase.key);

            return (
              <Card key={phase.key} className="overflow-hidden">
                <CardHeader
                  className={`cursor-pointer hover:bg-dark-700 transition-colors ${phase.color} bg-opacity-20`}
                  onClick={() => togglePhase(phase.key)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${phase.color} opacity-100`} />
                      <CardTitle className="text-lg">{phase.label}</CardTitle>
                    </div>

                    <div className="flex items-center gap-2">
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-6">
                    {/* Registro integrado de parámetros vitales, fluidos y pérdidas */}
                    <IntegratedIntraopRegistry
                      caseId={caseId}
                      phase={phase.key}
                      patientWeight={caseData.patient?.weight}
                      canEdit={canEdit}
                      onDataChange={(data) => {
                        // Callback opcional para actualizar datos en el componente padre
                        console.log('Datos actualizados:', data);
                      }}
                    />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Ayuda */}
        <Card className="mt-6 bg-dark-700">
          <CardContent className="py-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Guía de uso:</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
              <div className="text-xs">
                <span className="text-gray-500">Atajos:</span>
                <div className="mt-1 space-y-1 text-gray-400">
                  <div><kbd className="px-2 py-1 bg-dark-600 rounded text-xs">Ctrl+N</kbd> Nueva fila</div>
                  <div><kbd className="px-2 py-1 bg-dark-600 rounded text-xs">Ctrl+D</kbd> Duplicar última</div>
                  <div><kbd className="px-2 py-1 bg-dark-600 rounded text-xs">Esc</kbd> Cancelar</div>
                </div>
              </div>

              <div className="text-xs">
                <span className="text-gray-500">Navegación:</span>
                <div className="mt-1 space-y-1 text-gray-400">
                  <div>• Click en fila → Ver detalles completos</div>
                  <div>• Scroll horizontal → Ver todos los campos</div>
                  <div>• Tabs en edición → Organizar por sección</div>
                </div>
              </div>

              <div className="text-xs">
                <span className="text-gray-500">Campos en tabla:</span>
                <div className="mt-1 space-y-1 text-gray-400">
                  <div>• 24 campos visibles por defecto</div>
                  <div>• Agrupados por colores</div>
                  <div>• Hora y Acciones fijas en scroll</div>
                </div>
              </div>
            </div>

            <div className="border-t border-dark-600 pt-3">
              <p className="text-xs text-surgical-400">
                💡 <strong>Cálculos automáticos:</strong> PAm = (PAS + 2×PAD) / 3  |  PAPm = (PAPS + 2×PAPD) / 3
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Gráficos de tendencias */}
        <IntraopCharts caseId={caseId} />
      </div>
    </AppLayout>
  );
}
