'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// Icons are rendered inline as SVGs
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { preopApi, adminApi } from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import PatientSearch from '@/components/patients/PatientSearch';

function NewPreopEvaluationContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [etiologies, setEtiologies] = useState([]);
  const [loadingEtiologies, setLoadingEtiologies] = useState(true);

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

  // Estado del formulario
  const [formData, setFormData] = useState({
    // Datos básicos
    patientId: '',
    evaluationDate: new Date().toISOString().split('T')[0],

    // Scores
    meld: '',
    meldNa: '',
    child: '',

    // Etiología
    etiology1: '',
    etiology2: '',
    isFulminant: false,

    // Examen físico
    mpt: '',
    mouthOpening: '',
    physicalExamObs: '',

    // Comorbilidades cardiovasculares
    coronaryDisease: false,
    hypertension: false,
    valvulopathy: '',
    arrhythmia: false,
    dilatedCardio: false,
    hypertensiveCardio: false,

    // Comorbilidades respiratorias
    smokerCOPD: false,
    asthma: false,

    // Otras comorbilidades
    renalFailure: false,
    singleKidney: false,
    diabetes: false,
    thyroidDysfunction: false,
    previousAbdSurgery: false,
    abdSurgeryDetail: '',
    refluxUlcer: false,
    allergies: '',
    pregnancy: false,

    // Complicaciones de cirrosis
    hepatoRenalSyndrome: false,
    hepatoPulmonarySyndr: false,
    pulmonaryHypertension: false,
    portalHypertension: false,
    ascites: false,
    hydrothorax: false,
    sbe: false,
    portalThrombosis: false,
    esophagealVarices: false,
    encephalopathy: false,
    hepatocarcinoma: false,
    bleeding: false,
    hyponatremia: false,
    complicationsObs: '',

    // Estado funcional
    functionalClass: '',
    mechanicalVent: false,
    habitualMeds: '',

    // Lista de espera
    inList: false,
    reasonNotInList: '',
    problems: '',

    // Laboratorios
    labs: {
      labDate: new Date().toISOString().split('T')[0],
      // Hematología
      hb: '',
      hto: '',
      platelets: '',
      // Coagulación
      pt: '',
      inr: '',
      fibrinogen: '',
      // Bioquímica
      glucose: '',
      sodium: '',
      potassium: '',
      ionicCalcium: '',
      magnesium: '',
      azotemia: '',
      creatinine: '',
      gfr: '',
      // Función hepática
      sgot: '',
      sgpt: '',
      totalBili: '',
      albumin: '',
      // Otros
      tsh: '',
    },
  });

  useEffect(() => {
    loadEtiologies();
  }, []);

  const loadEtiologies = async () => {
    try {
      setLoadingEtiologies(true);
      const response = await adminApi.listEtiologies();
      setEtiologies(response.data || []);
    } catch (err) {
      console.error('Error loading etiologies:', err);
      // No mostrar error al usuario, solo fallar silenciosamente
    } finally {
      setLoadingEtiologies(false);
    }
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

  const handleLabChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      labs: {
        ...prev.labs,
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validar campos requeridos
      if (!formData.patientId) {
        throw new Error('Debe seleccionar un paciente');
      }
      if (!formData.evaluationDate) {
        throw new Error('Debe ingresar la fecha de evaluación');
      }

      // Preparar datos para enviar
      const payload = {
        patientId: formData.patientId,
        evaluationDate: new Date(formData.evaluationDate).toISOString(),

        // Scores (convertir a números o null)
        meld: formData.meld ? parseInt(formData.meld) : null,
        meldNa: formData.meldNa ? parseInt(formData.meldNa) : null,
        child: formData.child || null,

        // Etiología
        etiology1: formData.etiology1 || null,
        etiology2: formData.etiology2 || null,
        isFulminant: formData.isFulminant,

        // Examen físico
        mpt: formData.mpt || null,
        mouthOpening: formData.mouthOpening || null,
        physicalExamObs: formData.physicalExamObs || null,

        // Comorbilidades cardiovasculares
        coronaryDisease: formData.coronaryDisease,
        hypertension: formData.hypertension,
        valvulopathy: formData.valvulopathy || null,
        arrhythmia: formData.arrhythmia,
        dilatedCardio: formData.dilatedCardio,
        hypertensiveCardio: formData.hypertensiveCardio,

        // Comorbilidades respiratorias
        smokerCOPD: formData.smokerCOPD,
        asthma: formData.asthma,

        // Otras comorbilidades
        renalFailure: formData.renalFailure,
        singleKidney: formData.singleKidney,
        diabetes: formData.diabetes,
        thyroidDysfunction: formData.thyroidDysfunction,
        previousAbdSurgery: formData.previousAbdSurgery,
        abdSurgeryDetail: formData.abdSurgeryDetail || null,
        refluxUlcer: formData.refluxUlcer,
        allergies: formData.allergies || null,
        pregnancy: formData.pregnancy,

        // Complicaciones de cirrosis
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

        // Estado funcional
        functionalClass: formData.functionalClass || null,
        mechanicalVent: formData.mechanicalVent,
        habitualMeds: formData.habitualMeds || null,

        // Lista de espera
        inList: formData.inList,
        reasonNotInList: formData.reasonNotInList || null,
        problems: formData.problems || null,
      };

      // Crear evaluación
      const newEvaluation = await preopApi.create(payload);

      // Si hay datos de laboratorio, crear el registro de labs
      const hasLabData = Object.entries(formData.labs).some(
        ([key, value]) => key !== 'labDate' && value !== ''
      );

      if (hasLabData) {
        const labPayload = {
          labDate: new Date(formData.labs.labDate).toISOString(),
          hb: formData.labs.hb ? parseFloat(formData.labs.hb) : null,
          hto: formData.labs.hto ? parseFloat(formData.labs.hto) : null,
          platelets: formData.labs.platelets ? parseFloat(formData.labs.platelets) : null,
          pt: formData.labs.pt ? parseFloat(formData.labs.pt) : null,
          inr: formData.labs.inr ? parseFloat(formData.labs.inr) : null,
          fibrinogen: formData.labs.fibrinogen ? parseFloat(formData.labs.fibrinogen) : null,
          glucose: formData.labs.glucose ? parseFloat(formData.labs.glucose) : null,
          sodium: formData.labs.sodium ? parseFloat(formData.labs.sodium) : null,
          potassium: formData.labs.potassium ? parseFloat(formData.labs.potassium) : null,
          ionicCalcium: formData.labs.ionicCalcium ? parseFloat(formData.labs.ionicCalcium) : null,
          magnesium: formData.labs.magnesium ? parseFloat(formData.labs.magnesium) : null,
          azotemia: formData.labs.azotemia ? parseFloat(formData.labs.azotemia) : null,
          creatinine: formData.labs.creatinine ? parseFloat(formData.labs.creatinine) : null,
          gfr: formData.labs.gfr ? parseFloat(formData.labs.gfr) : null,
          sgot: formData.labs.sgot ? parseFloat(formData.labs.sgot) : null,
          sgpt: formData.labs.sgpt ? parseFloat(formData.labs.sgpt) : null,
          totalBili: formData.labs.totalBili ? parseFloat(formData.labs.totalBili) : null,
          albumin: formData.labs.albumin ? parseFloat(formData.labs.albumin) : null,
          tsh: formData.labs.tsh ? parseFloat(formData.labs.tsh) : null,
        };

        // Crear laboratorios asociados
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/preop/${newEvaluation.id}/labs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(labPayload),
        });
      }

      // Redirigir a la página de detalle
      router.push(`/preop/${newEvaluation.id}`);
    } catch (err) {
      console.error('Error creating evaluation:', err);
      setError(err.message || 'Error al crear la evaluación preoperatoria');
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/preop">
            <Button variant="ghost" size="sm">
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-100">Nueva Evaluación Preoperatoria</h1>
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

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Selección de Paciente */}
        <Card>
          <SectionHeader title="Paciente y Fecha" section="patient" />
          {expandedSections.patient && (
            <CardContent className="p-6 space-y-4">
              {/* Advertencia para crear paciente nuevo */}
              <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-blue-200">
                    Si el paciente no existe en el sistema, debe crearlo primero antes de generar su evaluación preoperatoria.
                  </p>
                  <Link href="/patients/new" target="_blank">
                    <Button type="button" variant="outline" size="sm" className="mt-3 border-blue-500 text-blue-300 hover:bg-blue-500/20">
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Crear Nuevo Paciente
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Paciente <span className="text-red-500">*</span>
                  </label>
                  <PatientSearch
                    selectedPatientId={formData.patientId}
                    onSelect={(patientId) => handleChange('patientId', patientId)}
                    required
                  />
                </div>

                <Input
                  label="Fecha de Evaluación"
                  type="date"
                  value={formData.evaluationDate}
                  onChange={(e) => handleChange('evaluationDate', e.target.value)}
                  required
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Scores Pronósticos */}
        <Card>
          <SectionHeader title="Scores Pronósticos" section="scores" />
          {expandedSections.scores && (
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="MELD"
                  type="number"
                  value={formData.meld}
                  onChange={(e) => handleChange('meld', e.target.value)}
                  placeholder="6-40"
                  min="6"
                  max="40"
                />

                <Input
                  label="MELD-Na"
                  type="number"
                  value={formData.meldNa}
                  onChange={(e) => handleChange('meldNa', e.target.value)}
                  placeholder="6-40"
                  min="6"
                  max="40"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Child-Pugh
                  </label>
                  <select
                    value={formData.child}
                    onChange={(e) => handleChange('child', e.target.value)}
                    className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="A">A (Clase A - 5-6 puntos)</option>
                    <option value="B">B (Clase B - 7-9 puntos)</option>
                    <option value="C">C (Clase C - 10-15 puntos)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Etiología */}
        <Card>
          <SectionHeader title="Etiología de la Hepatopatía" section="etiology" />
          {expandedSections.etiology && (
            <CardContent className="p-6 space-y-4">
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
                    <option value="">Seleccionar etiología...</option>
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
                  className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                />
                <label htmlFor="isFulminant" className="text-sm text-gray-300">
                  Hepatopatía Fulminante
                </label>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Examen Físico */}
        <Card>
          <SectionHeader title="Examen Físico" section="physicalExam" />
          {expandedSections.physicalExam && (
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Mallampati
                  </label>
                  <select
                    value={formData.mpt}
                    onChange={(e) => handleChange('mpt', e.target.value)}
                    className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="I">Clase I</option>
                    <option value="II">Clase II</option>
                    <option value="III">Clase III</option>
                    <option value="IV">Clase IV</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Apertura Bucal
                  </label>
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Observaciones del Examen Físico
                </label>
                <textarea
                  value={formData.physicalExamObs}
                  onChange={(e) => handleChange('physicalExamObs', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                  placeholder="Hallazgos adicionales del examen físico..."
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Comorbilidades Cardiovasculares */}
        <Card>
          <SectionHeader title="Comorbilidades Cardiovasculares" section="cardiovascular" />
          {expandedSections.cardiovascular && (
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hypertension"
                    checked={formData.hypertension}
                    onChange={(e) => handleChange('hypertension', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="hypertension" className="text-sm text-gray-300">
                    Hipertensión Arterial
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="coronaryDisease"
                    checked={formData.coronaryDisease}
                    onChange={(e) => handleChange('coronaryDisease', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="coronaryDisease" className="text-sm text-gray-300">
                    Enfermedad Coronaria
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="arrhythmia"
                    checked={formData.arrhythmia}
                    onChange={(e) => handleChange('arrhythmia', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="arrhythmia" className="text-sm text-gray-300">
                    Arritmia
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="dilatedCardio"
                    checked={formData.dilatedCardio}
                    onChange={(e) => handleChange('dilatedCardio', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="dilatedCardio" className="text-sm text-gray-300">
                    Miocardiopatía Dilatada
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hypertensiveCardio"
                    checked={formData.hypertensiveCardio}
                    onChange={(e) => handleChange('hypertensiveCardio', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="hypertensiveCardio" className="text-sm text-gray-300">
                    Cardiopatía Hipertensiva
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Valvulopatía
                </label>
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
            </CardContent>
          )}
        </Card>

        {/* Comorbilidades Respiratorias */}
        <Card>
          <SectionHeader title="Comorbilidades Respiratorias" section="respiratory" />
          {expandedSections.respiratory && (
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="smokerCOPD"
                    checked={formData.smokerCOPD}
                    onChange={(e) => handleChange('smokerCOPD', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="smokerCOPD" className="text-sm text-gray-300">
                    Tabaquismo / EPOC
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="asthma"
                    checked={formData.asthma}
                    onChange={(e) => handleChange('asthma', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="asthma" className="text-sm text-gray-300">
                    Asma
                  </label>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Otras Comorbilidades */}
        <Card>
          <SectionHeader title="Otras Comorbilidades" section="otherComorbidities" />
          {expandedSections.otherComorbidities && (
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="diabetes"
                    checked={formData.diabetes}
                    onChange={(e) => handleChange('diabetes', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="diabetes" className="text-sm text-gray-300">
                    Diabetes
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="renalFailure"
                    checked={formData.renalFailure}
                    onChange={(e) => handleChange('renalFailure', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="renalFailure" className="text-sm text-gray-300">
                    Insuficiencia Renal
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="singleKidney"
                    checked={formData.singleKidney}
                    onChange={(e) => handleChange('singleKidney', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="singleKidney" className="text-sm text-gray-300">
                    Monorreno
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="thyroidDysfunction"
                    checked={formData.thyroidDysfunction}
                    onChange={(e) => handleChange('thyroidDysfunction', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="thyroidDysfunction" className="text-sm text-gray-300">
                    Disfunción Tiroidea
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="refluxUlcer"
                    checked={formData.refluxUlcer}
                    onChange={(e) => handleChange('refluxUlcer', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="refluxUlcer" className="text-sm text-gray-300">
                    Reflujo / Úlcera
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pregnancy"
                    checked={formData.pregnancy}
                    onChange={(e) => handleChange('pregnancy', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="pregnancy" className="text-sm text-gray-300">
                    Embarazo / Puerperio
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="previousAbdSurgery"
                    checked={formData.previousAbdSurgery}
                    onChange={(e) => handleChange('previousAbdSurgery', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="previousAbdSurgery" className="text-sm text-gray-300">
                    Cirugía Abdominal Previa
                  </label>
                </div>
              </div>

              {formData.previousAbdSurgery && (
                <Input
                  label="Detalle de Cirugía Abdominal Previa"
                  type="text"
                  value={formData.abdSurgeryDetail}
                  onChange={(e) => handleChange('abdSurgeryDetail', e.target.value)}
                  placeholder="Descripción de la cirugía..."
                />
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Alergias
                </label>
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
                  rows={3}
                  className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                  placeholder="Alergias conocidas (puede escribir directamente o usar los botones de arriba)..."
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Complicaciones de Cirrosis */}
        <Card>
          <SectionHeader title="Complicaciones de Cirrosis" section="cirrhosisComplications" />
          {expandedSections.cirrhosisComplications && (
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="portalHypertension"
                    checked={formData.portalHypertension}
                    onChange={(e) => handleChange('portalHypertension', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="portalHypertension" className="text-sm text-gray-300">
                    Hipertensión Portal
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ascites"
                    checked={formData.ascites}
                    onChange={(e) => handleChange('ascites', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="ascites" className="text-sm text-gray-300">
                    Ascitis
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="encephalopathy"
                    checked={formData.encephalopathy}
                    onChange={(e) => handleChange('encephalopathy', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="encephalopathy" className="text-sm text-gray-300">
                    Encefalopatía Hepática
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="esophagealVarices"
                    checked={formData.esophagealVarices}
                    onChange={(e) => handleChange('esophagealVarices', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="esophagealVarices" className="text-sm text-gray-300">
                    Várices Esofágicas
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="bleeding"
                    checked={formData.bleeding}
                    onChange={(e) => handleChange('bleeding', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="bleeding" className="text-sm text-gray-300">
                    Sangrado
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hepatoRenalSyndrome"
                    checked={formData.hepatoRenalSyndrome}
                    onChange={(e) => handleChange('hepatoRenalSyndrome', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="hepatoRenalSyndrome" className="text-sm text-gray-300">
                    Síndrome Hepatorrenal
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hepatoPulmonarySyndr"
                    checked={formData.hepatoPulmonarySyndr}
                    onChange={(e) => handleChange('hepatoPulmonarySyndr', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="hepatoPulmonarySyndr" className="text-sm text-gray-300">
                    Síndrome Hepatopulmonar
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pulmonaryHypertension"
                    checked={formData.pulmonaryHypertension}
                    onChange={(e) => handleChange('pulmonaryHypertension', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="pulmonaryHypertension" className="text-sm text-gray-300">
                    Hipertensión Pulmonar
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hydrothorax"
                    checked={formData.hydrothorax}
                    onChange={(e) => handleChange('hydrothorax', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="hydrothorax" className="text-sm text-gray-300">
                    Hidrotórax
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sbe"
                    checked={formData.sbe}
                    onChange={(e) => handleChange('sbe', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="sbe" className="text-sm text-gray-300">
                    Peritonitis Bacteriana Espontánea
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="portalThrombosis"
                    checked={formData.portalThrombosis}
                    onChange={(e) => handleChange('portalThrombosis', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="portalThrombosis" className="text-sm text-gray-300">
                    Trombosis Portal
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hepatocarcinoma"
                    checked={formData.hepatocarcinoma}
                    onChange={(e) => handleChange('hepatocarcinoma', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="hepatocarcinoma" className="text-sm text-gray-300">
                    Hepatocarcinoma
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hyponatremia"
                    checked={formData.hyponatremia}
                    onChange={(e) => handleChange('hyponatremia', e.target.checked)}
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="hyponatremia" className="text-sm text-gray-300">
                    Hiponatremia
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Observaciones sobre Complicaciones
                </label>
                <textarea
                  value={formData.complicationsObs}
                  onChange={(e) => handleChange('complicationsObs', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                  placeholder="Detalles adicionales sobre complicaciones..."
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Estado Funcional */}
        <Card>
          <SectionHeader title="Estado Funcional" section="functionalStatus" />
          {expandedSections.functionalStatus && (
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Clase Funcional (NYHA)
                  </label>
                  <select
                    value={formData.functionalClass}
                    onChange={(e) => handleChange('functionalClass', e.target.value)}
                    className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
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
                    className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                  />
                  <label htmlFor="mechanicalVent" className="text-sm text-gray-300">
                    Ventilación Mecánica
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Medicación Habitual
                </label>
                <textarea
                  value={formData.habitualMeds}
                  onChange={(e) => handleChange('habitualMeds', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                  placeholder="Lista de medicamentos habituales..."
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Decisión de Lista de Espera */}
        <Card>
          <SectionHeader title="Lista de Espera" section="waitlist" />
          {expandedSections.waitlist && (
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="inList"
                  checked={formData.inList}
                  onChange={(e) => handleChange('inList', e.target.checked)}
                  className="w-4 h-4 bg-dark-600 border-dark-400 rounded text-surgical-500 focus:ring-surgical-500"
                />
                <label htmlFor="inList" className="text-sm font-medium text-gray-300">
                  Ingresa a Lista de Espera
                </label>
              </div>

              {!formData.inList && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Razón de No Ingreso
                  </label>
                  <textarea
                    value={formData.reasonNotInList}
                    onChange={(e) => handleChange('reasonNotInList', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                    placeholder="Motivo por el cual no ingresa a lista..."
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Problemas Identificados
                </label>
                <textarea
                  value={formData.problems}
                  onChange={(e) => handleChange('problems', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                  placeholder="Problemas o consideraciones especiales..."
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Laboratorios Pretrasplante */}
        <Card>
          <SectionHeader title="Laboratorios Pretrasplante" section="labs" />
          {expandedSections.labs && (
            <CardContent className="p-6 space-y-6">
              <Input
                label="Fecha de Laboratorios"
                type="date"
                value={formData.labs.labDate}
                onChange={(e) => handleLabChange('labDate', e.target.value)}
              />

              {/* Hematología */}
              <div>
                <h4 className="text-sm font-semibold text-gray-200 mb-3 pb-2 border-b border-dark-400">
                  Hematología
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Hemoglobina (g/dL)"
                    type="number"
                    step="0.1"
                    value={formData.labs.hb}
                    onChange={(e) => handleLabChange('hb', e.target.value)}
                    placeholder="12-16"
                  />
                  <Input
                    label="Hematocrito (%)"
                    type="number"
                    step="0.1"
                    value={formData.labs.hto}
                    onChange={(e) => handleLabChange('hto', e.target.value)}
                    placeholder="36-48"
                  />
                  <Input
                    label="Plaquetas (10³/µL)"
                    type="number"
                    step="1"
                    value={formData.labs.platelets}
                    onChange={(e) => handleLabChange('platelets', e.target.value)}
                    placeholder="150-400"
                  />
                </div>
              </div>

              {/* Coagulación */}
              <div>
                <h4 className="text-sm font-semibold text-gray-200 mb-3 pb-2 border-b border-dark-400">
                  Coagulación
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="TP (seg)"
                    type="number"
                    step="0.1"
                    value={formData.labs.pt}
                    onChange={(e) => handleLabChange('pt', e.target.value)}
                    placeholder="11-13"
                  />
                  <Input
                    label="INR"
                    type="number"
                    step="0.01"
                    value={formData.labs.inr}
                    onChange={(e) => handleLabChange('inr', e.target.value)}
                    placeholder="0.8-1.2"
                  />
                  <Input
                    label="Fibrinógeno (mg/dL)"
                    type="number"
                    step="1"
                    value={formData.labs.fibrinogen}
                    onChange={(e) => handleLabChange('fibrinogen', e.target.value)}
                    placeholder="200-400"
                  />
                </div>
              </div>

              {/* Bioquímica */}
              <div>
                <h4 className="text-sm font-semibold text-gray-200 mb-3 pb-2 border-b border-dark-400">
                  Bioquímica
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Glucemia (mg/dL)"
                    type="number"
                    step="1"
                    value={formData.labs.glucose}
                    onChange={(e) => handleLabChange('glucose', e.target.value)}
                    placeholder="70-110"
                  />
                  <Input
                    label="Sodio (mEq/L)"
                    type="number"
                    step="0.1"
                    value={formData.labs.sodium}
                    onChange={(e) => handleLabChange('sodium', e.target.value)}
                    placeholder="135-145"
                  />
                  <Input
                    label="Potasio (mEq/L)"
                    type="number"
                    step="0.1"
                    value={formData.labs.potassium}
                    onChange={(e) => handleLabChange('potassium', e.target.value)}
                    placeholder="3.5-5.0"
                  />
                  <Input
                    label="Calcio Iónico (mmol/L)"
                    type="number"
                    step="0.01"
                    value={formData.labs.ionicCalcium}
                    onChange={(e) => handleLabChange('ionicCalcium', e.target.value)}
                    placeholder="1.1-1.3"
                  />
                  <Input
                    label="Magnesio (mEq/L)"
                    type="number"
                    step="0.1"
                    value={formData.labs.magnesium}
                    onChange={(e) => handleLabChange('magnesium', e.target.value)}
                    placeholder="1.5-2.5"
                  />
                  <Input
                    label="Azotemia (mg/dL)"
                    type="number"
                    step="1"
                    value={formData.labs.azotemia}
                    onChange={(e) => handleLabChange('azotemia', e.target.value)}
                    placeholder="10-50"
                  />
                  <Input
                    label="Creatinina (mg/dL)"
                    type="number"
                    step="0.01"
                    value={formData.labs.creatinine}
                    onChange={(e) => handleLabChange('creatinine', e.target.value)}
                    placeholder="0.6-1.2"
                  />
                  <Input
                    label="TFG (mL/min/1.73m²)"
                    type="number"
                    step="1"
                    value={formData.labs.gfr}
                    onChange={(e) => handleLabChange('gfr', e.target.value)}
                    placeholder=">60"
                  />
                </div>
              </div>

              {/* Función Hepática */}
              <div>
                <h4 className="text-sm font-semibold text-gray-200 mb-3 pb-2 border-b border-dark-400">
                  Función Hepática
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="SGOT/AST (U/L)"
                    type="number"
                    step="1"
                    value={formData.labs.sgot}
                    onChange={(e) => handleLabChange('sgot', e.target.value)}
                    placeholder="<40"
                  />
                  <Input
                    label="SGPT/ALT (U/L)"
                    type="number"
                    step="1"
                    value={formData.labs.sgpt}
                    onChange={(e) => handleLabChange('sgpt', e.target.value)}
                    placeholder="<40"
                  />
                  <Input
                    label="Bilirrubina Total (mg/dL)"
                    type="number"
                    step="0.1"
                    value={formData.labs.totalBili}
                    onChange={(e) => handleLabChange('totalBili', e.target.value)}
                    placeholder="0.3-1.2"
                  />
                  <Input
                    label="Albúmina (g/dL)"
                    type="number"
                    step="0.1"
                    value={formData.labs.albumin}
                    onChange={(e) => handleLabChange('albumin', e.target.value)}
                    placeholder="3.5-5.0"
                  />
                </div>
              </div>

              {/* Otros */}
              <div>
                <h4 className="text-sm font-semibold text-gray-200 mb-3 pb-2 border-b border-dark-400">
                  Otros
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="TSH (µUI/mL)"
                    type="number"
                    step="0.01"
                    value={formData.labs.tsh}
                    onChange={(e) => handleLabChange('tsh', e.target.value)}
                    placeholder="0.4-4.0"
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Nota sobre estudios complementarios */}
        <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-blue-200 font-medium mb-1">
              Estudios Complementarios
            </p>
            <p className="text-sm text-blue-300">
              Los estudios complementarios (ECG, ecocardiograma, laboratorios, etc.) se agregan después de guardar la evaluación. Una vez guardada, podrás subir todos los archivos desde la página de detalle de la evaluación.
            </p>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex justify-end gap-3">
          <Link href="/preop">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Guardar Evaluación
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewPreopEvaluation() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="h-full px-8 py-6">
          <NewPreopEvaluationContent />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
