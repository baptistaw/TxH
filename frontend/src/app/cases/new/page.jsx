'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { patientsApi, casesApi, cliniciansApi } from '@/lib/api';
import { formatCI } from '@/lib/utils';

export default function NewCasePage() {
  return (
    <ProtectedRoute>
      <NewCaseContent />
    </ProtectedRoute>
  );
}

function NewCaseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPatientId = searchParams.get('patientId');

  // Estados
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // 1: paciente, 2: datos trasplante, 3: equipo, 4: confirmar

  // Paciente
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchingPatients, setSearchingPatients] = useState(false);

  // Clínicos
  const [clinicians, setClinicians] = useState([]);
  const [loadingClinicians, setLoadingClinicians] = useState(false);

  // Función helper para obtener fecha/hora actual en formato datetime-local
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Datos del trasplante (solo datos de INICIO)
  const [formData, setFormData] = useState({
    startAt: getCurrentDateTime(), // Fecha/hora actual por defecto
    isRetransplant: false,
    isHepatoRenal: false,
    optimalDonor: null,
    provenance: '',
    observations: '',
  });

  // Equipo quirúrgico - arrays de IDs
  const [anesthesiologists, setAnesthesiologists] = useState([]);
  const [surgeons, setSurgeons] = useState([]);
  const [hepatologists, setHepatologists] = useState([]);
  const [intensivists, setIntensivists] = useState([]);
  const [nurseCoordinators, setNurseCoordinators] = useState([]);

  // Cargar paciente preseleccionado
  useEffect(() => {
    if (preselectedPatientId) {
      loadPatient(preselectedPatientId);
    }
  }, [preselectedPatientId]);

  // Cargar clínicos
  useEffect(() => {
    loadClinicians();
  }, []);

  const loadPatient = async (patientId) => {
    try {
      const patient = await patientsApi.getById(patientId);
      setSelectedPatient(patient);
      setStep(2); // Ir directamente a datos del trasplante
    } catch (err) {
      console.error('Error loading patient:', err);
      setError('No se pudo cargar el paciente');
    }
  };

  const loadClinicians = async () => {
    try {
      setLoadingClinicians(true);
      const data = await cliniciansApi.list();
      // cliniciansApi.list() retorna el array directamente (response.data del backend)
      // pero por compatibilidad manejamos ambos casos
      const cliniciansList = Array.isArray(data) ? data : (data?.data || []);
      setClinicians(cliniciansList);
    } catch (err) {
      console.error('Error loading clinicians:', err);
    } finally {
      setLoadingClinicians(false);
    }
  };

  const searchPatients = async (query) => {
    if (!query || query.length < 2) {
      setPatients([]);
      return;
    }

    try {
      setSearchingPatients(true);
      const response = await patientsApi.list({ q: query, limit: 50 });
      setPatients(response.data || []);
    } catch (err) {
      console.error('Error searching patients:', err);
    } finally {
      setSearchingPatients(false);
    }
  };

  const handlePatientSearchChange = (value) => {
    setPatientSearch(value);
    searchPatients(value);
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setPatients([]);
    setPatientSearch('');
    setStep(2);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Agregar anestesiólogo
  const addAnesthesiologist = (clinicianId) => {
    if (clinicianId && !anesthesiologists.includes(clinicianId)) {
      setAnesthesiologists(prev => [...prev, clinicianId]);
    }
  };

  // Eliminar anestesiólogo
  const removeAnesthesiologist = (clinicianId) => {
    setAnesthesiologists(prev => prev.filter(id => id !== clinicianId));
  };

  // Agregar cirujano
  const addSurgeon = (clinicianId) => {
    if (clinicianId && !surgeons.includes(clinicianId)) {
      setSurgeons(prev => [...prev, clinicianId]);
    }
  };

  // Eliminar cirujano
  const removeSurgeon = (clinicianId) => {
    setSurgeons(prev => prev.filter(id => id !== clinicianId));
  };

  // Agregar hepatólogo
  const addHepatologist = (clinicianId) => {
    if (clinicianId && !hepatologists.includes(clinicianId)) {
      setHepatologists(prev => [...prev, clinicianId]);
    }
  };

  // Eliminar hepatólogo
  const removeHepatologist = (clinicianId) => {
    setHepatologists(prev => prev.filter(id => id !== clinicianId));
  };

  // Agregar intensivista
  const addIntensivist = (clinicianId) => {
    if (clinicianId && !intensivists.includes(clinicianId)) {
      setIntensivists(prev => [...prev, clinicianId]);
    }
  };

  // Eliminar intensivista
  const removeIntensivist = (clinicianId) => {
    setIntensivists(prev => prev.filter(id => id !== clinicianId));
  };

  // Agregar nurse coordinadora
  const addNurseCoordinator = (clinicianId) => {
    if (clinicianId && !nurseCoordinators.includes(clinicianId)) {
      setNurseCoordinators(prev => [...prev, clinicianId]);
    }
  };

  // Eliminar nurse coordinadora
  const removeNurseCoordinator = (clinicianId) => {
    setNurseCoordinators(prev => prev.filter(id => id !== clinicianId));
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      // Validaciones
      if (!selectedPatient) {
        throw new Error('Debe seleccionar un paciente');
      }

      if (!formData.startAt) {
        throw new Error('La fecha/hora de inicio es requerida');
      }

      // Preparar payload del trasplante (solo datos de inicio)
      const casePayload = {
        patientId: selectedPatient.id,
        startAt: new Date(formData.startAt).toISOString(),
        isRetransplant: formData.isRetransplant,
        isHepatoRenal: formData.isHepatoRenal,
        optimalDonor: formData.optimalDonor === 'true' ? true : formData.optimalDonor === 'false' ? false : null,
        provenance: formData.provenance || null,
        observations: formData.observations || null,
      };

      // Crear caso
      const newCase = await casesApi.create(casePayload);

      // Crear team assignments si hay miembros seleccionados
      const teamPromises = [];

      // Agregar anestesiólogos
      anesthesiologists.forEach(clinicianId => {
        teamPromises.push(casesApi.addTeamMember(newCase.id, {
          clinicianId: parseInt(clinicianId),
          role: 'ANESTESIOLOGO'
        }));
      });

      // Agregar cirujanos
      surgeons.forEach(clinicianId => {
        teamPromises.push(casesApi.addTeamMember(newCase.id, {
          clinicianId: parseInt(clinicianId),
          role: 'CIRUJANO'
        }));
      });

      // Agregar hepatólogos
      hepatologists.forEach(clinicianId => {
        teamPromises.push(casesApi.addTeamMember(newCase.id, {
          clinicianId: parseInt(clinicianId),
          role: 'HEPATOLOGO'
        }));
      });

      // Agregar intensivistas
      intensivists.forEach(clinicianId => {
        teamPromises.push(casesApi.addTeamMember(newCase.id, {
          clinicianId: parseInt(clinicianId),
          role: 'INTENSIVISTA'
        }));
      });

      // Agregar nurse coordinadoras
      nurseCoordinators.forEach(clinicianId => {
        teamPromises.push(casesApi.addTeamMember(newCase.id, {
          clinicianId: parseInt(clinicianId),
          role: 'NURSE_COORD'
        }));
      });

      // Esperar a que se agreguen todos los miembros del equipo
      if (teamPromises.length > 0) {
        await Promise.all(teamPromises);
      }

      alert(`Trasplante registrado exitosamente para ${selectedPatient.name}`);
      router.push(`/cases/${newCase.id}`);
    } catch (err) {
      console.error('Error creating case:', err);
      setError(err.message || 'Error al crear el trasplante');
    } finally {
      setLoading(false);
    }
  };

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

          <h1 className="text-3xl font-bold text-gray-100 mb-2">
            Registrar Nuevo Trasplante
          </h1>
          <p className="text-gray-400">
            Crear un nuevo registro de trasplante hepático
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            {/* Step 1 */}
            <div className={`flex items-center ${step >= 1 ? 'text-surgical-400' : 'text-gray-600'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-surgical-500 text-white' : 'bg-dark-600'}`}>
                1
              </div>
              <span className="ml-2 font-medium hidden sm:inline">Paciente</span>
            </div>

            <div className={`h-0.5 w-12 ${step >= 2 ? 'bg-surgical-500' : 'bg-dark-600'}`} />

            {/* Step 2 */}
            <div className={`flex items-center ${step >= 2 ? 'text-surgical-400' : 'text-gray-600'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-surgical-500 text-white' : 'bg-dark-600'}`}>
                2
              </div>
              <span className="ml-2 font-medium hidden sm:inline">Datos</span>
            </div>

            <div className={`h-0.5 w-12 ${step >= 3 ? 'bg-surgical-500' : 'bg-dark-600'}`} />

            {/* Step 3 */}
            <div className={`flex items-center ${step >= 3 ? 'text-surgical-400' : 'text-gray-600'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-surgical-500 text-white' : 'bg-dark-600'}`}>
                3
              </div>
              <span className="ml-2 font-medium hidden sm:inline">Equipo</span>
            </div>

            <div className={`h-0.5 w-12 ${step >= 4 ? 'bg-surgical-500' : 'bg-dark-600'}`} />

            {/* Step 4 */}
            <div className={`flex items-center ${step >= 4 ? 'text-surgical-400' : 'text-gray-600'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 4 ? 'bg-surgical-500 text-white' : 'bg-dark-600'}`}>
                4
              </div>
              <span className="ml-2 font-medium hidden sm:inline">Confirmar</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Step 1: Seleccionar Paciente */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Seleccionar Paciente</CardTitle>
              <CardDescription>
                Busca y selecciona el paciente para este trasplante
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Búsqueda */}
              <div>
                <Input
                  label="Buscar paciente por CI o nombre"
                  placeholder="Ingrese CI o nombre del paciente..."
                  value={patientSearch}
                  onChange={(e) => handlePatientSearchChange(e.target.value)}
                />

                {/* Resultados de búsqueda */}
                {searchingPatients && (
                  <p className="text-sm text-gray-400 mt-2">Buscando...</p>
                )}

                {patients.length > 0 && (
                  <div className="mt-4 border border-dark-400 rounded-lg divide-y divide-dark-400">
                    {patients.map((patient) => (
                      <button
                        key={patient.id}
                        onClick={() => handleSelectPatient(patient)}
                        className="w-full p-4 text-left hover:bg-dark-700 transition-colors"
                      >
                        <p className="font-medium text-gray-200">{patient.name}</p>
                        <p className="text-sm text-gray-400">CI: {formatCI(patient.id)}</p>
                        <p className="text-xs text-gray-500">
                          {patient.sex} | {patient.provider || 'Sin prestador'}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-dark-400 pt-6">
                <p className="text-sm text-gray-400 mb-4">¿El paciente no existe?</p>
                <Link href="/patients/new">
                  <Button variant="outline">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Crear Nuevo Paciente
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Datos del Trasplante */}
        {step === 2 && selectedPatient && (
          <div className="space-y-6">
            {/* Paciente seleccionado */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Paciente seleccionado:</p>
                    <p className="text-xl font-bold text-gray-100">{selectedPatient.name}</p>
                    <p className="text-sm text-gray-400">CI: {formatCI(selectedPatient.id)}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                    Cambiar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Formulario de datos */}
            <Card>
              <CardHeader>
                <CardTitle>Datos del Trasplante</CardTitle>
                <CardDescription>
                  Información del inicio del procedimiento (los datos de finalización se completan después del intraoperatorio)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Fecha/Hora de inicio */}
                <div>
                  <Input
                    label="Fecha/Hora de Inicio del Trasplante *"
                    type="datetime-local"
                    value={formData.startAt}
                    onChange={(e) => handleChange('startAt', e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Se cargó automáticamente la fecha/hora actual
                  </p>
                </div>

                {/* Características del caso */}
                <div className="border-t border-dark-400 pt-4">
                  <h4 className="text-sm font-semibold text-gray-300 mb-4">
                    Características del Caso
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="isRetransplant"
                        checked={formData.isRetransplant}
                        onChange={(e) => handleChange('isRetransplant', e.target.checked)}
                        className="w-4 h-4 rounded border-dark-400 bg-dark-700 text-surgical-500 focus:ring-surgical-500"
                      />
                      <label htmlFor="isRetransplant" className="text-gray-300">
                        Retrasplante
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="isHepatoRenal"
                        checked={formData.isHepatoRenal}
                        onChange={(e) => handleChange('isHepatoRenal', e.target.checked)}
                        className="w-4 h-4 rounded border-dark-400 bg-dark-700 text-surgical-500 focus:ring-surgical-500"
                      />
                      <label htmlFor="isHepatoRenal" className="text-gray-300">
                        Trasplante Hepato-Renal
                      </label>
                    </div>
                  </div>
                </div>

                {/* Datos del donante y procedencia */}
                <div className="border-t border-dark-400 pt-4">
                  <h4 className="text-sm font-semibold text-gray-300 mb-4">
                    Donante y Procedencia
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Donante Óptimo
                      </label>
                      <select
                        value={formData.optimalDonor === null ? '' : formData.optimalDonor.toString()}
                        onChange={(e) => handleChange('optimalDonor', e.target.value === '' ? null : e.target.value)}
                        className="w-full px-4 py-2 rounded-lg bg-dark-700 border border-dark-400 text-gray-100 focus:outline-none focus:ring-2 focus:ring-surgical-500"
                      >
                        <option value="">No especificado</option>
                        <option value="true">Sí</option>
                        <option value="false">No</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Procedencia del Paciente
                      </label>
                      <select
                        value={formData.provenance}
                        onChange={(e) => handleChange('provenance', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg bg-dark-700 border border-dark-400 text-gray-100 focus:outline-none focus:ring-2 focus:ring-surgical-500"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Domicilio">Domicilio</option>
                        <option value="CTI">CTI</option>
                        <option value="Sala">Sala</option>
                        <option value="Emergencia">Emergencia</option>
                        <option value="Block Quirúrgico">Block Quirúrgico</option>
                        <option value="Otro Centro">Otro Centro</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Observaciones */}
                <div className="border-t border-dark-400 pt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Observaciones Iniciales
                  </label>
                  <textarea
                    value={formData.observations}
                    onChange={(e) => handleChange('observations', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg bg-dark-700 border border-dark-400 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-surgical-500"
                    placeholder="Notas adicionales sobre el trasplante..."
                  />
                </div>

                {/* Nota informativa */}
                <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm text-blue-400 font-medium">Nota</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Los tiempos de isquemia, fecha de fin y traslado a CTI se registrarán después del registro intraoperatorio
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botones de navegación */}
            <div className="flex gap-3 justify-between">
              <Button variant="secondary" onClick={() => setStep(1)}>
                ← Anterior
              </Button>
              <Button variant="primary" onClick={() => setStep(3)}>
                Continuar →
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Equipo Clínico */}
        {step === 3 && selectedPatient && (
          <div className="space-y-6">
            {/* Paciente seleccionado */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Paciente seleccionado:</p>
                    <p className="text-xl font-bold text-gray-100">{selectedPatient.name}</p>
                    <p className="text-sm text-gray-400">CI: {formatCI(selectedPatient.id)}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                    Cambiar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Formulario de equipo */}
            <Card>
              <CardHeader>
                <CardTitle>Equipo Clínico</CardTitle>
                <CardDescription>
                  Selecciona los miembros del equipo para este trasplante (opcional)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loadingClinicians ? (
                  <p className="text-gray-400">Cargando clínicos...</p>
                ) : (
                  <>
                    {/* Anestesiólogos */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-300 mb-3">
                        Anestesiólogos
                      </h4>

                      {/* Selector para agregar */}
                      <div className="flex gap-2 mb-3">
                        <select
                          id="anest-selector"
                          className="flex-1 px-4 py-2 rounded-lg bg-dark-700 border border-dark-400 text-gray-100 focus:outline-none focus:ring-2 focus:ring-surgical-500"
                          onChange={(e) => {
                            if (e.target.value) {
                              addAnesthesiologist(e.target.value);
                              e.target.value = '';
                            }
                          }}
                        >
                          <option value="">Seleccionar anestesiólogo...</option>
                          {clinicians
                            .filter(c => c.specialty === 'ANESTESIOLOGO' && !anesthesiologists.includes(c.id.toString()))
                            .map(clinician => (
                              <option key={clinician.id} value={clinician.id}>
                                {clinician.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Lista de anestesiólogos agregados */}
                      {anesthesiologists.length > 0 ? (
                        <div className="space-y-2">
                          {anesthesiologists.map(clinicianId => {
                            const clinician = clinicians.find(c => c.id === parseInt(clinicianId));
                            return (
                              <div key={clinicianId} className="flex items-center justify-between bg-dark-700 rounded-lg p-3 border border-dark-400">
                                <span className="text-gray-200">{clinician?.name || 'Desconocido'}</span>
                                <button
                                  type="button"
                                  onClick={() => removeAnesthesiologist(clinicianId)}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                  title="Eliminar"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No hay anestesiólogos agregados</p>
                      )}
                    </div>

                    {/* Cirujanos */}
                    <div className="border-t border-dark-400 pt-4">
                      <h4 className="text-sm font-semibold text-gray-300 mb-3">
                        Cirujanos
                      </h4>

                      {/* Selector para agregar */}
                      <div className="flex gap-2 mb-3">
                        <select
                          id="surgeon-selector"
                          className="flex-1 px-4 py-2 rounded-lg bg-dark-700 border border-dark-400 text-gray-100 focus:outline-none focus:ring-2 focus:ring-surgical-500"
                          onChange={(e) => {
                            if (e.target.value) {
                              addSurgeon(e.target.value);
                              e.target.value = '';
                            }
                          }}
                        >
                          <option value="">Seleccionar cirujano...</option>
                          {clinicians
                            .filter(c => c.specialty === 'CIRUJANO' && !surgeons.includes(c.id.toString()))
                            .map(clinician => (
                              <option key={clinician.id} value={clinician.id}>
                                {clinician.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Lista de cirujanos agregados */}
                      {surgeons.length > 0 ? (
                        <div className="space-y-2">
                          {surgeons.map(clinicianId => {
                            const clinician = clinicians.find(c => c.id === parseInt(clinicianId));
                            return (
                              <div key={clinicianId} className="flex items-center justify-between bg-dark-700 rounded-lg p-3 border border-dark-400">
                                <span className="text-gray-200">{clinician?.name || 'Desconocido'}</span>
                                <button
                                  type="button"
                                  onClick={() => removeSurgeon(clinicianId)}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                  title="Eliminar"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No hay cirujanos agregados</p>
                      )}
                    </div>

                    {/* Hepatólogos */}
                    <div className="border-t border-dark-400 pt-4">
                      <h4 className="text-sm font-semibold text-gray-300 mb-3">
                        Hepatólogos
                      </h4>

                      <div className="flex gap-2 mb-3">
                        <select
                          id="hepatologist-selector"
                          className="flex-1 px-4 py-2 rounded-lg bg-dark-700 border border-dark-400 text-gray-100 focus:outline-none focus:ring-2 focus:ring-surgical-500"
                          onChange={(e) => {
                            if (e.target.value) {
                              addHepatologist(e.target.value);
                              e.target.value = '';
                            }
                          }}
                        >
                          <option value="">Seleccionar hepatólogo...</option>
                          {clinicians
                            .filter(c => c.specialty === 'HEPATOLOGO' && !hepatologists.includes(c.id.toString()))
                            .map(clinician => (
                              <option key={clinician.id} value={clinician.id}>
                                {clinician.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      {hepatologists.length > 0 ? (
                        <div className="space-y-2">
                          {hepatologists.map(clinicianId => {
                            const clinician = clinicians.find(c => c.id === parseInt(clinicianId));
                            return (
                              <div key={clinicianId} className="flex items-center justify-between bg-dark-700 rounded-lg p-3 border border-dark-400">
                                <span className="text-gray-200">{clinician?.name || 'Desconocido'}</span>
                                <button
                                  type="button"
                                  onClick={() => removeHepatologist(clinicianId)}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                  title="Eliminar"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No hay hepatólogos agregados</p>
                      )}
                    </div>

                    {/* Intensivistas */}
                    <div className="border-t border-dark-400 pt-4">
                      <h4 className="text-sm font-semibold text-gray-300 mb-3">
                        Intensivistas
                      </h4>

                      <div className="flex gap-2 mb-3">
                        <select
                          id="intensivist-selector"
                          className="flex-1 px-4 py-2 rounded-lg bg-dark-700 border border-dark-400 text-gray-100 focus:outline-none focus:ring-2 focus:ring-surgical-500"
                          onChange={(e) => {
                            if (e.target.value) {
                              addIntensivist(e.target.value);
                              e.target.value = '';
                            }
                          }}
                        >
                          <option value="">Seleccionar intensivista...</option>
                          {clinicians
                            .filter(c => c.specialty === 'INTENSIVISTA' && !intensivists.includes(c.id.toString()))
                            .map(clinician => (
                              <option key={clinician.id} value={clinician.id}>
                                {clinician.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      {intensivists.length > 0 ? (
                        <div className="space-y-2">
                          {intensivists.map(clinicianId => {
                            const clinician = clinicians.find(c => c.id === parseInt(clinicianId));
                            return (
                              <div key={clinicianId} className="flex items-center justify-between bg-dark-700 rounded-lg p-3 border border-dark-400">
                                <span className="text-gray-200">{clinician?.name || 'Desconocido'}</span>
                                <button
                                  type="button"
                                  onClick={() => removeIntensivist(clinicianId)}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                  title="Eliminar"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No hay intensivistas agregados</p>
                      )}
                    </div>

                    {/* Nurse Coordinadoras */}
                    <div className="border-t border-dark-400 pt-4">
                      <h4 className="text-sm font-semibold text-gray-300 mb-3">
                        Nurse Coordinadoras
                      </h4>

                      <div className="flex gap-2 mb-3">
                        <select
                          id="nurse-selector"
                          className="flex-1 px-4 py-2 rounded-lg bg-dark-700 border border-dark-400 text-gray-100 focus:outline-none focus:ring-2 focus:ring-surgical-500"
                          onChange={(e) => {
                            if (e.target.value) {
                              addNurseCoordinator(e.target.value);
                              e.target.value = '';
                            }
                          }}
                        >
                          <option value="">Seleccionar nurse coordinadora...</option>
                          {clinicians
                            .filter(c => c.specialty === 'COORDINADORA' && !nurseCoordinators.includes(c.id.toString()))
                            .map(clinician => (
                              <option key={clinician.id} value={clinician.id}>
                                {clinician.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      {nurseCoordinators.length > 0 ? (
                        <div className="space-y-2">
                          {nurseCoordinators.map(clinicianId => {
                            const clinician = clinicians.find(c => c.id === parseInt(clinicianId));
                            return (
                              <div key={clinicianId} className="flex items-center justify-between bg-dark-700 rounded-lg p-3 border border-dark-400">
                                <span className="text-gray-200">{clinician?.name || 'Desconocido'}</span>
                                <button
                                  type="button"
                                  onClick={() => removeNurseCoordinator(clinicianId)}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                  title="Eliminar"
                                >
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No hay nurse coordinadoras agregadas</p>
                      )}
                    </div>

                    {/* Nota informativa */}
                    <div className="bg-blue-900/20 border border-blue-500/50 rounded-lg p-4">
                      <div className="flex gap-3">
                        <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-sm text-blue-400 font-medium">Nota</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Puedes agregar tantos miembros del equipo como necesites. El equipo puede ser modificado posteriormente.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Botones de navegación */}
            <div className="flex gap-3 justify-between">
              <Button variant="secondary" onClick={() => setStep(2)}>
                ← Anterior
              </Button>
              <Button variant="primary" onClick={() => setStep(4)}>
                Continuar →
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmación */}
        {step === 4 && selectedPatient && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Confirmar Datos</CardTitle>
                <CardDescription>
                  Revisa la información antes de crear el trasplante
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Resumen del paciente */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-200 mb-3">Paciente</h3>
                  <div className="bg-dark-700 rounded-lg p-4 space-y-2">
                    <p className="text-gray-300"><span className="text-gray-500">Nombre:</span> {selectedPatient.name}</p>
                    <p className="text-gray-300"><span className="text-gray-500">CI:</span> {formatCI(selectedPatient.id)}</p>
                    <p className="text-gray-300"><span className="text-gray-500">Prestador:</span> {selectedPatient.provider || 'No especificado'}</p>
                  </div>
                </div>

                {/* Resumen del trasplante */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-200 mb-3">Datos del Trasplante</h3>
                  <div className="bg-dark-700 rounded-lg p-4 space-y-2">
                    <p className="text-gray-300">
                      <span className="text-gray-500">Inicio:</span> {formData.startAt ? new Date(formData.startAt).toLocaleString('es-UY') : 'No especificado'}
                    </p>
                    {formData.isRetransplant && (
                      <p className="text-yellow-400">✓ Retrasplante</p>
                    )}
                    {formData.isHepatoRenal && (
                      <p className="text-blue-400">✓ Hepato-Renal</p>
                    )}
                    {formData.optimalDonor !== null && (
                      <p className="text-gray-300">
                        <span className="text-gray-500">Donante Óptimo:</span> {formData.optimalDonor === 'true' ? 'Sí' : 'No'}
                      </p>
                    )}
                    {formData.provenance && (
                      <p className="text-gray-300">
                        <span className="text-gray-500">Procedencia:</span> {formData.provenance}
                      </p>
                    )}
                  </div>
                </div>

                {/* Resumen del equipo */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-200 mb-3">Equipo Clínico</h3>
                  <div className="bg-dark-700 rounded-lg p-4 space-y-3">
                    {anesthesiologists.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">
                          Anestesiólogos ({anesthesiologists.length}):
                        </h4>
                        <div className="space-y-1 pl-2">
                          {anesthesiologists.map(id => (
                            <p key={id} className="text-gray-300">
                              • {clinicians.find(c => c.id === parseInt(id))?.name || 'Desconocido'}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    {surgeons.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">
                          Cirujanos ({surgeons.length}):
                        </h4>
                        <div className="space-y-1 pl-2">
                          {surgeons.map(id => (
                            <p key={id} className="text-gray-300">
                              • {clinicians.find(c => c.id === parseInt(id))?.name || 'Desconocido'}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    {hepatologists.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">
                          Hepatólogos ({hepatologists.length}):
                        </h4>
                        <div className="space-y-1 pl-2">
                          {hepatologists.map(id => (
                            <p key={id} className="text-gray-300">
                              • {clinicians.find(c => c.id === parseInt(id))?.name || 'Desconocido'}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    {intensivists.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">
                          Intensivistas ({intensivists.length}):
                        </h4>
                        <div className="space-y-1 pl-2">
                          {intensivists.map(id => (
                            <p key={id} className="text-gray-300">
                              • {clinicians.find(c => c.id === parseInt(id))?.name || 'Desconocido'}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    {nurseCoordinators.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-2">
                          Nurse Coordinadoras ({nurseCoordinators.length}):
                        </h4>
                        <div className="space-y-1 pl-2">
                          {nurseCoordinators.map(id => (
                            <p key={id} className="text-gray-300">
                              • {clinicians.find(c => c.id === parseInt(id))?.name || 'Desconocido'}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    {anesthesiologists.length === 0 && surgeons.length === 0 && hepatologists.length === 0 && intensivists.length === 0 && nurseCoordinators.length === 0 && (
                      <p className="text-gray-500 italic">No se seleccionó equipo clínico</p>
                    )}
                  </div>
                </div>

                {formData.observations && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-200 mb-3">Observaciones</h3>
                    <div className="bg-dark-700 rounded-lg p-4">
                      <p className="text-gray-300 whitespace-pre-wrap">{formData.observations}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Botones de acción */}
            <div className="flex gap-3 justify-between">
              <Button variant="secondary" onClick={() => setStep(3)}>
                ← Anterior
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={loading}
                isLoading={loading}
              >
                Crear Trasplante
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
