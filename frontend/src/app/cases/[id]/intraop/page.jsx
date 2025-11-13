// src/app/cases/[id]/intraop/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { casesApi, intraopApi } from '@/lib/api';
import { formatCI } from '@/lib/utils';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import IntraopGrid from '@/components/intraop/IntraopGrid';
import Spinner, { PageSpinner } from '@/components/ui/Spinner';

// Fases del intraoperatorio
const PHASES = [
  { key: 'INDUCCION', label: 'Inducción', color: 'bg-blue-900' },
  { key: 'DISECCION', label: 'Disección', color: 'bg-purple-900' },
  { key: 'ANHEPATICA_INICIAL', label: 'Anhepática Inicial', color: 'bg-pink-900' },
  { key: 'PRE_REPERFUSION', label: 'Pre-Reperfusión', color: 'bg-red-900' },
  { key: 'POST_REPERFUSION_INICIAL', label: 'Post-Reperfusión Inicial', color: 'bg-orange-900' },
  { key: 'FIN_VIA_BILIAR', label: 'Fin Vía Biliar', color: 'bg-yellow-900' },
  { key: 'CIERRE', label: 'Cierre', color: 'bg-green-900' },
];

export default function IntraopPage() {
  return (
    <ProtectedRoute requiredRoles={['admin', 'anestesiologo']}>
      <IntraopPageContent />
    </ProtectedRoute>
  );
}

function IntraopPageContent() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id;

  const [caseData, setCaseData] = useState(null);
  const [recordsByPhase, setRecordsByPhase] = useState({});
  const [expandedPhases, setExpandedPhases] = useState(['INDUCCION']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar datos del caso e intraop
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Cargar caso
        const caseResponse = await casesApi.getById(caseId);
        setCaseData(caseResponse);

        // Cargar registros intraop
        const intraopResponse = await intraopApi.list({ caseId });

        // Agrupar por fase
        const grouped = {};
        PHASES.forEach((phase) => {
          grouped[phase.key] = [];
        });

        (intraopResponse.data || []).forEach((record) => {
          if (grouped[record.phase]) {
            grouped[record.phase].push(record);
          }
        });

        setRecordsByPhase(grouped);
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

  // Agregar registro
  const handleAddRecord = async (phase, data) => {
    try {
      await intraopApi.create({
        caseId,
        phase,
        timestamp: new Date(data.timestamp).toISOString(),
        heartRate: data.heartRate ? parseInt(data.heartRate) : null,
        sys: data.sys ? parseInt(data.sys) : null,
        dia: data.dia ? parseInt(data.dia) : null,
        map: data.map ? parseInt(data.map) : null,
        cvp: data.cvp ? parseInt(data.cvp) : null,
        peep: data.peep ? parseInt(data.peep) : null,
        fio2: data.fio2 ? parseInt(data.fio2) : null,
        vt: data.vt ? parseInt(data.vt) : null,
      });

      // Recargar datos
      await refetchData();
    } catch (error) {
      alert('Error al crear registro: ' + error.message);
      throw error;
    }
  };

  // Actualizar registro
  const handleUpdateRecord = async (phase, id, data) => {
    try {
      await intraopApi.update(id, {
        timestamp: new Date(data.timestamp).toISOString(),
        heartRate: data.heartRate ? parseInt(data.heartRate) : null,
        sys: data.sys ? parseInt(data.sys) : null,
        dia: data.dia ? parseInt(data.dia) : null,
        map: data.map ? parseInt(data.map) : null,
        cvp: data.cvp ? parseInt(data.cvp) : null,
        peep: data.peep ? parseInt(data.peep) : null,
        fio2: data.fio2 ? parseInt(data.fio2) : null,
        vt: data.vt ? parseInt(data.vt) : null,
      });

      // Recargar datos
      await refetchData();
    } catch (error) {
      alert('Error al actualizar registro: ' + error.message);
      throw error;
    }
  };

  // Eliminar registro
  const handleDeleteRecord = async (phase, id) => {
    try {
      await intraopApi.delete(id);

      // Recargar datos
      await refetchData();
    } catch (error) {
      alert('Error al eliminar registro: ' + error.message);
      throw error;
    }
  };

  // Duplicar última fila
  const handleDuplicateLastRecord = async (phase) => {
    try {
      await intraopApi.duplicate(caseId, phase);

      // Recargar datos
      await refetchData();
    } catch (error) {
      alert('Error al duplicar registro: ' + error.message);
      throw error;
    }
  };

  // Refetch data
  const refetchData = async () => {
    try {
      const intraopResponse = await intraopApi.list({ caseId });

      const grouped = {};
      PHASES.forEach((phase) => {
        grouped[phase.key] = [];
      });

      (intraopResponse.data || []).forEach((record) => {
        if (grouped[record.phase]) {
          grouped[record.phase].push(record);
        }
      });

      setRecordsByPhase(grouped);
    } catch (error) {
      console.error('Error refetching data:', error);
    }
  };

  if (loading) {
    return <PageSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-500">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="alert alert-error">Error al cargar datos: {error}</div>
          <Button onClick={() => router.push(`/cases/${caseId}`)} className="mt-4">
            Volver al Caso
          </Button>
        </main>
      </div>
    );
  }

  if (!caseData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-dark-500">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            const records = recordsByPhase[phase.key] || [];

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
                      <span className="text-sm text-gray-400">
                        ({records.length} registro{records.length !== 1 ? 's' : ''})
                      </span>
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
                    <IntraopGrid
                      phase={phase.key}
                      records={records}
                      onAdd={(data) => handleAddRecord(phase.key, data)}
                      onUpdate={(id, data) => handleUpdateRecord(phase.key, id, data)}
                      onDelete={(id) => handleDeleteRecord(phase.key, id)}
                      onDuplicate={() => handleDuplicateLastRecord(phase.key)}
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
            <h4 className="text-sm font-medium text-gray-300 mb-2">Atajos de teclado:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-gray-400">
              <div>
                <kbd className="px-2 py-1 bg-dark-600 rounded">Ctrl+N</kbd> Nueva fila
              </div>
              <div>
                <kbd className="px-2 py-1 bg-dark-600 rounded">Ctrl+D</kbd> Duplicar última
              </div>
              <div>
                <kbd className="px-2 py-1 bg-dark-600 rounded">Esc</kbd> Cancelar edición
              </div>
            </div>
            <p className="mt-3 text-xs text-surgical-400">
              💡 PAm (Presión Arterial Media) se calcula automáticamente si dejas el campo vacío: PAm = (PAS + 2×PAD) / 3
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
