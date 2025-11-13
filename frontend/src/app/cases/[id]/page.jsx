// src/app/cases/[id]/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { casesApi, exportsApi } from '@/lib/api';
import {
  formatDate,
  formatDateTime,
  formatCI,
  formatDuration,
  formatBoolean,
  formatMELD,
} from '@/lib/utils';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner, { PageSpinner } from '@/components/ui/Spinner';
import Card, {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/Card';

export default function CaseDetailPage() {
  return (
    <ProtectedRoute>
      <CaseDetailPageContent />
    </ProtectedRoute>
  );
}

function CaseDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id;

  const [caseData, setCaseData] = useState(null);
  const [team, setTeam] = useState([]);
  const [preop, setPreop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // Cargar datos del caso
  useEffect(() => {
    const fetchCaseData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Cargar caso principal
        const caseResponse = await casesApi.getById(caseId);
        setCaseData(caseResponse);

        // Cargar equipo (si está disponible)
        try {
          const teamResponse = await casesApi.getTeam(caseId);
          setTeam(teamResponse || []);
        } catch (err) {
          console.warn('No se pudo cargar equipo:', err);
        }

        // Cargar preop (si está disponible)
        try {
          const preopResponse = await casesApi.getPreop(caseId);
          setPreop(preopResponse);
        } catch (err) {
          console.warn('No se pudo cargar preop:', err);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (caseId) {
      fetchCaseData();
    }
  }, [caseId]);

  // Handler para descargar PDF
  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      await exportsApi.downloadPDF(caseId);
    } catch (err) {
      console.error('Error al descargar PDF:', err);
      alert('Error al descargar PDF: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  // Handler para descargar CSV
  const handleDownloadCSV = async () => {
    setDownloading(true);
    try {
      await exportsApi.downloadCSV(caseId, 'complete');
    } catch (err) {
      console.error('Error al descargar CSV:', err);
      alert('Error al descargar CSV: ' + err.message);
    } finally {
      setDownloading(false);
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
          <div className="alert alert-error">
            Error al cargar caso: {error}
          </div>
          <Button onClick={() => router.push('/cases')} className="mt-4">
            Volver a Casos
          </Button>
        </main>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-dark-500">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="alert alert-warning">Caso no encontrado</div>
          <Button onClick={() => router.push('/cases')} className="mt-4">
            Volver a Casos
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-500">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/cases">
            <Button variant="ghost" size="sm" className="mb-4">
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Volver a Casos
            </Button>
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-100 mb-2">
                Detalle del Caso
              </h1>
              <p className="text-gray-400">
                Paciente: {caseData.patient?.name} - CI:{' '}
                {formatCI(caseData.patientId)}
              </p>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2">
              {/* Descargar PDF */}
              <Button
                variant="secondary"
                onClick={handleDownloadPDF}
                disabled={downloading}
                title="Descargar ficha completa en PDF"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                {downloading ? 'Descargando...' : 'PDF'}
              </Button>

              {/* Descargar CSV */}
              <Button
                variant="secondary"
                onClick={handleDownloadCSV}
                disabled={downloading}
                title="Exportar datos a CSV"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {downloading ? 'Descargando...' : 'CSV'}
              </Button>

              {/* Ir a Intraop */}
              <Link href={`/cases/${caseId}/intraop`}>
                <Button variant="primary">
                  <svg
                    className="w-4 h-4 mr-2"
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
                  Registro Intraop
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información del Caso */}
            <Card>
              <CardHeader>
                <CardTitle>Datos del Trasplante</CardTitle>
                <CardDescription>
                  Información principal del procedimiento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="data-grid">
                  <DataField
                    label="Fecha/Hora Inicio"
                    value={formatDateTime(caseData.startAt)}
                  />
                  <DataField
                    label="Fecha/Hora Fin"
                    value={formatDateTime(caseData.endAt)}
                  />
                  <DataField
                    label="Duración"
                    value={formatDuration(caseData.duration)}
                  />
                  <DataField
                    label="Retrasplante"
                    value={formatBoolean(caseData.isRetransplant)}
                  />
                  <DataField
                    label="Hepato-Renal"
                    value={formatBoolean(caseData.isHepatoRenal)}
                  />
                  <DataField
                    label="Donante Óptimo"
                    value={formatBoolean(caseData.optimalDonor)}
                  />
                  <DataField
                    label="Procedencia"
                    value={caseData.provenance || '-'}
                  />
                  <DataField
                    label="T. Isquemia Fría (min)"
                    value={caseData.coldIschemiaTime || '-'}
                  />
                  <DataField
                    label="T. Isquemia Caliente (min)"
                    value={caseData.warmIschemiaTime || '-'}
                  />
                  <DataField
                    label="Fecha Traslado CTI"
                    value={formatDate(caseData.icuTransferDate)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Evaluación Preoperatoria */}
            {preop ? (
              <Card>
                <CardHeader>
                  <CardTitle>Evaluación Preoperatoria</CardTitle>
                  <CardDescription>
                    Última evaluación antes del trasplante
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="data-grid">
                    <DataField
                      label="Fecha Evaluación"
                      value={formatDate(preop.evaluationDate)}
                    />
                    <DataField label="MELD" value={formatMELD(preop.meld)} />
                    <DataField
                      label="MELD-Na"
                      value={formatMELD(preop.meldNa)}
                    />
                    <DataField label="Child" value={preop.child || '-'} />
                    <DataField
                      label="Etiología 1"
                      value={preop.etiology1 || '-'}
                    />
                    <DataField
                      label="Etiología 2"
                      value={preop.etiology2 || '-'}
                    />
                    <DataField
                      label="Fulminante"
                      value={formatBoolean(preop.isFulminant)}
                    />
                  </div>

                  {preop.observations && (
                    <div className="mt-4 pt-4 border-t border-dark-400">
                      <p className="data-label">Observaciones</p>
                      <p className="data-value">{preop.observations}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No hay evaluación preoperatoria registrada
                </CardContent>
              </Card>
            )}

            {/* Observaciones del Caso */}
            {caseData.observations && (
              <Card>
                <CardHeader>
                  <CardTitle>Observaciones</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 whitespace-pre-wrap">
                    {caseData.observations}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Columna lateral */}
          <div className="space-y-6">
            {/* Datos del Paciente */}
            <Card>
              <CardHeader>
                <CardTitle>Paciente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DataField
                  label="Nombre"
                  value={caseData.patient?.name || '-'}
                />
                <DataField label="CI" value={formatCI(caseData.patientId)} />
                <DataField
                  label="Sexo"
                  value={caseData.patient?.sex || '-'}
                />
                <DataField
                  label="Fecha Nacimiento"
                  value={formatDate(caseData.patient?.birthDate)}
                />
                <DataField
                  label="Prestador"
                  value={caseData.patient?.provider || '-'}
                />
              </CardContent>
            </Card>

            {/* Equipo Clínico */}
            <Card>
              <CardHeader>
                <CardTitle>Equipo Clínico</CardTitle>
                <CardDescription>
                  {team.length} miembros del equipo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {team.length > 0 ? (
                  <div className="space-y-3">
                    {team.map((member, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-dark-700 rounded-lg"
                      >
                        <div className="w-10 h-10 rounded-full bg-medical-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {member.clinician?.name
                            ?.split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase() || '??'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-200">
                            {member.clinician?.name || 'Sin nombre'}
                          </p>
                          <p className="text-sm text-gray-400 capitalize">
                            {member.role || 'Sin rol'}
                          </p>
                          {member.clinician?.specialty && (
                            <p className="text-xs text-gray-500">
                              {member.clinician.specialty}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    No hay equipo registrado
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Badges de estado */}
            <Card>
              <CardHeader>
                <CardTitle>Estado</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {caseData.isRetransplant && (
                  <Badge variant="warning">Retrasplante</Badge>
                )}
                {caseData.isHepatoRenal && (
                  <Badge variant="info">Hepato-Renal</Badge>
                )}
                {caseData.optimalDonor && (
                  <Badge variant="success">Donante Óptimo</Badge>
                )}
                {!caseData.isRetransplant &&
                  !caseData.isHepatoRenal &&
                  !caseData.optimalDonor && (
                    <Badge variant="default">Sin marcadores especiales</Badge>
                  )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

// Componente auxiliar para mostrar campos de datos
function DataField({ label, value }) {
  return (
    <div>
      <p className="data-label">{label}</p>
      <p className="data-value">{value || '-'}</p>
    </div>
  );
}
