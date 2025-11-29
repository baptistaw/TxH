// src/app/patients/[id]/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { patientsApi } from '@/lib/api';
import { formatDate, formatCI, formatBoolean, calculateAge } from '@/lib/utils';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import PatientTimeline from '@/components/patients/PatientTimeline';

export default function PatientDetailPage() {
  return (
    <ProtectedRoute>
      <PatientDetailContent />
    </ProtectedRoute>
  );
}

function PatientDetailContent() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id;

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'timeline'

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setLoading(true);
        const data = await patientsApi.getById(patientId);
        setPatient(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [patientId]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  if (error || !patient) {
    return (
      <AppLayout>
        <div className="p-8">
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
            <p className="text-gray-300">{error || 'Paciente no encontrado'}</p>
            <Button onClick={() => router.back()} className="mt-4" variant="secondary">
              ← Volver
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const age = calculateAge(patient.birthDate);

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-3xl font-bold text-gray-100">{patient.name}</h1>
              <Badge variant={patient.transplanted ? 'success' : 'default'}>
                {patient.transplanted ? 'Trasplantado' : 'En Lista'}
              </Badge>
            </div>
            <p className="text-gray-400">
              CI: {formatCI(patient.id)} | FNR: {patient.fnr || 'N/A'}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href={`/patients/${patient.id}/edit`}>
              <Button>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar
              </Button>
            </Link>
            <Button variant="secondary" onClick={() => router.back()}>
              ← Volver
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-400">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-surgical-500 text-surgical-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-dark-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Detalles
            </span>
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'timeline'
                ? 'border-surgical-500 text-surgical-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-dark-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Timeline
            </span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'timeline' ? (
          <PatientTimeline patientId={patientId} />
        ) : (
          <>
            {/* Información Personal */}
            <Card>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InfoField label="Cédula de Identidad" value={formatCI(patient.id)} />
                  <InfoField label="Nombre Completo" value={patient.name} />
                  <InfoField label="FNR" value={patient.fnr} />
                  <InfoField label="Fecha de Nacimiento" value={formatDate(patient.birthDate)} />
                  <InfoField label="Edad" value={age ? `${age} años` : 'N/A'} />
                  <InfoField label="Sexo" value={patient.sex} />
                  <InfoField label="Prestador de Salud" value={patient.provider} />
                  <InfoField label="Teléfono" value={patient.phone} />
                  <InfoField label="Email" value={patient.email} />
                </div>
              </CardContent>
            </Card>

            {/* Estado del Trasplante */}
            <Card>
              <CardHeader>
                <CardTitle>Estado de Trasplante</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <InfoField
                    label="Trasplantado"
                    value={
                      <Badge variant={patient.transplanted ? 'success' : 'default'}>
                        {formatBoolean(patient.transplanted)}
                      </Badge>
                    }
                  />
                  <InfoField label="Fecha de Admisión a Lista" value={formatDate(patient.admissionDate)} />
                  <InfoField label="En Lista de Espera" value={formatBoolean(patient.inList)} />
                  <InfoField label="MELD Score" value={patient.meld} />
                  <InfoField label="Grupo Sanguíneo" value={patient.bloodType} />
                  <InfoField label="Peso (kg)" value={patient.weight} />
                  <InfoField label="Altura (cm)" value={patient.height} />
                </div>
              </CardContent>
            </Card>

            {/* Información Clínica */}
            {patient.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notas Clínicas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 whitespace-pre-wrap">{patient.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Casos de Trasplante */}
            {patient.cases && patient.cases.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Casos de Trasplante ({patient.cases.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {patient.cases.map((transplantCase, index) => (
                      <div
                        key={transplantCase.id}
                        className="border border-dark-400 rounded-lg p-4 hover:bg-dark-500 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-surgical-400">
                              Trasplante #{index + 1}
                            </h3>
                            <p className="text-sm text-gray-400">
                              ID: {transplantCase.id}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Link href={`/cases/${transplantCase.id}`}>
                              <Button size="sm" variant="primary">
                                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Ver Trasplante
                              </Button>
                            </Link>
                            <Link href={`/cases/${transplantCase.id}/intraop`}>
                              <Button size="sm" variant="secondary">
                                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Intraop
                              </Button>
                            </Link>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">Fecha:</span>
                            <p className="text-gray-200">{formatDate(transplantCase.startAt)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Duración:</span>
                            <p className="text-gray-200">{transplantCase.duration ? `${transplantCase.duration} min` : 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">ASA:</span>
                            <p className="text-gray-200">{transplantCase.asa || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Evaluaciones Preoperatorias */}
            {patient.preopEvaluations && patient.preopEvaluations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Evaluaciones Preoperatorias ({patient.preopEvaluations.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patient.preopEvaluations.slice(0, 5).map((evaluation) => (
                      <div
                        key={evaluation.id}
                        className="border border-dark-400 rounded-lg p-3 hover:bg-dark-500 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-200">
                              {formatDate(evaluation.evaluationDate)}
                            </p>
                            <p className="text-xs text-gray-500">
                              MELD: {evaluation.meldScore || 'N/A'}
                            </p>
                          </div>
                          <Link href={`/preop/${evaluation.id}`}>
                            <Button size="sm" variant="ghost">
                              Ver →
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                    {patient.preopEvaluations.length > 5 && (
                      <Link href={`/preop?patientId=${patient.id}`}>
                        <Button variant="outline" className="w-full">
                          Ver todas las evaluaciones ({patient.preopEvaluations.length})
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Metadatos */}
            <Card>
              <CardHeader>
                <CardTitle>Información del Registro</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoField label="Fecha de Creación" value={formatDate(patient.createdAt)} />
                  <InfoField label="Última Actualización" value={formatDate(patient.updatedAt)} />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}

// Componente auxiliar para mostrar campos de información
function InfoField({ label, value }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-500 mb-1">
        {label}
      </label>
      <div className="text-gray-200">
        {value || <span className="text-gray-600">N/A</span>}
      </div>
    </div>
  );
}
