'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
// Icons are rendered inline as SVGs
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { preopApi, adminApi, exportsApi } from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import { formatDate, formatDateTime } from '@/lib/utils';
import { PageSpinner } from '@/components/ui/Spinner';
import PreopAttachments from '@/components/preop/PreopAttachments';
import { useAuth } from '@/contexts/AuthContext';

function PreopEvaluationDetailContent() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [etiologies, setEtiologies] = useState([]);
  const [loadingEtiologies, setLoadingEtiologies] = useState(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Estado de secciones colapsables
  const [expandedSections, setExpandedSections] = useState({
    patient: true,
    scores: true,
    etiology: true,
    physicalExam: true,
    cardiovascular: true,
    respiratory: true,
    otherComorbidities: true,
    cirrhosisComplications: true,
    functionalStatus: true,
    waitlist: true,
    labs: true,
  });

  // Estado del formulario (solo usado cuando isEditing = true)
  const [formData, setFormData] = useState(null);

  // Verificar si el usuario puede editar
  // Solo admin o el anestesiólogo asignado pueden editar
  const canEdit = user && evaluation && (
    user.role === 'ADMIN' ||
    (user.role === 'ANESTESIOLOGO' && evaluation.clinicianId && String(user.id) === String(evaluation.clinicianId))
  );

  useEffect(() => {
    loadEvaluation();
    loadEtiologies();
  }, [params.id]);

  const loadEtiologies = async () => {
    try {
      setLoadingEtiologies(true);
      const response = await adminApi.listEtiologies();
      setEtiologies(response.data || []);
    } catch (err) {
      console.error('Error loading etiologies:', err);
    } finally {
      setLoadingEtiologies(false);
    }
  };

  const loadEvaluation = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await preopApi.getById(params.id);
      setEvaluation(data);
      // Inicializar formData con los datos de la evaluación
      initFormData(data);
    } catch (err) {
      console.error('Error loading evaluation:', err);
      setError('Error al cargar la evaluación preoperatoria');
    } finally {
      setLoading(false);
    }
  };

  const initFormData = (data) => {
    setFormData({
      evaluationDate: data.evaluationDate ? new Date(data.evaluationDate).toISOString().split('T')[0] : '',
      meld: data.meld || '',
      meldNa: data.meldNa || '',
      child: data.child || '',
      etiology1: data.etiology1 || '',
      etiology2: data.etiology2 || '',
      isFulminant: data.isFulminant || false,
      mpt: data.mpt || '',
      mouthOpening: data.mouthOpening || '',
      physicalExamObs: data.physicalExamObs || '',
      coronaryDisease: data.coronaryDisease || false,
      hypertension: data.hypertension || false,
      valvulopathy: data.valvulopathy || '',
      arrhythmia: data.arrhythmia || false,
      dilatedCardio: data.dilatedCardio || false,
      hypertensiveCardio: data.hypertensiveCardio || false,
      smokerCOPD: data.smokerCOPD || false,
      asthma: data.asthma || false,
      renalFailure: data.renalFailure || false,
      singleKidney: data.singleKidney || false,
      diabetes: data.diabetes || false,
      thyroidDysfunction: data.thyroidDysfunction || false,
      previousAbdSurgery: data.previousAbdSurgery || false,
      abdSurgeryDetail: data.abdSurgeryDetail || '',
      refluxUlcer: data.refluxUlcer || false,
      allergies: data.allergies || '',
      pregnancy: data.pregnancy || false,
      hepatoRenalSyndrome: data.hepatoRenalSyndrome || false,
      hepatoPulmonarySyndr: data.hepatoPulmonarySyndr || false,
      pulmonaryHypertension: data.pulmonaryHypertension || false,
      portalHypertension: data.portalHypertension || false,
      ascites: data.ascites || false,
      hydrothorax: data.hydrothorax || false,
      sbe: data.sbe || false,
      portalThrombosis: data.portalThrombosis || false,
      esophagealVarices: data.esophagealVarices || false,
      encephalopathy: data.encephalopathy || false,
      hepatocarcinoma: data.hepatocarcinoma || false,
      bleeding: data.bleeding || false,
      hyponatremia: data.hyponatremia || false,
      complicationsObs: data.complicationsObs || '',
      functionalClass: data.functionalClass || '',
      mechanicalVent: data.mechanicalVent || false,
      habitualMeds: data.habitualMeds || '',
      inList: data.inList || false,
      reasonNotInList: data.reasonNotInList || '',
      problems: data.problems || '',
    });
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Restaurar datos originales
    initFormData(evaluation);
    setError(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const payload = {
        evaluationDate: new Date(formData.evaluationDate).toISOString(),
        meld: formData.meld ? parseInt(formData.meld) : null,
        meldNa: formData.meldNa ? parseInt(formData.meldNa) : null,
        child: formData.child || null,
        etiology1: formData.etiology1 || null,
        etiology2: formData.etiology2 || null,
        isFulminant: formData.isFulminant,
        mpt: formData.mpt || null,
        mouthOpening: formData.mouthOpening || null,
        physicalExamObs: formData.physicalExamObs || null,
        coronaryDisease: formData.coronaryDisease,
        hypertension: formData.hypertension,
        valvulopathy: formData.valvulopathy || null,
        arrhythmia: formData.arrhythmia,
        dilatedCardio: formData.dilatedCardio,
        hypertensiveCardio: formData.hypertensiveCardio,
        smokerCOPD: formData.smokerCOPD,
        asthma: formData.asthma,
        renalFailure: formData.renalFailure,
        singleKidney: formData.singleKidney,
        diabetes: formData.diabetes,
        thyroidDysfunction: formData.thyroidDysfunction,
        previousAbdSurgery: formData.previousAbdSurgery,
        abdSurgeryDetail: formData.abdSurgeryDetail || null,
        refluxUlcer: formData.refluxUlcer,
        allergies: formData.allergies || null,
        pregnancy: formData.pregnancy,
        hepatoRenalSyndrome: formData.hepatoRenalSyndrome,
        hepatoPulmonarySyndr: formData.hepatoPulmonarySyndr,
        pulmonaryHypertension: formData.pulmonaryHypertension,
        portalHypertension: formData.portalHypertension,
        ascites: formData.ascites,
        hydrothorax: formData.hydrothorax,
        sbe: formData.sbe,
        portalThrombosis: formData.portalThrombosis,
        esophagealVarices: formData.esophagealVarices,
        encephalopathy: formData.encephalopathy,
        hepatocarcinoma: formData.hepatocarcinoma,
        bleeding: formData.bleeding,
        hyponatremia: formData.hyponatremia,
        complicationsObs: formData.complicationsObs || null,
        functionalClass: formData.functionalClass || null,
        mechanicalVent: formData.mechanicalVent,
        habitualMeds: formData.habitualMeds || null,
        inList: formData.inList,
        reasonNotInList: formData.reasonNotInList || null,
        problems: formData.problems || null,
      };

      const updated = await preopApi.update(params.id, payload);
      setEvaluation(updated);
      setIsEditing(false);
      // Recargar para obtener datos frescos incluyendo labs
      await loadEvaluation();
    } catch (err) {
      console.error('Error updating evaluation:', err);
      setError(err.message || 'Error al actualizar la evaluación');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloadingPDF(true);
      setError(null);
      const patientName = evaluation?.patient?.name || 'paciente';
      await exportsApi.downloadPreopPDF(params.id, patientName);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError('Error al descargar el PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleEmailPDF = async () => {
    try {
      setSendingEmail(true);
      setError(null);
      const result = await exportsApi.emailPreopPDF(params.id);
      // Show success message
      alert(`PDF enviado exitosamente a ${result.recipients} destinatario(s)`);
    } catch (err) {
      console.error('Error emailing PDF:', err);
      setError('Error al enviar el PDF por email');
    } finally {
      setSendingEmail(false);
    }
  };

  const SectionHeader = ({ title, section }) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      className="flex items-center justify-between w-full p-4 bg-dark-700 hover:bg-dark-600 transition-colors border-b border-dark-400"
    >
      <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
      {expandedSections[section] ? (
        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );

  const DisplayField = ({ label, value, type = 'text' }) => {
    let displayValue = value;

    if (type === 'boolean') {
      displayValue = value ? 'Sí' : 'No';
    } else if (type === 'date') {
      displayValue = value ? formatDate(value) : '-';
    } else if (!value && value !== 0 && value !== false) {
      displayValue = '-';
    }

    return (
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <p className="text-gray-100">{displayValue}</p>
      </div>
    );
  };

  if (loading) {
    return <PageSpinner />;
  }

  if (!evaluation) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No se encontró la evaluación</p>
        <Button onClick={() => router.back()} className="mt-4" variant="outline">
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-100">Evaluación Preoperatoria</h1>
            <p className="text-gray-400 mt-1">
              {evaluation.patient?.name} - CI: {evaluation.patient?.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* PDF Download Button */}
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={downloadingPDF || isEditing}
          >
            {downloadingPDF ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
                Generando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                PDF
              </>
            )}
          </Button>

          {/* Email Button - only for ADMIN and ANESTESIOLOGO */}
          {user && (user.role === 'ADMIN' || user.role === 'ANESTESIOLOGO') && (
            <Button
              variant="outline"
              onClick={handleEmailPDF}
              disabled={sendingEmail || isEditing}
            >
              {sendingEmail ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email
                </>
              )}
            </Button>
          )}

          {/* Edit Button */}
          {!isEditing && canEdit && (
            <Button onClick={handleEdit}>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg flex items-start gap-3">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Información del Paciente y Fecha */}
        <Card>
          <SectionHeader title="Información General" section="patient" />
          {expandedSections.patient && (
            <CardContent className="p-6">
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Fecha de Evaluación"
                    type="date"
                    value={formData.evaluationDate}
                    onChange={(e) => handleChange('evaluationDate', e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DisplayField label="Paciente" value={evaluation.patient?.name} />
                  <DisplayField label="CI" value={evaluation.patient?.id} />
                  <DisplayField label="Fecha de Evaluación" value={evaluation.evaluationDate} type="date" />
                  <DisplayField label="Creado" value={evaluation.createdAt} type="date" />
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Scores Pronósticos */}
        <Card>
          <SectionHeader title="Scores Pronósticos" section="scores" />
          {expandedSections.scores && (
            <CardContent className="p-6">
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="MELD"
                    type="number"
                    value={formData.meld}
                    onChange={(e) => handleChange('meld', e.target.value)}
                    placeholder="6-40"
                  />
                  <Input
                    label="MELD-Na"
                    type="number"
                    value={formData.meldNa}
                    onChange={(e) => handleChange('meldNa', e.target.value)}
                    placeholder="6-40"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Child-Pugh</label>
                    <select
                      value={formData.child}
                      onChange={(e) => handleChange('child', e.target.value)}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <DisplayField label="MELD" value={evaluation.meld} />
                  <DisplayField label="MELD-Na" value={evaluation.meldNa} />
                  <DisplayField label="Child-Pugh" value={evaluation.child} />
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Etiología */}
        <Card>
          <SectionHeader title="Etiología de la Hepatopatía" section="etiology" />
          {expandedSections.etiology && (
            <CardContent className="p-6 space-y-4">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Etiología Principal
                      </label>
                      <select
                        value={formData.etiology1}
                        onChange={(e) => handleChange('etiology1', e.target.value)}
                        className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                        disabled={loadingEtiologies}
                      >
                        <option value="">Seleccionar etiología...</option>
                        {etiologies.filter(e => e.active).map((etiology) => (
                          <option key={etiology.id} value={etiology.code}>
                            {etiology.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Etiología Secundaria
                      </label>
                      <select
                        value={formData.etiology2}
                        onChange={(e) => handleChange('etiology2', e.target.value)}
                        className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                        disabled={loadingEtiologies}
                      >
                        <option value="">Ninguna</option>
                        {etiologies.filter(e => e.active).map((etiology) => (
                          <option key={etiology.id} value={etiology.code}>
                            {etiology.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isFulminant"
                      checked={formData.isFulminant}
                      onChange={(e) => handleChange('isFulminant', e.target.checked)}
                      className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                    />
                    <label htmlFor="isFulminant" className="text-sm text-gray-300">
                      Hepatopatía Fulminante
                    </label>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DisplayField label="Etiología Principal" value={evaluation.etiology1} />
                  <DisplayField label="Etiología Secundaria" value={evaluation.etiology2} />
                  <DisplayField label="Hepatopatía Fulminante" value={evaluation.isFulminant} type="boolean" />
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Examen Físico */}
        <Card>
          <SectionHeader title="Examen Físico" section="physicalExam" />
          {expandedSections.physicalExam && (
            <CardContent className="p-6 space-y-4">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Mallampati</label>
                      <select
                        value={formData.mpt}
                        onChange={(e) => handleChange('mpt', e.target.value)}
                        className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="I">Clase I</option>
                        <option value="II">Clase II</option>
                        <option value="III">Clase III</option>
                        <option value="IV">Clase IV</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Apertura Bucal</label>
                      <select
                        value={formData.mouthOpening}
                        onChange={(e) => handleChange('mouthOpening', e.target.value)}
                        className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="normal">Normal (&gt;3 dedos)</option>
                        <option value="3dedos">3 dedos</option>
                        <option value="2dedos">2 dedos (limitada)</option>
                        <option value="1dedo">1 dedo (muy limitada)</option>
                        <option value="limitada">Limitada</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Observaciones</label>
                    <textarea
                      value={formData.physicalExamObs}
                      onChange={(e) => handleChange('physicalExamObs', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DisplayField label="Mallampati" value={evaluation.mpt} />
                    <DisplayField label="Apertura Bucal" value={evaluation.mouthOpening} />
                  </div>
                  {evaluation.physicalExamObs && (
                    <DisplayField label="Observaciones" value={evaluation.physicalExamObs} />
                  )}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Comorbilidades Cardiovasculares */}
        <Card>
          <SectionHeader title="Comorbilidades Cardiovasculares" section="cardiovascular" />
          {expandedSections.cardiovascular && (
            <CardContent className="p-6 space-y-4">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {['hypertension', 'coronaryDisease', 'arrhythmia', 'dilatedCardio', 'hypertensiveCardio'].map((field) => (
                      <div key={field} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={field}
                          checked={formData[field]}
                          onChange={(e) => handleChange(field, e.target.checked)}
                          className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                        />
                        <label htmlFor={field} className="text-sm text-gray-300">
                          {field === 'hypertension' && 'Hipertensión'}
                          {field === 'coronaryDisease' && 'Enfermedad Coronaria'}
                          {field === 'arrhythmia' && 'Arritmia'}
                          {field === 'dilatedCardio' && 'Miocardiopatía Dilatada'}
                          {field === 'hypertensiveCardio' && 'Cardiopatía Hipertensiva'}
                        </label>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Valvulopatía</label>
                    <select
                      value={formData.valvulopathy}
                      onChange={(e) => handleChange('valvulopathy', e.target.value)}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                    >
                      <option value="">Sin valvulopatía</option>
                      <option value="insuf_mitral_leve">Insuficiencia mitral leve</option>
                      <option value="insuf_mitral_moderada">Insuficiencia mitral moderada</option>
                      <option value="insuf_mitral_severa">Insuficiencia mitral severa</option>
                      <option value="insuf_aortica_leve">Insuficiencia aórtica leve</option>
                      <option value="insuf_aortica_moderada">Insuficiencia aórtica moderada</option>
                      <option value="insuf_aortica_severa">Insuficiencia aórtica severa</option>
                      <option value="insuf_tricuspidea">Insuficiencia tricuspídea</option>
                      <option value="estenosis_mitral">Estenosis mitral</option>
                      <option value="estenosis_aortica">Estenosis aórtica</option>
                      <option value="protesis_valvular">Prótesis valvular</option>
                      <option value="otra">Otra (especificar en observaciones)</option>
                    </select>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <DisplayField label="Hipertensión" value={evaluation.hypertension} type="boolean" />
                  <DisplayField label="Enfermedad Coronaria" value={evaluation.coronaryDisease} type="boolean" />
                  <DisplayField label="Arritmia" value={evaluation.arrhythmia} type="boolean" />
                  <DisplayField label="Miocardiopatía Dilatada" value={evaluation.dilatedCardio} type="boolean" />
                  <DisplayField label="Cardiopatía Hipertensiva" value={evaluation.hypertensiveCardio} type="boolean" />
                  <DisplayField label="Valvulopatía" value={evaluation.valvulopathy} />
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Comorbilidades Respiratorias */}
        <Card>
          <SectionHeader title="Comorbilidades Respiratorias" section="respiratory" />
          {expandedSections.respiratory && (
            <CardContent className="p-6">
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="smokerCOPD"
                      checked={formData.smokerCOPD}
                      onChange={(e) => handleChange('smokerCOPD', e.target.checked)}
                      className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                    />
                    <label htmlFor="smokerCOPD" className="text-sm text-gray-300">Tabaquismo / EPOC</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="asthma"
                      checked={formData.asthma}
                      onChange={(e) => handleChange('asthma', e.target.checked)}
                      className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                    />
                    <label htmlFor="asthma" className="text-sm text-gray-300">Asma</label>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DisplayField label="Tabaquismo / EPOC" value={evaluation.smokerCOPD} type="boolean" />
                  <DisplayField label="Asma" value={evaluation.asthma} type="boolean" />
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Otras Comorbilidades */}
        <Card>
          <SectionHeader title="Otras Comorbilidades" section="otherComorbidities" />
          {expandedSections.otherComorbidities && (
            <CardContent className="p-6 space-y-4">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="diabetes"
                        checked={formData.diabetes}
                        onChange={(e) => handleChange('diabetes', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="diabetes" className="text-sm text-gray-300">Diabetes</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="renalFailure"
                        checked={formData.renalFailure}
                        onChange={(e) => handleChange('renalFailure', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="renalFailure" className="text-sm text-gray-300">Insuficiencia Renal</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="singleKidney"
                        checked={formData.singleKidney}
                        onChange={(e) => handleChange('singleKidney', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="singleKidney" className="text-sm text-gray-300">Monorreno</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="thyroidDysfunction"
                        checked={formData.thyroidDysfunction}
                        onChange={(e) => handleChange('thyroidDysfunction', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="thyroidDysfunction" className="text-sm text-gray-300">Disfunción Tiroidea</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="refluxUlcer"
                        checked={formData.refluxUlcer}
                        onChange={(e) => handleChange('refluxUlcer', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="refluxUlcer" className="text-sm text-gray-300">Reflujo / Úlcera</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="pregnancy"
                        checked={formData.pregnancy}
                        onChange={(e) => handleChange('pregnancy', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="pregnancy" className="text-sm text-gray-300">Embarazo / Puerperio</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="previousAbdSurgery"
                        checked={formData.previousAbdSurgery}
                        onChange={(e) => handleChange('previousAbdSurgery', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="previousAbdSurgery" className="text-sm text-gray-300">Cirugía Abdominal Previa</label>
                    </div>
                  </div>
                  {formData.previousAbdSurgery && (
                    <Input
                      label="Detalle de Cirugía Abdominal Previa"
                      value={formData.abdSurgeryDetail}
                      onChange={(e) => handleChange('abdSurgeryDetail', e.target.value)}
                    />
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Alergias</label>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="text-xs text-gray-400">Alergias comunes:</span>
                      {['Penicilina', 'Cefalosporinas', 'AINEs', 'Aspirina', 'Látex', 'Yodo/Contrastes', 'Morfina', 'Fentanilo', 'Tramadol'].map(allergy => (
                        <button
                          key={allergy}
                          type="button"
                          onClick={() => {
                            const current = formData.allergies || '';
                            const separator = current && !current.endsWith(', ') && !current.endsWith(',') ? ', ' : '';
                            handleChange('allergies', current + separator + allergy);
                          }}
                          className="text-xs px-2 py-1 bg-dark-500 border border-dark-400 rounded text-gray-300 hover:bg-dark-400 hover:border-surgical-500 transition-colors"
                        >
                          + {allergy}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={formData.allergies}
                      onChange={(e) => handleChange('allergies', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <DisplayField label="Diabetes" value={evaluation.diabetes} type="boolean" />
                    <DisplayField label="Insuficiencia Renal" value={evaluation.renalFailure} type="boolean" />
                    <DisplayField label="Monorreno" value={evaluation.singleKidney} type="boolean" />
                    <DisplayField label="Disfunción Tiroidea" value={evaluation.thyroidDysfunction} type="boolean" />
                    <DisplayField label="Reflujo / Úlcera" value={evaluation.refluxUlcer} type="boolean" />
                    <DisplayField label="Embarazo / Puerperio" value={evaluation.pregnancy} type="boolean" />
                    <DisplayField label="Cirugía Abdominal Previa" value={evaluation.previousAbdSurgery} type="boolean" />
                  </div>
                  {evaluation.abdSurgeryDetail && (
                    <DisplayField label="Detalle de Cirugía Abdominal Previa" value={evaluation.abdSurgeryDetail} />
                  )}
                  {evaluation.allergies && (
                    <DisplayField label="Alergias" value={evaluation.allergies} />
                  )}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Complicaciones de Cirrosis */}
        <Card>
          <SectionHeader title="Complicaciones de Cirrosis" section="cirrhosisComplications" />
          {expandedSections.cirrhosisComplications && (
            <CardContent className="p-6 space-y-4">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="portalHypertension"
                        checked={formData.portalHypertension}
                        onChange={(e) => handleChange('portalHypertension', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="portalHypertension" className="text-sm text-gray-300">Hipertensión Portal</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="ascites"
                        checked={formData.ascites}
                        onChange={(e) => handleChange('ascites', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="ascites" className="text-sm text-gray-300">Ascitis</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="encephalopathy"
                        checked={formData.encephalopathy}
                        onChange={(e) => handleChange('encephalopathy', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="encephalopathy" className="text-sm text-gray-300">Encefalopatía Hepática</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="esophagealVarices"
                        checked={formData.esophagealVarices}
                        onChange={(e) => handleChange('esophagealVarices', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="esophagealVarices" className="text-sm text-gray-300">Várices Esofágicas</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="bleeding"
                        checked={formData.bleeding}
                        onChange={(e) => handleChange('bleeding', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="bleeding" className="text-sm text-gray-300">Sangrado</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="hepatoRenalSyndrome"
                        checked={formData.hepatoRenalSyndrome}
                        onChange={(e) => handleChange('hepatoRenalSyndrome', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="hepatoRenalSyndrome" className="text-sm text-gray-300">Síndrome Hepatorrenal</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="hepatoPulmonarySyndr"
                        checked={formData.hepatoPulmonarySyndr}
                        onChange={(e) => handleChange('hepatoPulmonarySyndr', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="hepatoPulmonarySyndr" className="text-sm text-gray-300">Síndrome Hepatopulmonar</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="pulmonaryHypertension"
                        checked={formData.pulmonaryHypertension}
                        onChange={(e) => handleChange('pulmonaryHypertension', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="pulmonaryHypertension" className="text-sm text-gray-300">Hipertensión Pulmonar</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="hydrothorax"
                        checked={formData.hydrothorax}
                        onChange={(e) => handleChange('hydrothorax', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="hydrothorax" className="text-sm text-gray-300">Hidrotórax</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="sbe"
                        checked={formData.sbe}
                        onChange={(e) => handleChange('sbe', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="sbe" className="text-sm text-gray-300">Peritonitis Bacteriana Espontánea</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="portalThrombosis"
                        checked={formData.portalThrombosis}
                        onChange={(e) => handleChange('portalThrombosis', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="portalThrombosis" className="text-sm text-gray-300">Trombosis Portal</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="hepatocarcinoma"
                        checked={formData.hepatocarcinoma}
                        onChange={(e) => handleChange('hepatocarcinoma', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="hepatocarcinoma" className="text-sm text-gray-300">Hepatocarcinoma</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="hyponatremia"
                        checked={formData.hyponatremia}
                        onChange={(e) => handleChange('hyponatremia', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="hyponatremia" className="text-sm text-gray-300">Hiponatremia</label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Observaciones sobre Complicaciones</label>
                    <textarea
                      value={formData.complicationsObs}
                      onChange={(e) => handleChange('complicationsObs', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <DisplayField label="Hipertensión Portal" value={evaluation.portalHypertension} type="boolean" />
                    <DisplayField label="Ascitis" value={evaluation.ascites} type="boolean" />
                    <DisplayField label="Encefalopatía" value={evaluation.encephalopathy} type="boolean" />
                    <DisplayField label="Várices Esofágicas" value={evaluation.esophagealVarices} type="boolean" />
                    <DisplayField label="Sangrado" value={evaluation.bleeding} type="boolean" />
                    <DisplayField label="Síndrome Hepatorrenal" value={evaluation.hepatoRenalSyndrome} type="boolean" />
                    <DisplayField label="Síndrome Hepatopulmonar" value={evaluation.hepatoPulmonarySyndr} type="boolean" />
                    <DisplayField label="Hipertensión Pulmonar" value={evaluation.pulmonaryHypertension} type="boolean" />
                    <DisplayField label="Hidrotórax" value={evaluation.hydrothorax} type="boolean" />
                    <DisplayField label="PBE" value={evaluation.sbe} type="boolean" />
                    <DisplayField label="Trombosis Portal" value={evaluation.portalThrombosis} type="boolean" />
                    <DisplayField label="Hepatocarcinoma" value={evaluation.hepatocarcinoma} type="boolean" />
                    <DisplayField label="Hiponatremia" value={evaluation.hyponatremia} type="boolean" />
                  </div>
                  {evaluation.complicationsObs && (
                    <div className="mt-4">
                      <DisplayField label="Observaciones" value={evaluation.complicationsObs} />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          )}
        </Card>

        {/* Estado Funcional */}
        <Card>
          <SectionHeader title="Estado Funcional" section="functionalStatus" />
          {expandedSections.functionalStatus && (
            <CardContent className="p-6 space-y-4">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Clase Funcional (NYHA)</label>
                      <select
                        value={formData.functionalClass}
                        onChange={(e) => handleChange('functionalClass', e.target.value)}
                        className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="I">Clase I</option>
                        <option value="II">Clase II</option>
                        <option value="III">Clase III</option>
                        <option value="IV">Clase IV</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pt-8">
                      <input
                        type="checkbox"
                        id="mechanicalVent"
                        checked={formData.mechanicalVent}
                        onChange={(e) => handleChange('mechanicalVent', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="mechanicalVent" className="text-sm text-gray-300">Ventilación Mecánica</label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Medicación Habitual</label>
                    <textarea
                      value={formData.habitualMeds}
                      onChange={(e) => handleChange('habitualMeds', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DisplayField label="Clase Funcional" value={evaluation.functionalClass} />
                    <DisplayField label="Ventilación Mecánica" value={evaluation.mechanicalVent} type="boolean" />
                  </div>
                  {evaluation.habitualMeds && (
                    <DisplayField label="Medicación Habitual" value={evaluation.habitualMeds} />
                  )}
                </>
              )}
            </CardContent>
          )}
        </Card>

        {/* Lista de Espera */}
        <Card>
          <SectionHeader title="Lista de Espera" section="waitlist" />
          {expandedSections.waitlist && (
            <CardContent className="p-6 space-y-4">
              {isEditing ? (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="inList"
                      checked={formData.inList}
                      onChange={(e) => handleChange('inList', e.target.checked)}
                      className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                    />
                    <label htmlFor="inList" className="text-sm font-medium text-gray-300">
                      Ingresa a Lista de Espera
                    </label>
                  </div>
                  {!formData.inList && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Razón de No Ingreso</label>
                      <textarea
                        value={formData.reasonNotInList}
                        onChange={(e) => handleChange('reasonNotInList', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Problemas Identificados</label>
                    <textarea
                      value={formData.problems}
                      onChange={(e) => handleChange('problems', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <DisplayField label="En Lista de Espera" value={evaluation.inList} type="boolean" />
                  {evaluation.reasonNotInList && (
                    <DisplayField label="Razón de No Ingreso" value={evaluation.reasonNotInList} />
                  )}
                  {evaluation.problems && (
                    <DisplayField label="Problemas Identificados" value={evaluation.problems} />
                  )}
                </>
              )}
            </CardContent>
          )}
        </Card>

        {/* Laboratorios */}
        <Card>
          <SectionHeader title="Laboratorios Pretrasplante" section="labs" />
          {expandedSections.labs && (
            <CardContent className="p-6">
              {evaluation.labs && evaluation.labs.length > 0 ? (
                <div className="space-y-6">
                  {evaluation.labs.map((lab, index) => (
                    <div key={lab.id} className="border border-dark-400 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-gray-200 mb-4">
                        Laboratorio {index + 1} - {formatDate(lab.labDate)}
                      </h4>
                      <div className="space-y-6">
                        {/* Hematología */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-300 mb-2 pb-2 border-b border-dark-400">
                            Hematología
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <DisplayField label="Hemoglobina (g/dL)" value={lab.hb} />
                            <DisplayField label="Hematocrito (%)" value={lab.hto} />
                            <DisplayField label="Plaquetas (10³/µL)" value={lab.platelets} />
                          </div>
                        </div>

                        {/* Coagulación */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-300 mb-2 pb-2 border-b border-dark-400">
                            Coagulación
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <DisplayField label="TP (seg)" value={lab.pt} />
                            <DisplayField label="INR" value={lab.inr} />
                            <DisplayField label="Fibrinógeno (mg/dL)" value={lab.fibrinogen} />
                          </div>
                        </div>

                        {/* Bioquímica */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-300 mb-2 pb-2 border-b border-dark-400">
                            Bioquímica
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <DisplayField label="Glucemia (mg/dL)" value={lab.glucose} />
                            <DisplayField label="Sodio (mEq/L)" value={lab.sodium} />
                            <DisplayField label="Potasio (mEq/L)" value={lab.potassium} />
                            <DisplayField label="Calcio Iónico (mmol/L)" value={lab.ionicCalcium} />
                            <DisplayField label="Magnesio (mEq/L)" value={lab.magnesium} />
                            <DisplayField label="Azotemia (mg/dL)" value={lab.azotemia} />
                            <DisplayField label="Creatinina (mg/dL)" value={lab.creatinine} />
                            <DisplayField label="TFG (mL/min/1.73m²)" value={lab.gfr} />
                          </div>
                        </div>

                        {/* Función Hepática */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-300 mb-2 pb-2 border-b border-dark-400">
                            Función Hepática
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <DisplayField label="SGOT/AST (U/L)" value={lab.sgot} />
                            <DisplayField label="SGPT/ALT (U/L)" value={lab.sgpt} />
                            <DisplayField label="Bilirrubina Total (mg/dL)" value={lab.totalBili} />
                            <DisplayField label="Albúmina (g/dL)" value={lab.albumin} />
                          </div>
                        </div>

                        {/* Otros */}
                        {lab.tsh && (
                          <div>
                            <h5 className="text-sm font-semibold text-gray-300 mb-2 pb-2 border-b border-dark-400">
                              Otros
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <DisplayField label="TSH (µUI/mL)" value={lab.tsh} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">No hay laboratorios registrados</p>
              )}
            </CardContent>
          )}
        </Card>

        {/* Archivos Adjuntos / Estudios Complementarios */}
        <PreopAttachments preopId={params.id} editable={canEdit} />
      </div>

      {/* Botones de Acción */}
      {isEditing && (
        <div className="flex justify-end gap-3 sticky bottom-4 bg-dark-800 p-4 rounded-lg border border-dark-400">
          <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function PreopEvaluationDetail() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="h-full px-8 py-6">
          <PreopEvaluationDetailContent />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
