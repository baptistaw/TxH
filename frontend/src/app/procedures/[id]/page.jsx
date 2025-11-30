'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Card, { CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { proceduresApi } from '@/lib/api';
import { downloadProcedurePDF } from '@/lib/pdfService';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import { formatDate, formatDateTime } from '@/lib/utils';
import { PageSpinner } from '@/components/ui/Spinner';
import { useAuth } from '@/contexts/AuthContext';

function ProcedureDetailContent() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [procedure, setProcedure] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Estado de secciones colapsables
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    preop: true,
    anesthesia: true,
    postop: true,
    intraop: true,
    quality: true, // Indicadores de Calidad
  });

  // Estado del formulario
  const [formData, setFormData] = useState(null);

  // Estado para registros intraoperatorios
  const [showIntraopModal, setShowIntraopModal] = useState(false);
  const [editingIntraopRecord, setEditingIntraopRecord] = useState(null);
  const [intraopFormData, setIntraopFormData] = useState({
    timestamp: '',
    heartRate: '',
    pas: '',
    pad: '',
    pam: '',
    satO2: '',
    temp: '',
    fio2: '',
    tidalVolume: '',
    respRate: '',
    peep: '',
    peakPressure: '',
    // Laboratorios
    hb: '',
    hto: '',
    platelets: '',
    pt: '',
    inr: '',
    fibrinogen: '',
    sodium: '',
    potassium: '',
    ionicCalcium: '',
    pH: '',
    paO2: '',
    paCO2: '',
    hco3: '',
    baseExcess: '',
    lactate: '',
    creatinine: '',
    glucose: '',
  });

  useEffect(() => {
    loadProcedure();
  }, [params.id]);

  const loadProcedure = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await proceduresApi.getById(params.id);
      setProcedure(data);
      initFormData(data);
    } catch (err) {
      console.error('Error loading procedure:', err);
      setError('Error al cargar el procedimiento');
    } finally {
      setLoading(false);
    }
  };

  const initFormData = (data) => {
    setFormData({
      startAt: data.startAt ? new Date(data.startAt).toISOString().slice(0, 16) : '',
      endAt: data.endAt ? new Date(data.endAt).toISOString().slice(0, 16) : '',
      procedureType: data.procedureType || '',
      procedureTypeDetail: data.procedureTypeDetail || '',
      location: data.location || '',
      asa: data.asa || '',
      airwayPreop: data.airwayPreop || '',
      ventilationPreop: data.ventilationPreop || '',
      hemodynamicsPreop: data.hemodynamicsPreop || '',
      gcs: data.gcs || '',
      provenance: data.provenance || '',
      premedication: data.premedication || false,
      prophylacticATB: data.prophylacticATB || '',
      airwayIntraop: data.airwayIntraop || '',
      fullStomach: data.fullStomach || false,
      rapidSequence: data.rapidSequence || false,
      difficultAirway: data.difficultAirway || false,
      position: data.position || '',
      anesthesiaTech: data.anesthesiaTech || '',
      ventilationIntraop: data.ventilationIntraop || '',
      ventModeDetail: data.ventModeDetail || '',
      regionalAnesthesia: data.regionalAnesthesia || '',
      destination: data.destination || '',
      airwayPostop: data.airwayPostop || '',
      ventilationPostop: data.ventilationPostop || '',
      hemodynamicsPostop: data.hemodynamicsPostop || '',
      complications: data.complications || '',
      // Indicadores de Calidad (KPIs) - Solo para trasplantes
      bloodReplacementProtocol: data.bloodReplacementProtocol ?? null,
      bloodReplacementProtocolReason: data.bloodReplacementProtocolReason || '',
      antibioticProphylaxisProtocol: data.antibioticProphylaxisProtocol ?? null,
      antibioticProphylaxisProtocolReason: data.antibioticProphylaxisProtocolReason || '',
      fastTrackProtocol: data.fastTrackProtocol ?? null,
      fastTrackProtocolReason: data.fastTrackProtocolReason || '',
    });
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Verificar si el usuario puede editar
  // Solo admin o el anestesiólogo asignado pueden editar
  const canEdit = user && procedure && (
    user.role === 'ADMIN' ||
    (user.role === 'ANESTESIOLOGO' && procedure.clinicianId && String(user.id) === String(procedure.clinicianId))
  );

  // Debug: log para verificar permisos
  useEffect(() => {
    if (user && procedure) {
      console.log('🔐 Debug de permisos:');
      console.log('Usuario ID:', user.id, '(tipo:', typeof user.id, ')');
      console.log('Usuario rol:', user.role);
      console.log('Procedimiento clinicianId:', procedure.clinicianId, '(tipo:', typeof procedure.clinicianId, ')');
      console.log('¿Puede editar?', canEdit);
      console.log('Comparación IDs:', String(user.id) === String(procedure.clinicianId));
    }
  }, [user, procedure, canEdit]);

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
    initFormData(procedure);
    setError(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Calcular duración
      let duration = null;
      if (formData.startAt && formData.endAt) {
        const start = new Date(formData.startAt);
        const end = new Date(formData.endAt);
        duration = Math.round((end - start) / (1000 * 60));
      }

      const payload = {
        startAt: formData.startAt ? new Date(formData.startAt).toISOString() : null,
        endAt: formData.endAt ? new Date(formData.endAt).toISOString() : null,
        duration,
        procedureType: formData.procedureType || null,
        procedureTypeDetail: formData.procedureTypeDetail || null,
        location: formData.location || null,
        asa: formData.asa || null,
        airwayPreop: formData.airwayPreop || null,
        ventilationPreop: formData.ventilationPreop || null,
        hemodynamicsPreop: formData.hemodynamicsPreop || null,
        gcs: formData.gcs ? parseInt(formData.gcs) : null,
        provenance: formData.provenance || null,
        premedication: formData.premedication,
        prophylacticATB: formData.prophylacticATB || null,
        airwayIntraop: formData.airwayIntraop || null,
        fullStomach: formData.fullStomach,
        rapidSequence: formData.rapidSequence,
        difficultAirway: formData.difficultAirway,
        position: formData.position || null,
        anesthesiaTech: formData.anesthesiaTech || null,
        ventilationIntraop: formData.ventilationIntraop || null,
        ventModeDetail: formData.ventModeDetail || null,
        regionalAnesthesia: formData.regionalAnesthesia || null,
        destination: formData.destination || null,
        airwayPostop: formData.airwayPostop || null,
        ventilationPostop: formData.ventilationPostop || null,
        hemodynamicsPostop: formData.hemodynamicsPostop || null,
        complications: formData.complications || null,
        // Indicadores de Calidad (KPIs)
        bloodReplacementProtocol: formData.bloodReplacementProtocol,
        bloodReplacementProtocolReason: formData.bloodReplacementProtocolReason || null,
        antibioticProphylaxisProtocol: formData.antibioticProphylaxisProtocol,
        antibioticProphylaxisProtocolReason: formData.antibioticProphylaxisProtocolReason || null,
        fastTrackProtocol: formData.fastTrackProtocol,
        fastTrackProtocolReason: formData.fastTrackProtocolReason || null,
      };

      const updated = await proceduresApi.update(params.id, payload);
      setProcedure(updated);
      setIsEditing(false);
      await loadProcedure();
    } catch (err) {
      console.error('Error updating procedure:', err);
      setError(err.message || 'Error al actualizar el procedimiento');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloadingPDF(true);
      setError(null);
      downloadProcedurePDF(procedure);
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
      const result = await exportsApi.emailProcedurePDF(params.id);
      alert(`PDF enviado exitosamente a ${result.recipients} destinatario(s)`);
    } catch (err) {
      console.error('Error emailing PDF:', err);
      setError('Error al enviar el PDF por email');
    } finally {
      setSendingEmail(false);
    }
  };

  // Funciones para registros intraoperatorios
  const handleAddIntraopRecord = () => {
    setEditingIntraopRecord(null);
    setIntraopFormData({
      timestamp: new Date().toISOString().slice(0, 16),
      heartRate: '',
      pas: '',
      pad: '',
      pam: '',
      satO2: '',
      temp: '',
      fio2: '',
      tidalVolume: '',
      respRate: '',
      peep: '',
      peakPressure: '',
    });
    setShowIntraopModal(true);
  };

  const handleEditIntraopRecord = (record) => {
    setEditingIntraopRecord(record);
    setIntraopFormData({
      timestamp: new Date(record.timestamp).toISOString().slice(0, 16),
      heartRate: record.heartRate || '',
      pas: record.pas || '',
      pad: record.pad || '',
      pam: record.pam || '',
      satO2: record.satO2 || '',
      temp: record.temp || '',
      fio2: record.fio2 || '',
      tidalVolume: record.tidalVolume || '',
      respRate: record.respRate || '',
      peep: record.peep || '',
      peakPressure: record.peakPressure || '',
      // Laboratorios
      hb: record.hb || '',
      hto: record.hto || '',
      platelets: record.platelets || '',
      pt: record.pt || '',
      inr: record.inr || '',
      fibrinogen: record.fibrinogen || '',
      sodium: record.sodium || '',
      potassium: record.potassium || '',
      ionicCalcium: record.ionicCalcium || '',
      pH: record.pH || '',
      paO2: record.paO2 || '',
      paCO2: record.paCO2 || '',
      hco3: record.hco3 || '',
      baseExcess: record.baseExcess || '',
      lactate: record.lactate || '',
      creatinine: record.creatinine || '',
      glucose: record.glucose || '',
    });
    setShowIntraopModal(true);
  };

  const handleSaveIntraopRecord = async () => {
    try {
      setSaving(true);
      setError(null);

      const payload = {
        timestamp: new Date(intraopFormData.timestamp).toISOString(),
        heartRate: intraopFormData.heartRate ? parseInt(intraopFormData.heartRate) : null,
        pas: intraopFormData.pas ? parseInt(intraopFormData.pas) : null,
        pad: intraopFormData.pad ? parseInt(intraopFormData.pad) : null,
        pam: intraopFormData.pam ? parseInt(intraopFormData.pam) : null,
        satO2: intraopFormData.satO2 ? parseInt(intraopFormData.satO2) : null,
        temp: intraopFormData.temp ? parseFloat(intraopFormData.temp) : null,
        fio2: intraopFormData.fio2 ? parseFloat(intraopFormData.fio2) : null,
        tidalVolume: intraopFormData.tidalVolume ? parseInt(intraopFormData.tidalVolume) : null,
        respRate: intraopFormData.respRate ? parseInt(intraopFormData.respRate) : null,
        peep: intraopFormData.peep ? parseInt(intraopFormData.peep) : null,
        peakPressure: intraopFormData.peakPressure ? parseInt(intraopFormData.peakPressure) : null,
        // Laboratorios
        hb: intraopFormData.hb ? parseFloat(intraopFormData.hb) : null,
        hto: intraopFormData.hto ? parseFloat(intraopFormData.hto) : null,
        platelets: intraopFormData.platelets ? parseFloat(intraopFormData.platelets) : null,
        pt: intraopFormData.pt ? parseFloat(intraopFormData.pt) : null,
        inr: intraopFormData.inr ? parseFloat(intraopFormData.inr) : null,
        fibrinogen: intraopFormData.fibrinogen ? parseFloat(intraopFormData.fibrinogen) : null,
        sodium: intraopFormData.sodium ? parseFloat(intraopFormData.sodium) : null,
        potassium: intraopFormData.potassium ? parseFloat(intraopFormData.potassium) : null,
        ionicCalcium: intraopFormData.ionicCalcium ? parseFloat(intraopFormData.ionicCalcium) : null,
        pH: intraopFormData.pH ? parseFloat(intraopFormData.pH) : null,
        paO2: intraopFormData.paO2 ? parseFloat(intraopFormData.paO2) : null,
        paCO2: intraopFormData.paCO2 ? parseFloat(intraopFormData.paCO2) : null,
        hco3: intraopFormData.hco3 ? parseFloat(intraopFormData.hco3) : null,
        baseExcess: intraopFormData.baseExcess ? parseFloat(intraopFormData.baseExcess) : null,
        lactate: intraopFormData.lactate ? parseFloat(intraopFormData.lactate) : null,
        creatinine: intraopFormData.creatinine ? parseFloat(intraopFormData.creatinine) : null,
        glucose: intraopFormData.glucose ? parseFloat(intraopFormData.glucose) : null,
      };

      if (editingIntraopRecord) {
        await proceduresApi.updateIntraopRecord(params.id, editingIntraopRecord.id, payload);
      } else {
        await proceduresApi.createIntraopRecord(params.id, payload);
      }

      setShowIntraopModal(false);
      await loadProcedure();
    } catch (err) {
      console.error('Error saving intraop record:', err);
      setError(err.message || 'Error al guardar el registro intraoperatorio');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteIntraopRecord = async (recordId) => {
    if (!confirm('¿Está seguro de eliminar este registro intraoperatorio?')) return;

    try {
      setSaving(true);
      setError(null);
      await proceduresApi.deleteIntraopRecord(params.id, recordId);
      await loadProcedure();
    } catch (err) {
      console.error('Error deleting intraop record:', err);
      setError(err.message || 'Error al eliminar el registro');
    } finally {
      setSaving(false);
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
    } else if (type === 'datetime') {
      displayValue = value ? formatDateTime(value) : '-';
    } else if (type === 'date') {
      displayValue = value ? formatDate(value) : '-';
    } else if (!value && value !== 0 && value !== false) {
      displayValue = '-';
    }

    // Formatear tipos de procedimiento
    if (label === 'Tipo de Procedimiento' && value) {
      const typeLabels = {
        BIOPSIA_HEPATICA: 'Biopsia Hepática',
        BIOPSIA_PERCUTANEA: 'Biopsia Percutánea',
        FGC_DIAGNOSTICA: 'FGC Diagnóstica',
        FGC_BIOPSIA: 'FGC Biopsia',
        CER: 'CER',
        FBC_BIOPSIA: 'FBC Biopsia',
        OTRO: 'Otro'
      };
      displayValue = typeLabels[value] || value;
    }

    // Formatear vía aérea
    if ((label.includes('Vía Aérea') || label.includes('Airway')) && value) {
      const airwayLabels = {
        VAN: 'VAN (Vía Aérea Natural)',
        IOT: 'IOT (Intubación)',
        TQT: 'TQT (Traqueostomía)',
        MF: 'MF (Máscara Facial)',
        ML: 'ML (Máscara Laríngea)'
      };
      displayValue = airwayLabels[value] || value;
    }

    // Formatear técnica anestésica
    if (label === 'Técnica Anestésica' && value) {
      const techLabels = {
        AGB: 'AGB (Anestesia General Balanceada)',
        AL_POTENCIADA: 'AL Potenciada',
        SEDACION_LEVE: 'Sedación Leve',
        SEDACION_PROFUNDA: 'Sedación Profunda',
        REGIONAL: 'Regional',
        COMBINADA: 'Combinada'
      };
      displayValue = techLabels[value] || value;
    }

    // Formatear hemodinámica
    if (label.includes('Hemodinámica') && value) {
      const hemoLabels = {
        ESTABLE: 'Estable',
        INESTABLE: 'Inestable',
        CRITICO: 'Crítico'
      };
      displayValue = hemoLabels[value] || value;
    }

    // Formatear ventilación
    if (label.includes('Ventilación') && value) {
      const ventLabels = {
        VAN: 'No ventilación',
        VESP: 'Ventilación Espontánea',
        ARM: 'ARM (Asistencia Respiratoria Mecánica)',
        MF_ESPONTANEA: 'Máscara Facial Espontánea'
      };
      displayValue = ventLabels[value] || value;
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

  if (!procedure) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No se encontró el procedimiento</p>
        <Link href="/procedures">
          <Button className="mt-4" variant="outline">
            Volver a la lista
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/procedures">
            <Button variant="ghost" size="sm">
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-100">Procedimiento Quirúrgico</h1>
            <p className="text-gray-400 mt-1">
              {procedure.patient?.name} - CI: {procedure.patient?.id}
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
        {/* Datos Básicos */}
        <Card>
          <SectionHeader title="Datos Básicos" section="basic" />
          {expandedSections.basic && (
            <CardContent className="p-6 space-y-4">
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Procedimiento</label>
                    <select
                      value={formData.procedureType}
                      onChange={(e) => handleChange('procedureType', e.target.value)}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="BIOPSIA_HEPATICA">Biopsia Hepática</option>
                      <option value="BIOPSIA_PERCUTANEA">Biopsia Percutánea</option>
                      <option value="FGC_DIAGNOSTICA">FGC Diagnóstica</option>
                      <option value="FGC_BIOPSIA">FGC Biopsia</option>
                      <option value="CER">CER</option>
                      <option value="FBC_BIOPSIA">FBC Biopsia</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>

                  <Input
                    label="Detalle del Procedimiento"
                    value={formData.procedureTypeDetail}
                    onChange={(e) => handleChange('procedureTypeDetail', e.target.value)}
                  />

                  <Input
                    label="Ubicación"
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    placeholder="BQ, CTI, Sala..."
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">ASA</label>
                    <select
                      value={formData.asa}
                      onChange={(e) => handleChange('asa', e.target.value)}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="I">I</option>
                      <option value="II">II</option>
                      <option value="III">III</option>
                      <option value="IV">IV</option>
                      <option value="V">V</option>
                      <option value="VI">VI</option>
                    </select>
                  </div>

                  <Input
                    label="Fecha/Hora Inicio"
                    type="datetime-local"
                    value={formData.startAt}
                    onChange={(e) => handleChange('startAt', e.target.value)}
                  />

                  <Input
                    label="Fecha/Hora Fin"
                    type="datetime-local"
                    value={formData.endAt}
                    onChange={(e) => handleChange('endAt', e.target.value)}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DisplayField label="Paciente" value={procedure.patient?.name} />
                  <DisplayField label="CI" value={procedure.patient?.id} />
                  <DisplayField label="Tipo de Procedimiento" value={procedure.procedureType} />
                  <DisplayField label="Detalle del Procedimiento" value={procedure.procedureTypeDetail} />
                  <DisplayField label="Ubicación" value={procedure.location} />
                  <DisplayField label="ASA" value={procedure.asa} />
                  <DisplayField label="Fecha/Hora Inicio" value={procedure.startAt} type="datetime" />
                  <DisplayField label="Fecha/Hora Fin" value={procedure.endAt} type="datetime" />
                  <DisplayField
                    label="Duración"
                    value={procedure.duration ? `${Math.floor(procedure.duration / 60)}h ${procedure.duration % 60}m` : null}
                  />
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Estado Preoperatorio */}
        <Card>
          <SectionHeader title="Estado Preoperatorio" section="preop" />
          {expandedSections.preop && (
            <CardContent className="p-6 space-y-4">
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Vía Aérea Preop</label>
                    <select
                      value={formData.airwayPreop}
                      onChange={(e) => handleChange('airwayPreop', e.target.value)}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="VAN">VAN (Vía Aérea Natural)</option>
                      <option value="IOT">IOT (Intubación)</option>
                      <option value="TQT">TQT (Traqueostomía)</option>
                      <option value="MF">MF (Máscara Facial)</option>
                      <option value="ML">ML (Máscara Laríngea)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Ventilación Preop</label>
                    <select
                      value={formData.ventilationPreop}
                      onChange={(e) => handleChange('ventilationPreop', e.target.value)}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="VAN">No ventilación</option>
                      <option value="VESP">Ventilación Espontánea</option>
                      <option value="ARM">ARM</option>
                      <option value="MF_ESPONTANEA">Máscara Facial Espontánea</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Hemodinámica Preop</label>
                    <select
                      value={formData.hemodynamicsPreop}
                      onChange={(e) => handleChange('hemodynamicsPreop', e.target.value)}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="ESTABLE">Estable</option>
                      <option value="INESTABLE">Inestable</option>
                      <option value="CRITICO">Crítico</option>
                    </select>
                  </div>

                  <Input
                    label="Glasgow (GCS)"
                    type="number"
                    min="3"
                    max="15"
                    value={formData.gcs}
                    onChange={(e) => handleChange('gcs', e.target.value)}
                  />

                  <Input
                    label="Procedencia"
                    value={formData.provenance}
                    onChange={(e) => handleChange('provenance', e.target.value)}
                    placeholder="Domicilio, CTI, Sala..."
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <DisplayField label="Vía Aérea Preop" value={procedure.airwayPreop} />
                  <DisplayField label="Ventilación Preop" value={procedure.ventilationPreop} />
                  <DisplayField label="Hemodinámica Preop" value={procedure.hemodynamicsPreop} />
                  <DisplayField label="Glasgow (GCS)" value={procedure.gcs} />
                  <DisplayField label="Procedencia" value={procedure.provenance} />
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Manejo Anestésico */}
        <Card>
          <SectionHeader title="Manejo Anestésico" section="anesthesia" />
          {expandedSections.anesthesia && (
            <CardContent className="p-6 space-y-4">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="premedication"
                        checked={formData.premedication}
                        onChange={(e) => handleChange('premedication', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="premedication" className="text-sm text-gray-300">Premedicación</label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="fullStomach"
                        checked={formData.fullStomach}
                        onChange={(e) => handleChange('fullStomach', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="fullStomach" className="text-sm text-gray-300">Estómago Ocupado</label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="rapidSequence"
                        checked={formData.rapidSequence}
                        onChange={(e) => handleChange('rapidSequence', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="rapidSequence" className="text-sm text-gray-300">Secuencia Rápida</label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="difficultAirway"
                        checked={formData.difficultAirway}
                        onChange={(e) => handleChange('difficultAirway', e.target.checked)}
                        className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500"
                      />
                      <label htmlFor="difficultAirway" className="text-sm text-gray-300">IOT Difícil</label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="ATB Profiláctico"
                      value={formData.prophylacticATB}
                      onChange={(e) => handleChange('prophylacticATB', e.target.value)}
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Vía Aérea Intraop</label>
                      <select
                        value={formData.airwayIntraop}
                        onChange={(e) => handleChange('airwayIntraop', e.target.value)}
                        className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="VAN">VAN (Vía Aérea Natural)</option>
                        <option value="IOT">IOT (Intubación)</option>
                        <option value="TQT">TQT (Traqueostomía)</option>
                        <option value="MF">MF (Máscara Facial)</option>
                        <option value="ML">ML (Máscara Laríngea)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Técnica Anestésica</label>
                      <select
                        value={formData.anesthesiaTech}
                        onChange={(e) => handleChange('anesthesiaTech', e.target.value)}
                        className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="AGB">AGB (Anestesia General Balanceada)</option>
                        <option value="AL_POTENCIADA">AL Potenciada</option>
                        <option value="SEDACION_LEVE">Sedación Leve</option>
                        <option value="SEDACION_PROFUNDA">Sedación Profunda</option>
                        <option value="REGIONAL">Regional</option>
                        <option value="COMBINADA">Combinada</option>
                      </select>
                    </div>

                    <Input
                      label="Posición"
                      value={formData.position}
                      onChange={(e) => handleChange('position', e.target.value)}
                      placeholder="DD, DL, etc."
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Ventilación Intraop</label>
                      <select
                        value={formData.ventilationIntraop}
                        onChange={(e) => handleChange('ventilationIntraop', e.target.value)}
                        className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="VAN">No ventilación</option>
                        <option value="VESP">Ventilación Espontánea</option>
                        <option value="ARM">ARM</option>
                        <option value="MF_ESPONTANEA">Máscara Facial Espontánea</option>
                      </select>
                    </div>

                    <Input
                      label="Detalle Modo Ventilatorio"
                      value={formData.ventModeDetail}
                      onChange={(e) => handleChange('ventModeDetail', e.target.value)}
                      placeholder="VCV, PCV, etc."
                    />

                    <Input
                      label="Anestesia Regional"
                      value={formData.regionalAnesthesia}
                      onChange={(e) => handleChange('regionalAnesthesia', e.target.value)}
                      placeholder="Detalle si aplica"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <DisplayField label="Premedicación" value={procedure.premedication} type="boolean" />
                    <DisplayField label="Estómago Ocupado" value={procedure.fullStomach} type="boolean" />
                    <DisplayField label="Secuencia Rápida" value={procedure.rapidSequence} type="boolean" />
                    <DisplayField label="IOT Difícil" value={procedure.difficultAirway} type="boolean" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DisplayField label="ATB Profiláctico" value={procedure.prophylacticATB} />
                    <DisplayField label="Vía Aérea Intraop" value={procedure.airwayIntraop} />
                    <DisplayField label="Técnica Anestésica" value={procedure.anesthesiaTech} />
                    <DisplayField label="Posición" value={procedure.position} />
                    <DisplayField label="Ventilación Intraop" value={procedure.ventilationIntraop} />
                    <DisplayField label="Detalle Modo Ventilatorio" value={procedure.ventModeDetail} />
                    <DisplayField label="Anestesia Regional" value={procedure.regionalAnesthesia} />
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>

        {/* Estado Postoperatorio */}
        <Card>
          <SectionHeader title="Estado Postoperatorio" section="postop" />
          {expandedSections.postop && (
            <CardContent className="p-6 space-y-4">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Destino"
                      value={formData.destination}
                      onChange={(e) => handleChange('destination', e.target.value)}
                      placeholder="Sala, CTI, etc."
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Vía Aérea Postop</label>
                      <select
                        value={formData.airwayPostop}
                        onChange={(e) => handleChange('airwayPostop', e.target.value)}
                        className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="VAN">VAN (Vía Aérea Natural)</option>
                        <option value="IOT">IOT (Intubación)</option>
                        <option value="TQT">TQT (Traqueostomía)</option>
                        <option value="MF">MF (Máscara Facial)</option>
                        <option value="ML">ML (Máscara Laríngea)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Ventilación Postop</label>
                      <select
                        value={formData.ventilationPostop}
                        onChange={(e) => handleChange('ventilationPostop', e.target.value)}
                        className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="VAN">No ventilación</option>
                        <option value="VESP">Ventilación Espontánea</option>
                        <option value="ARM">ARM</option>
                        <option value="MF_ESPONTANEA">Máscara Facial Espontánea</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Hemodinámica Postop</label>
                      <select
                        value={formData.hemodynamicsPostop}
                        onChange={(e) => handleChange('hemodynamicsPostop', e.target.value)}
                        className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="ESTABLE">Estable</option>
                        <option value="INESTABLE">Inestable</option>
                        <option value="CRITICO">Crítico</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Complicaciones</label>
                    <textarea
                      value={formData.complications}
                      onChange={(e) => handleChange('complications', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DisplayField label="Destino" value={procedure.destination} />
                    <DisplayField label="Vía Aérea Postop" value={procedure.airwayPostop} />
                    <DisplayField label="Ventilación Postop" value={procedure.ventilationPostop} />
                    <DisplayField label="Hemodinámica Postop" value={procedure.hemodynamicsPostop} />
                  </div>
                  {procedure.complications && (
                    <DisplayField label="Complicaciones" value={procedure.complications} />
                  )}
                </>
              )}
            </CardContent>
          )}
        </Card>

        {/* Indicadores de Calidad - Solo para Trasplantes */}
        {(procedure.procedureType === 'TRASPLANTE_HEPATICO' || procedure.procedureType === 'RETRASPLANTE_HEPATICO') && (
          <Card>
            <SectionHeader title="Indicadores de Calidad" section="quality" />
            {expandedSections.quality && (
              <CardContent className="p-6 space-y-6">
                {isEditing ? (
                  <>
                    {/* Objetivo 1: Protocolo de Reposición */}
                    <div className="p-4 bg-dark-700/50 rounded-lg">
                      <h4 className="text-sm font-semibold text-cyan-400 mb-3">
                        Objetivo 1: Protocolo de Reposición de Hemoderivados
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            ¿Se aplicó el Protocolo de Reposición basado en objetivos?
                          </label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="bloodReplacementProtocol"
                                checked={formData.bloodReplacementProtocol === true}
                                onChange={() => handleChange('bloodReplacementProtocol', true)}
                                className="w-4 h-4 text-surgical-500"
                              />
                              <span className="text-gray-300">Sí</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="bloodReplacementProtocol"
                                checked={formData.bloodReplacementProtocol === false}
                                onChange={() => handleChange('bloodReplacementProtocol', false)}
                                className="w-4 h-4 text-surgical-500"
                              />
                              <span className="text-gray-300">No</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="bloodReplacementProtocol"
                                checked={formData.bloodReplacementProtocol === null}
                                onChange={() => handleChange('bloodReplacementProtocol', null)}
                                className="w-4 h-4 text-surgical-500"
                              />
                              <span className="text-gray-300">Sin evaluar</span>
                            </label>
                          </div>
                        </div>
                        {formData.bloodReplacementProtocol === false && (
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Razón por la que no se aplicó
                            </label>
                            <textarea
                              value={formData.bloodReplacementProtocolReason}
                              onChange={(e) => handleChange('bloodReplacementProtocolReason', e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                              placeholder="Especificar razón..."
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Objetivo 2: Protocolo de Profilaxis ATB */}
                    <div className="p-4 bg-dark-700/50 rounded-lg">
                      <h4 className="text-sm font-semibold text-cyan-400 mb-3">
                        Objetivo 2: Protocolo de Profilaxis Antibiótica
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            ¿Se aplicó el Protocolo de Profilaxis ATB indicado por Infectología?
                          </label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="antibioticProphylaxisProtocol"
                                checked={formData.antibioticProphylaxisProtocol === true}
                                onChange={() => handleChange('antibioticProphylaxisProtocol', true)}
                                className="w-4 h-4 text-surgical-500"
                              />
                              <span className="text-gray-300">Sí</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="antibioticProphylaxisProtocol"
                                checked={formData.antibioticProphylaxisProtocol === false}
                                onChange={() => handleChange('antibioticProphylaxisProtocol', false)}
                                className="w-4 h-4 text-surgical-500"
                              />
                              <span className="text-gray-300">No</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="antibioticProphylaxisProtocol"
                                checked={formData.antibioticProphylaxisProtocol === null}
                                onChange={() => handleChange('antibioticProphylaxisProtocol', null)}
                                className="w-4 h-4 text-surgical-500"
                              />
                              <span className="text-gray-300">Sin evaluar</span>
                            </label>
                          </div>
                        </div>
                        {formData.antibioticProphylaxisProtocol === false && (
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Razón por la que no se aplicó
                            </label>
                            <textarea
                              value={formData.antibioticProphylaxisProtocolReason}
                              onChange={(e) => handleChange('antibioticProphylaxisProtocolReason', e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                              placeholder="Especificar razón..."
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Objetivo 5: Protocolo Fast Track */}
                    <div className="p-4 bg-dark-700/50 rounded-lg">
                      <h4 className="text-sm font-semibold text-cyan-400 mb-3">
                        Objetivo 5: Protocolo de Extubación Temprana (Fast Track)
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            ¿Ingresa al Protocolo de Fast Track?
                          </label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="fastTrackProtocol"
                                checked={formData.fastTrackProtocol === true}
                                onChange={() => handleChange('fastTrackProtocol', true)}
                                className="w-4 h-4 text-surgical-500"
                              />
                              <span className="text-gray-300">Sí</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="fastTrackProtocol"
                                checked={formData.fastTrackProtocol === false}
                                onChange={() => handleChange('fastTrackProtocol', false)}
                                className="w-4 h-4 text-surgical-500"
                              />
                              <span className="text-gray-300">No</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="fastTrackProtocol"
                                checked={formData.fastTrackProtocol === null}
                                onChange={() => handleChange('fastTrackProtocol', null)}
                                className="w-4 h-4 text-surgical-500"
                              />
                              <span className="text-gray-300">Sin evaluar</span>
                            </label>
                          </div>
                        </div>
                        {formData.fastTrackProtocol === false && (
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Razón por la que no ingresa
                            </label>
                            <textarea
                              value={formData.fastTrackProtocolReason}
                              onChange={(e) => handleChange('fastTrackProtocolReason', e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                              placeholder="Especificar razón..."
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Objetivo 3: Información de envío de PDF */}
                    <div className="p-4 bg-dark-700/50 rounded-lg">
                      <h4 className="text-sm font-semibold text-cyan-400 mb-3">
                        Objetivo 3: Registro y Envío de Ficha Anestésica
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">PDF enviado por email</label>
                          <p className={procedure.pdfSentByEmail ? 'text-green-400' : 'text-gray-400'}>
                            {procedure.pdfSentByEmail ? 'Sí' : 'No'}
                          </p>
                        </div>
                        {procedure.pdfSentAt && (
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Fecha de envío</label>
                            <p className="text-gray-100">{formatDateTime(procedure.pdfSentAt)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    {/* Objetivo 1: Vista */}
                    <div className="p-4 bg-dark-700/50 rounded-lg">
                      <h4 className="text-sm font-semibold text-cyan-400 mb-2">
                        Objetivo 1: Protocolo de Reposición de Hemoderivados
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">Protocolo aplicado</label>
                          <p className={
                            procedure.bloodReplacementProtocol === true ? 'text-green-400' :
                            procedure.bloodReplacementProtocol === false ? 'text-red-400' : 'text-gray-400'
                          }>
                            {procedure.bloodReplacementProtocol === true ? 'Sí' :
                             procedure.bloodReplacementProtocol === false ? 'No' : 'Sin evaluar'}
                          </p>
                        </div>
                        {procedure.bloodReplacementProtocol === false && procedure.bloodReplacementProtocolReason && (
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Razón</label>
                            <p className="text-gray-200">{procedure.bloodReplacementProtocolReason}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Objetivo 2: Vista */}
                    <div className="p-4 bg-dark-700/50 rounded-lg">
                      <h4 className="text-sm font-semibold text-cyan-400 mb-2">
                        Objetivo 2: Protocolo de Profilaxis Antibiótica
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">Protocolo aplicado</label>
                          <p className={
                            procedure.antibioticProphylaxisProtocol === true ? 'text-green-400' :
                            procedure.antibioticProphylaxisProtocol === false ? 'text-red-400' : 'text-gray-400'
                          }>
                            {procedure.antibioticProphylaxisProtocol === true ? 'Sí' :
                             procedure.antibioticProphylaxisProtocol === false ? 'No' : 'Sin evaluar'}
                          </p>
                        </div>
                        {procedure.antibioticProphylaxisProtocol === false && procedure.antibioticProphylaxisProtocolReason && (
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Razón</label>
                            <p className="text-gray-200">{procedure.antibioticProphylaxisProtocolReason}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Objetivo 3: Vista */}
                    <div className="p-4 bg-dark-700/50 rounded-lg">
                      <h4 className="text-sm font-semibold text-cyan-400 mb-2">
                        Objetivo 3: Registro y Envío de Ficha Anestésica
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">PDF enviado por email</label>
                          <p className={procedure.pdfSentByEmail ? 'text-green-400' : 'text-gray-400'}>
                            {procedure.pdfSentByEmail ? 'Sí' : 'No'}
                          </p>
                        </div>
                        {procedure.pdfSentAt && (
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Fecha de envío</label>
                            <p className="text-gray-100">{formatDateTime(procedure.pdfSentAt)}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Objetivo 5: Vista */}
                    <div className="p-4 bg-dark-700/50 rounded-lg">
                      <h4 className="text-sm font-semibold text-cyan-400 mb-2">
                        Objetivo 5: Protocolo de Extubación Temprana (Fast Track)
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-1">Ingresa a Fast Track</label>
                          <p className={
                            procedure.fastTrackProtocol === true ? 'text-green-400' :
                            procedure.fastTrackProtocol === false ? 'text-red-400' : 'text-gray-400'
                          }>
                            {procedure.fastTrackProtocol === true ? 'Sí' :
                             procedure.fastTrackProtocol === false ? 'No' : 'Sin evaluar'}
                          </p>
                        </div>
                        {procedure.fastTrackProtocol === false && procedure.fastTrackProtocolReason && (
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Razón</label>
                            <p className="text-gray-200">{procedure.fastTrackProtocolReason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        )}

        {/* Registros Intraoperatorios */}
        <Card>
          <SectionHeader title="Registros Intraoperatorios" section="intraop" />
          {expandedSections.intraop && (
            <CardContent className="p-6">
              {/* Botón Agregar Registro */}
              {canEdit && (
                <div className="mb-4 flex justify-end">
                  <Button
                    onClick={handleAddIntraopRecord}
                    className="bg-surgical-600 hover:bg-surgical-700"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar Registro
                  </Button>
                </div>
              )}

              {procedure.intraopRecordsProcedure && procedure.intraopRecordsProcedure.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-dark-700 border-b border-dark-500">
                      <tr>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">Hora</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">FC</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">PAS</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">PAD</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">PAM</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">SatO2</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">Temp</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">FiO2</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">VT</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">FR</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">PEEP</th>
                        {canEdit && <th className="px-4 py-3 text-center text-gray-300 font-medium">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {procedure.intraopRecordsProcedure.map((record, index) => (
                        <tr key={record.id} className={index % 2 === 0 ? 'bg-dark-800/50' : 'bg-dark-800/20'}>
                          <td className="px-4 py-3 text-gray-200">
                            {new Date(record.timestamp).toLocaleTimeString('es-UY', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="px-4 py-3 text-gray-200">{record.heartRate || '-'}</td>
                          <td className="px-4 py-3 text-gray-200">{record.pas || '-'}</td>
                          <td className="px-4 py-3 text-gray-200">{record.pad || '-'}</td>
                          <td className="px-4 py-3 text-gray-200">{record.pam || '-'}</td>
                          <td className="px-4 py-3 text-gray-200">{record.satO2 ? `${record.satO2}%` : '-'}</td>
                          <td className="px-4 py-3 text-gray-200">{record.temp ? `${record.temp}°C` : '-'}</td>
                          <td className="px-4 py-3 text-gray-200">{record.fio2 ? `${record.fio2}%` : '-'}</td>
                          <td className="px-4 py-3 text-gray-200">{record.tidalVolume || '-'}</td>
                          <td className="px-4 py-3 text-gray-200">{record.respRate || '-'}</td>
                          <td className="px-4 py-3 text-gray-200">{record.peep || '-'}</td>
                          {canEdit && (
                            <td className="px-4 py-3">
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => handleEditIntraopRecord(record)}
                                  className="text-blue-400 hover:text-blue-300 transition-colors"
                                  title="Editar registro"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteIntraopRecord(record.id)}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                  title="Eliminar registro"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 text-sm text-gray-400">
                    Total: {procedure.intraopRecordsProcedure.length} registro(s) intraoperatorio(s)
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">No hay registros intraoperatorios</p>
              )}
            </CardContent>
          )}
        </Card>
      </div>

      {/* Modal de Registro Intraoperatorio */}
      {showIntraopModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-dark-800 border-b border-dark-600 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-100">
                {editingIntraopRecord ? 'Editar Registro Intraoperatorio' : 'Nuevo Registro Intraoperatorio'}
              </h3>
              <button
                onClick={() => setShowIntraopModal(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Fecha y Hora *
                  </label>
                  <input
                    type="datetime-local"
                    value={intraopFormData.timestamp}
                    onChange={(e) => setIntraopFormData({ ...intraopFormData, timestamp: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    FC (lpm)
                  </label>
                  <input
                    type="number"
                    value={intraopFormData.heartRate}
                    onChange={(e) => setIntraopFormData({ ...intraopFormData, heartRate: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                    placeholder="60-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    PAS (mmHg)
                  </label>
                  <input
                    type="number"
                    value={intraopFormData.pas}
                    onChange={(e) => setIntraopFormData({ ...intraopFormData, pas: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                    placeholder="Presión arterial sistólica"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    PAD (mmHg)
                  </label>
                  <input
                    type="number"
                    value={intraopFormData.pad}
                    onChange={(e) => setIntraopFormData({ ...intraopFormData, pad: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                    placeholder="Presión arterial diastólica"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    PAM (mmHg)
                  </label>
                  <input
                    type="number"
                    value={intraopFormData.pam}
                    onChange={(e) => setIntraopFormData({ ...intraopFormData, pam: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                    placeholder="Presión arterial media"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    SatO2 (%)
                  </label>
                  <input
                    type="number"
                    value={intraopFormData.satO2}
                    onChange={(e) => setIntraopFormData({ ...intraopFormData, satO2: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                    placeholder="90-100"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Temperatura (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={intraopFormData.temp}
                    onChange={(e) => setIntraopFormData({ ...intraopFormData, temp: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                    placeholder="35.0-37.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    FiO2 (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={intraopFormData.fio2}
                    onChange={(e) => setIntraopFormData({ ...intraopFormData, fio2: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                    placeholder="21-100"
                    min="21"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Volumen Tidal (ml)
                  </label>
                  <input
                    type="number"
                    value={intraopFormData.tidalVolume}
                    onChange={(e) => setIntraopFormData({ ...intraopFormData, tidalVolume: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                    placeholder="400-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    FR (rpm)
                  </label>
                  <input
                    type="number"
                    value={intraopFormData.respRate}
                    onChange={(e) => setIntraopFormData({ ...intraopFormData, respRate: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                    placeholder="12-20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    PEEP (cmH2O)
                  </label>
                  <input
                    type="number"
                    value={intraopFormData.peep}
                    onChange={(e) => setIntraopFormData({ ...intraopFormData, peep: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                    placeholder="5-10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Presión Pico (cmH2O)
                  </label>
                  <input
                    type="number"
                    value={intraopFormData.peakPressure}
                    onChange={(e) => setIntraopFormData({ ...intraopFormData, peakPressure: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                    placeholder="20-30"
                  />
                </div>
              </div>
            </div>

            {/* Laboratorios */}
            <div className="px-6 py-4 border-t border-dark-600">
              <h4 className="text-lg font-semibold text-gray-200 mb-4">Laboratorios</h4>

              {/* Hematología */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-cyan-400 mb-2">Hematología</h5>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Hb (g/dL)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={intraopFormData.hb}
                      onChange={(e) => setIntraopFormData({ ...intraopFormData, hb: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      placeholder="12-16"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Hto (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={intraopFormData.hto}
                      onChange={(e) => setIntraopFormData({ ...intraopFormData, hto: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      placeholder="36-48"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Plaquetas (10³/µL)</label>
                    <input
                      type="number"
                      value={intraopFormData.platelets}
                      onChange={(e) => setIntraopFormData({ ...intraopFormData, platelets: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      placeholder="150-400"
                    />
                  </div>
                </div>
              </div>

              {/* Coagulación */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-cyan-400 mb-2">Coagulación</h5>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">TP (seg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={intraopFormData.pt}
                      onChange={(e) => setIntraopFormData({ ...intraopFormData, pt: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      placeholder="11-14"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">INR</label>
                    <input
                      type="number"
                      step="0.01"
                      value={intraopFormData.inr}
                      onChange={(e) => setIntraopFormData({ ...intraopFormData, inr: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      placeholder="0.9-1.1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Fibrinógeno (mg/dL)</label>
                    <input
                      type="number"
                      value={intraopFormData.fibrinogen}
                      onChange={(e) => setIntraopFormData({ ...intraopFormData, fibrinogen: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      placeholder="200-400"
                    />
                  </div>
                </div>
              </div>

              {/* Electrolitos */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-cyan-400 mb-2">Electrolitos</h5>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Na+ (mEq/L)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={intraopFormData.sodium}
                      onChange={(e) => setIntraopFormData({ ...intraopFormData, sodium: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      placeholder="135-145"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">K+ (mEq/L)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={intraopFormData.potassium}
                      onChange={(e) => setIntraopFormData({ ...intraopFormData, potassium: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      placeholder="3.5-5.0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Ca++ (mmol/L)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={intraopFormData.ionicCalcium}
                      onChange={(e) => setIntraopFormData({ ...intraopFormData, ionicCalcium: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      placeholder="1.1-1.3"
                    />
                  </div>
                </div>
              </div>

              {/* Gases Arteriales */}
              <div className="mb-4">
                <h5 className="text-sm font-medium text-cyan-400 mb-2">Gases Arteriales</h5>
                <div className="grid grid-cols-3 gap-4 mb-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">pH</label>
                    <input
                      type="number"
                      step="0.01"
                      value={intraopFormData.pH}
                      onChange={(e) => setIntraopFormData({ ...intraopFormData, pH: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      placeholder="7.35-7.45"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">PaO2 (mmHg)</label>
                    <input
                      type="number"
                      value={intraopFormData.paO2}
                      onChange={(e) => setIntraopFormData({ ...intraopFormData, paO2: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      placeholder="80-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">PaCO2 (mmHg)</label>
                    <input
                      type="number"
                      value={intraopFormData.paCO2}
                      onChange={(e) => setIntraopFormData({ ...intraopFormData, paCO2: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      placeholder="35-45"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">HCO3 (mEq/L)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={intraopFormData.hco3}
                      onChange={(e) => setIntraopFormData({ ...intraopFormData, hco3: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      placeholder="22-26"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">BE (mEq/L)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={intraopFormData.baseExcess}
                      onChange={(e) => setIntraopFormData({ ...intraopFormData, baseExcess: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      placeholder="-2 a +2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Lactato (mmol/L)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={intraopFormData.lactate}
                      onChange={(e) => setIntraopFormData({ ...intraopFormData, lactate: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      placeholder="0.5-2.0"
                    />
                  </div>
                </div>
              </div>

              {/* Función Renal y Glicemia */}
              <div>
                <h5 className="text-sm font-medium text-cyan-400 mb-2">Función Renal / Glicemia</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Creatinina (mg/dL)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={intraopFormData.creatinine}
                      onChange={(e) => setIntraopFormData({ ...intraopFormData, creatinine: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      placeholder="0.7-1.3"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Glicemia (mg/dL)</label>
                    <input
                      type="number"
                      value={intraopFormData.glucose}
                      onChange={(e) => setIntraopFormData({ ...intraopFormData, glucose: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                      placeholder="70-110"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-dark-800 border-t border-dark-600 px-6 py-4 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowIntraopModal(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveIntraopRecord}
                disabled={saving || !intraopFormData.timestamp}
                className="bg-surgical-600 hover:bg-surgical-700"
              >
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
                    Guardar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

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

export default function ProcedureDetail() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="h-full px-8 py-6">
          <ProcedureDetailContent />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
