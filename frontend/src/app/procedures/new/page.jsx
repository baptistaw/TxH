'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card, { CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { proceduresApi, patientsApi } from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import { useCatalogs } from '@/hooks/useCatalog';

function NewProcedureContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  // Cargar catálogos
  const { catalogs, loading: catalogsLoading } = useCatalogs([
    'ProcedureType',
    'ASA',
    'ProcedureLocation',
    'AirwayManagement',
    'VentilationPattern',
    'HemodynamicStatus',
    'AnesthesiaTechnique',
    'VentilationMode'
  ]);

  const [formData, setFormData] = useState({
    patientId: '',
    startAt: '',
    endAt: '',
    procedureType: '',
    procedureTypeDetail: '',
    location: '',
    asa: '',
    airwayPreop: '',
    ventilationPreop: '',
    hemodynamicsPreop: '',
    gcs: '',
    provenance: '',
    premedication: false,
    prophylacticATB: '',
    airwayIntraop: '',
    fullStomach: false,
    rapidSequence: false,
    difficultAirway: false,
    position: '',
    anesthesiaTech: '',
    ventilationIntraop: '',
    ventModeDetail: '',
    regionalAnesthesia: '',
    destination: '',
    airwayPostop: '',
    ventilationPostop: '',
    hemodynamicsPostop: '',
    complications: '',
  });

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoadingPatients(true);
      const response = await patientsApi.list();
      setPatients(response.data || response || []);
    } catch (err) {
      console.error('Error loading patients:', err);
      setError('Error al cargar la lista de pacientes');
    } finally {
      setLoadingPatients(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Auto-calcular duración si hay startAt y endAt
    if ((field === 'startAt' || field === 'endAt') && formData.startAt && formData.endAt) {
      const start = new Date(field === 'startAt' ? value : formData.startAt);
      const end = new Date(field === 'endAt' ? value : formData.endAt);
      const durationMinutes = Math.round((end - start) / (1000 * 60));
      if (durationMinutes > 0) {
        setFormData(prev => ({ ...prev, duration: durationMinutes }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.patientId) {
        throw new Error('Debe seleccionar un paciente');
      }

      // Calcular duración
      let duration = null;
      if (formData.startAt && formData.endAt) {
        const start = new Date(formData.startAt);
        const end = new Date(formData.endAt);
        duration = Math.round((end - start) / (1000 * 60));
      }

      const payload = {
        patientId: formData.patientId,
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
      };

      const newProcedure = await proceduresApi.create(payload);
      router.push(`/procedures/${newProcedure.id}`);
    } catch (err) {
      console.error('Error creating procedure:', err);
      setError(err.message || 'Error al crear el procedimiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
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
          <h1 className="text-3xl font-bold text-gray-100">Nuevo Procedimiento Quirúrgico</h1>
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
        {/* Datos Básicos */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Datos Básicos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Paciente <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.patientId}
                  onChange={(e) => handleChange('patientId', e.target.value)}
                  className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                  required
                  disabled={loadingPatients}
                >
                  <option value="">Seleccionar paciente...</option>
                  {Array.isArray(patients) && patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.id} - {patient.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Procedimiento</label>
                <select
                  value={formData.procedureType}
                  onChange={(e) => handleChange('procedureType', e.target.value)}
                  disabled={catalogsLoading}
                  className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500"
                >
                  <option value="">Seleccionar...</option>
                  {(catalogs.ProcedureType || []).map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Detalle del Procedimiento"
                value={formData.procedureTypeDetail}
                onChange={(e) => handleChange('procedureTypeDetail', e.target.value)}
                placeholder="Especificar si es necesario"
              />

              <Input
                label="Ubicación"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="BQ, CTI, Sala, etc."
              />

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
          </CardContent>
        </Card>

        {/* Clasificación y Estado Preoperatorio */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Clasificación y Estado Preoperatorio</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                placeholder="3-15"
              />

              <Input
                label="Procedencia"
                value={formData.provenance}
                onChange={(e) => handleChange('provenance', e.target.value)}
                placeholder="Domicilio, CTI, Sala..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Manejo Anestésico */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Manejo Anestésico</h3>

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
                placeholder="Antibiótico utilizado"
              />

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

              <Input
                label="Anestesia Regional (si aplica)"
                value={formData.regionalAnesthesia}
                onChange={(e) => handleChange('regionalAnesthesia', e.target.value)}
                placeholder="Detalle de técnica regional"
              />
            </div>
          </CardContent>
        </Card>

        {/* Estado Postoperatorio */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Estado Postoperatorio</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Destino"
                value={formData.destination}
                onChange={(e) => handleChange('destination', e.target.value)}
                placeholder="Sala, CTI, etc."
              />

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
                placeholder="Describir cualquier complicación..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Botones de Acción */}
        <div className="flex justify-end gap-3">
          <Link href="/procedures">
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
                Guardar Procedimiento
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewProcedure() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="h-full px-8 py-6">
          <NewProcedureContent />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
