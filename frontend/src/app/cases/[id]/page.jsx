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
import AppLayout from '@/components/layout/AppLayout';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner, { PageSpinner } from '@/components/ui/Spinner';
import Card, {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import IntraopCharts from '@/components/cases/IntraopCharts';
import SPSSExportModal from '@/components/exports/SPSSExportModal';

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
  const { user } = useAuth();

  const [caseData, setCaseData] = useState(null);
  const [team, setTeam] = useState([]);
  const [preop, setPreop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

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

  // Handler para enviar PDF por email
  const [sending, setSending] = useState(false);
  const handleEmailPDF = async () => {
    setSending(true);
    try {
      const result = await exportsApi.emailPDF(caseId);
      alert(`PDF enviado exitosamente a ${result.data.recipients} destinatario(s)`);
    } catch (err) {
      console.error('Error al enviar PDF:', err);
      alert('Error al enviar PDF: ' + (err.response?.data?.message || err.message));
    } finally {
      setSending(false);
    }
  };

  // Handler para abrir modal de exportación CSV/SPSS
  const handleOpenExportModal = () => {
    setShowExportModal(true);
  };

  // Handler para eliminar caso (solo admin)
  const handleDeleteCase = async () => {
    const confirmDelete = window.confirm(
      '¿Está seguro que desea eliminar este trasplante?\n\nEsta acción no se puede deshacer y eliminará todos los registros asociados (intraoperatorio, fluidos, etc.).'
    );

    if (!confirmDelete) return;

    setDeleting(true);
    try {
      await casesApi.delete(caseId);
      alert('Trasplante eliminado exitosamente');
      router.push('/cases');
    } catch (err) {
      console.error('Error al eliminar trasplante:', err);
      alert('Error al eliminar trasplante: ' + err.message);
      setDeleting(false);
    }
  };

  // Verificar permisos
  const canEdit = user && (
    user.role === 'ADMIN' ||
    (user.role === 'ANESTESIOLOGO' && team.some(member => member.clinicianId === user.id))
  );

  const canDelete = user && user.role === 'ADMIN';

  if (loading) {
    return <PageSpinner />;
  }

  if (error) {
    return (
      <AppLayout>
        <div className="h-full px-8 py-6">
          <div className="alert alert-error">
            Error al cargar caso: {error}
          </div>
          <Button onClick={() => router.back()} className="mt-4">
            Volver
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (!caseData) {
    return (
      <AppLayout>
        <div className="h-full px-8 py-6">
          <div className="alert alert-warning">Caso no encontrado</div>
          <Button onClick={() => router.back()} className="mt-4">
            Volver
          </Button>
        </div>
      </AppLayout>
    );
  }

  const linesMonitoring = caseData.linesMonitoring;
  const postOp = caseData.postOp;

  return (
    <AppLayout>
      <div className="h-full px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            onClick={() => router.back()}
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Volver
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-100 mb-2">
                Detalle del Trasplante
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
                PDF
              </Button>

              {/* Enviar PDF por Email */}
              <Button
                variant="primary"
                onClick={handleEmailPDF}
                disabled={sending}
                title="Enviar PDF a lista de distribución"
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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {sending ? 'Enviando...' : 'Enviar PDF'}
              </Button>

              {/* Exportar CSV/SPSS */}
              <Button
                variant="secondary"
                onClick={handleOpenExportModal}
                title="Exportar datos a CSV compatible con SPSS"
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
                Exportar CSV
              </Button>

              {/* Ver/Editar Evaluación Preoperatoria */}
              {preop && (
                <Link href={`/preop/${preop.id}`}>
                  <Button variant="secondary" title="Ver evaluación preoperatoria completa">
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Ver Preop
                  </Button>
                </Link>
              )}

              {/* Crear Nuevo Trasplante */}
              <Link href={`/cases/new?patientId=${caseData.patientId}`}>
                <Button variant="success" title="Crear nuevo trasplante para este paciente">
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Nuevo Trasplante
                </Button>
              </Link>

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

              {/* Ir a PostOp */}
              <Link href={`/cases/${caseId}/postop`}>
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Postoperatorio
                </Button>
              </Link>

              {/* Ir a Mortalidad */}
              <Link href={`/cases/${caseId}/mortality`}>
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
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0h2a2 2 0 012 2v0a2 2 0 002 2h2a2 2 0 002-2v-6a2 2 0 00-2-2h-2a2 2 0 00-2 2v6a2 2 0 01-2 2z"
                    />
                  </svg>
                  Mortalidad y Seguimiento
                </Button>
              </Link>

              {/* Editar Trasplante (Admin o miembro del equipo) */}
              {canEdit && (
                <Link href={`/cases/${caseId}/edit`}>
                  <Button variant="secondary" title="Editar datos del trasplante">
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
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Editar
                  </Button>
                </Link>
              )}

              {/* Eliminar Trasplante (Solo Admin) */}
              {canDelete && (
                <Button
                  variant="danger"
                  onClick={handleDeleteCase}
                  disabled={deleting}
                  title="Eliminar trasplante permanentemente"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  {deleting ? 'Eliminando...' : 'Eliminar'}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información del Caso */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Datos Generales del Trasplante</CardTitle>
                    <CardDescription>
                      Información principal del procedimiento
                    </CardDescription>
                  </div>
                  {canEdit && (
                    <Link href={`/cases/${caseId}/edit`}>
                      <Button variant="outline" size="sm">
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                      </Button>
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Estado del Donante */}
                <div className="mb-4 pb-4 border-b border-dark-400">
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">
                    Estado del Donante
                  </h4>
                  <div className="flex flex-wrap gap-2">
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
                  </div>
                </div>

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

            {/* Líneas y Monitoreo */}
            {linesMonitoring && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Líneas y Monitoreo</CardTitle>
                      <CardDescription>
                        Accesos vasculares, vía aérea y equipamiento utilizado
                      </CardDescription>
                    </div>
                    {canEdit && (
                      <Link href={`/cases/${caseId}/lines`}>
                        <Button variant="outline" size="sm">
                          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Editar
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Vías Centrales y Arteriales */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">
                      Accesos Vasculares
                    </h4>
                    <div className="data-grid">
                      <DataField label="CVC 1" value={linesMonitoring.cvc1} />
                      <DataField label="CVC 2" value={linesMonitoring.cvc2} />
                      <DataField label="CVC 3" value={linesMonitoring.cvc3} />
                      <DataField
                        label="Línea Arterial 1"
                        value={linesMonitoring.arterialLine1}
                      />
                      <DataField
                        label="Línea Arterial 2"
                        value={linesMonitoring.arterialLine2}
                      />
                      <DataField
                        label="Swan-Ganz"
                        value={formatBoolean(linesMonitoring.swanGanz)}
                      />
                      <DataField
                        label="Vía Periférica"
                        value={linesMonitoring.peripheralIV}
                      />
                    </div>
                  </div>

                  {/* Vía Aérea */}
                  <div className="mb-4 pt-4 border-t border-dark-400">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">
                      Vía Aérea y Anestesia
                    </h4>
                    <div className="data-grid">
                      <DataField
                        label="Tipo de Vía Aérea"
                        value={linesMonitoring.airwayType}
                      />
                      <DataField
                        label="Sellick"
                        value={formatBoolean(linesMonitoring.tubeSellick)}
                      />
                      <DataField
                        label="Laringoscopia (Cormack)"
                        value={linesMonitoring.laryngoscopy}
                      />
                      <DataField
                        label="Tipo de Anestesia"
                        value={linesMonitoring.anesthesiaType}
                      />
                      <DataField
                        label="Premedicación"
                        value={linesMonitoring.premedication}
                      />
                    </div>
                  </div>

                  {/* Equipamiento */}
                  <div className="pt-4 border-t border-dark-400">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">
                      Equipamiento
                    </h4>
                    <div className="data-grid">
                      <DataField
                        label="Calentador/Level1"
                        value={formatBoolean(linesMonitoring.warmer)}
                      />
                      <DataField
                        label="Cell Saver"
                        value={formatBoolean(linesMonitoring.cellSaverUsed)}
                      />
                      <DataField
                        label="Vendas Elásticas"
                        value={formatBoolean(linesMonitoring.elasticBandages)}
                      />
                      <DataField
                        label="Manta Térmica"
                        value={formatBoolean(linesMonitoring.thermalBlanket)}
                      />
                      <DataField
                        label="ATB Profilácticos"
                        value={linesMonitoring.prophylacticATB}
                      />
                    </div>
                    {linesMonitoring.pressurePoints && (
                      <div className="mt-4">
                        <p className="data-label">Puntos de Apoyo</p>
                        <p className="data-value">
                          {linesMonitoring.pressurePoints}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Evaluación Preoperatoria Expandida */}
            {preop ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Evaluación Preoperatoria</CardTitle>
                      <CardDescription>
                        Resumen de la evaluación pretrasplante
                      </CardDescription>
                    </div>
                    <Link href={`/preop/${preop.id}`}>
                      <Button variant="outline" size="sm">
                        Ver Completa
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Scores y Clasificación */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">
                      Scores y Clasificación
                    </h4>
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
                    </div>
                  </div>

                  {/* Etiología */}
                  <div className="mb-4 pt-4 border-t border-dark-400">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">
                      Etiología
                    </h4>
                    <div className="data-grid">
                      <DataField
                        label="Etiología Principal"
                        value={preop.etiology1 || '-'}
                      />
                      <DataField
                        label="Etiología Secundaria"
                        value={preop.etiology2 || '-'}
                      />
                      <DataField
                        label="Fulminante"
                        value={formatBoolean(preop.isFulminant)}
                      />
                    </div>
                  </div>

                  {/* Comorbilidades */}
                  <div className="mb-4 pt-4 border-t border-dark-400">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">
                      Comorbilidades Principales
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {preop.coronaryDisease && (
                        <Badge variant="warning">Cardiopatía Coronaria</Badge>
                      )}
                      {preop.hypertension && (
                        <Badge variant="info">Hipertensión</Badge>
                      )}
                      {preop.valvulopathy && (
                        <Badge variant="warning">
                          Valvulopatía: {preop.valvulopathy}
                        </Badge>
                      )}
                      {preop.arrhythmia && (
                        <Badge variant="warning">Arritmia</Badge>
                      )}
                      {preop.smokerCOPD && <Badge variant="warning">EPOC</Badge>}
                      {preop.asthma && <Badge variant="warning">Asma</Badge>}
                      {preop.renalFailure && (
                        <Badge variant="danger">Insuficiencia Renal</Badge>
                      )}
                      {preop.diabetes && <Badge variant="warning">Diabetes</Badge>}
                      {preop.thyroidDysfunction && (
                        <Badge variant="info">Disfunción Tiroidea</Badge>
                      )}
                    </div>
                  </div>

                  {/* Complicaciones de Cirrosis */}
                  <div className="mb-4 pt-4 border-t border-dark-400">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">
                      Complicaciones de la Cirrosis
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {preop.hepatoRenalSyndrome && (
                        <Badge variant="danger">Síndrome Hepatorrenal</Badge>
                      )}
                      {preop.portalHypertension && (
                        <Badge variant="warning">HTP Portal</Badge>
                      )}
                      {preop.ascites && <Badge variant="info">Ascitis</Badge>}
                      {preop.esophagealVarices && (
                        <Badge variant="warning">Várices Esofágicas</Badge>
                      )}
                      {preop.encephalopathy && (
                        <Badge variant="warning">Encefalopatía</Badge>
                      )}
                      {preop.hepatocarcinoma && (
                        <Badge variant="danger">Hepatocarcinoma</Badge>
                      )}
                      {preop.pulmonaryHypertension && (
                        <Badge variant="danger">HTP Pulmonar</Badge>
                      )}
                      {preop.portalThrombosis && (
                        <Badge variant="danger">Trombosis Portal</Badge>
                      )}
                    </div>
                  </div>

                  {/* Estado Funcional */}
                  <div className="pt-4 border-t border-dark-400">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">
                      Estado Funcional
                    </h4>
                    <div className="data-grid">
                      <DataField
                        label="Clase Funcional"
                        value={preop.functionalClass || '-'}
                      />
                      <DataField
                        label="Ventilación Mecánica"
                        value={formatBoolean(preop.mechanicalVent)}
                      />
                    </div>
                  </div>

                  {/* Observaciones */}
                  {(preop.observations || preop.comorbiditiesObs || preop.complicationsObs) && (
                    <div className="mt-4 pt-4 border-t border-dark-400">
                      <p className="data-label">Observaciones</p>
                      {preop.observations && (
                        <p className="data-value mb-2">{preop.observations}</p>
                      )}
                      {preop.comorbiditiesObs && (
                        <p className="data-value text-sm mb-2">
                          <span className="font-semibold">Comorbilidades:</span>{' '}
                          {preop.comorbiditiesObs}
                        </p>
                      )}
                      {preop.complicationsObs && (
                        <p className="data-value text-sm">
                          <span className="font-semibold">Complicaciones:</span>{' '}
                          {preop.complicationsObs}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Evaluación Preoperatoria</CardTitle>
                </CardHeader>
                <CardContent className="py-8 text-center">
                  <p className="text-gray-500 mb-4">
                    No hay evaluación preoperatoria registrada
                  </p>
                  <Link href={`/preop/new?patientId=${caseData.patientId}&caseId=${caseId}`}>
                    <Button variant="primary">
                      Crear Evaluación Preoperatoria
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Resultados Postoperatorios */}
            {postOp && (
              <Card>
                <CardHeader>
                  <CardTitle>Resultados Postoperatorios</CardTitle>
                  <CardDescription>
                    Evolución inmediata post-trasplante
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="data-grid">
                    <DataField
                      label="Fecha Evaluación"
                      value={formatDate(postOp.evaluationDate)}
                    />
                    <DataField
                      label="Extubado en Quirófano"
                      value={formatBoolean(postOp.extubatedInOR)}
                    />
                    <DataField
                      label="Horas ARM"
                      value={postOp.mechVentHours || '-'}
                    />
                    <DataField
                      label="Días ARM"
                      value={postOp.mechVentDays || '-'}
                    />
                    <DataField
                      label="Reintubación 24h"
                      value={formatBoolean(postOp.reintubation24h)}
                    />
                    <DataField
                      label="Reoperación"
                      value={formatBoolean(postOp.reoperation)}
                    />
                    <DataField
                      label="Días en CTI"
                      value={postOp.icuDays || '-'}
                    />
                    <DataField
                      label="Días en Sala"
                      value={postOp.wardDays || '-'}
                    />
                    <DataField
                      label="Fecha de Alta"
                      value={formatDate(postOp.dischargeDate)}
                    />
                  </div>

                  {/* Complicaciones */}
                  <div className="mt-4 pt-4 border-t border-dark-400">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">
                      Complicaciones
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {postOp.primaryGraftFailure && (
                        <Badge variant="danger">Falla Primaria del Injerto</Badge>
                      )}
                      {postOp.acuteRenalFailure && (
                        <Badge variant="danger">Insuficiencia Renal Aguda</Badge>
                      )}
                      {postOp.pulmonaryEdema && (
                        <Badge variant="danger">Edema Pulmonar</Badge>
                      )}
                      {postOp.neurotoxicity && (
                        <Badge variant="warning">Neurotoxicidad</Badge>
                      )}
                      {postOp.rejection && (
                        <Badge variant="danger">Rechazo</Badge>
                      )}
                      {postOp.biliaryComplications && (
                        <Badge variant="warning">Complicaciones Biliares</Badge>
                      )}
                      {postOp.vascularComplications && (
                        <Badge variant="danger">Complicaciones Vasculares</Badge>
                      )}
                      {postOp.surgicalBleeding && (
                        <Badge variant="danger">Sangrado Quirúrgico</Badge>
                      )}
                    </div>
                    {postOp.reoperationCause && (
                      <div className="mt-4">
                        <p className="data-label">Causa de Reoperación</p>
                        <p className="data-value">{postOp.reoperationCause}</p>
                      </div>
                    )}
                    {postOp.otherComplications && (
                      <div className="mt-4">
                        <p className="data-label">Otras Complicaciones</p>
                        <p className="data-value">{postOp.otherComplications}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Observaciones del Caso */}
            {caseData.observations && (
              <Card>
                <CardHeader>
                  <CardTitle>Observaciones del Caso</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 whitespace-pre-wrap">
                    {caseData.observations}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Gráficas de Tendencias Intraoperatorias */}
            <IntraopCharts caseId={caseId} />
          </div>

          {/* Columna lateral */}
          <div className="space-y-6">
            {/* Datos del Paciente */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Paciente</CardTitle>
                  <Link href={`/patients/${caseData.patientId}`}>
                    <Button variant="ghost" size="sm">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </Button>
                  </Link>
                </div>
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Equipo Clínico</CardTitle>
                    <CardDescription>
                      {team.length} miembros del equipo
                    </CardDescription>
                  </div>
                  {canEdit && (
                    <Link href={`/cases/${caseId}/team`}>
                      <Button variant="outline" size="sm">
                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                      </Button>
                    </Link>
                  )}
                </div>
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
                            {formatRole(member.role) || 'Sin rol'}
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

            {/* Acciones Rápidas */}
            <Card>
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/cases/${caseId}/intraop`} className="block">
                  <Button variant="outline" className="w-full justify-start">
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
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    Registro Intraoperatorio
                  </Button>
                </Link>

                <Link
                  href={`/cases/new?patientId=${caseData.patientId}`}
                  className="block"
                >
                  <Button variant="outline" className="w-full justify-start">
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
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Nuevo Trasplante
                  </Button>
                </Link>

                {preop && (
                  <Link href={`/preop/${preop.id}`} className="block">
                    <Button variant="outline" className="w-full justify-start">
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
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Ver Evaluación Preop
                    </Button>
                  </Link>
                )}

                <Link href={`/patients/${caseData.patientId}`} className="block">
                  <Button variant="outline" className="w-full justify-start">
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
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Ver Historial del Paciente
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal de exportación SPSS */}
      <SPSSExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        caseId={parseInt(caseId)}
      />
    </AppLayout>
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

// Helper para formatear roles
function formatRole(role) {
  const roleMap = {
    ANESTESIOLOGO: 'Anestesiólogo',
    CIRUJANO: 'Cirujano',
    INTENSIVISTA: 'Intensivista',
    HEPATOLOGO: 'Hepatólogo',
    NURSE_COORD: 'Enfermera Coordinadora',
  };
  return roleMap[role] || role;
}
