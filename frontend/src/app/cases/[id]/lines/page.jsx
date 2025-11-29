// src/app/cases/[id]/lines/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { casesApi } from '@/lib/api';
import { formatCI } from '@/lib/utils';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { useAuth } from '@/contexts/AuthContext';

export default function LinesMonitoringPage() {
  return (
    <ProtectedRoute>
      <LinesMonitoringContent />
    </ProtectedRoute>
  );
}

function LinesMonitoringContent() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [caseData, setCaseData] = useState(null);
  const [team, setTeam] = useState([]);
  const [isNew, setIsNew] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    cvc1: '',
    cvc2: '',
    cvc3: '',
    arterialLine1: '',
    arterialLine2: '',
    swanGanz: false,
    peripheralIV: '',
    airwayType: '',
    tubeSellick: false,
    laryngoscopy: '',
    anesthesiaType: '',
    premedication: '',
    warmer: false,
    cellSaverUsed: false,
    elasticBandages: false,
    thermalBlanket: false,
    pressurePoints: '',
    prophylacticATB: '',
  });

  // Cargar datos
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Cargar caso
        const caseResponse = await casesApi.getById(caseId);
        setCaseData(caseResponse);

        // Cargar equipo para verificar permisos
        try {
          const teamResponse = await casesApi.getTeam(caseId);
          setTeam(teamResponse || []);
        } catch (err) {
          console.warn('No se pudo cargar equipo:', err);
        }

        // Cargar líneas y monitoreo si existe
        try {
          const linesResponse = await casesApi.getLinesMonitoring(caseId);
          if (linesResponse) {
            setIsNew(false);
            setFormData({
              cvc1: linesResponse.cvc1 || '',
              cvc2: linesResponse.cvc2 || '',
              cvc3: linesResponse.cvc3 || '',
              arterialLine1: linesResponse.arterialLine1 || '',
              arterialLine2: linesResponse.arterialLine2 || '',
              swanGanz: linesResponse.swanGanz || false,
              peripheralIV: linesResponse.peripheralIV || '',
              airwayType: linesResponse.airwayType || '',
              tubeSellick: linesResponse.tubeSellick || false,
              laryngoscopy: linesResponse.laryngoscopy || '',
              anesthesiaType: linesResponse.anesthesiaType || '',
              premedication: linesResponse.premedication || '',
              warmer: linesResponse.warmer || false,
              cellSaverUsed: linesResponse.cellSaverUsed || false,
              elasticBandages: linesResponse.elasticBandages || false,
              thermalBlanket: linesResponse.thermalBlanket || false,
              pressurePoints: linesResponse.pressurePoints || '',
              prophylacticATB: linesResponse.prophylacticATB || '',
            });
          }
        } catch (err) {
          console.warn('No hay registro de líneas y monitoreo:', err);
          setIsNew(true);
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

  // Verificar permisos
  const canEdit = user && (
    user.role === 'ADMIN' ||
    (user.role === 'ANESTESIOLOGO' && team.some(member => member.clinicianId === user.id))
  );

  // Manejar cambios
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canEdit) {
      alert('No tienes permisos para editar este registro');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Preparar payload (solo enviar campos no vacíos)
      const payload = {};
      Object.keys(formData).forEach(key => {
        const value = formData[key];
        if (typeof value === 'boolean') {
          payload[key] = value;
        } else if (value && value !== '') {
          payload[key] = value;
        } else {
          payload[key] = null;
        }
      });

      if (isNew) {
        await casesApi.createLinesMonitoring(caseId, payload);
      } else {
        await casesApi.updateLinesMonitoring(caseId, payload);
      }

      alert('Líneas y monitoreo guardado exitosamente');
      router.push(`/cases/${caseId}`);
    } catch (err) {
      console.error('Error al guardar:', err);
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) {
    return <PageSpinner />;
  }

  if (error && !caseData) {
    return (
      <AppLayout>
        <div className="h-full px-8 py-6">
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
            <p className="text-gray-300">{error}</p>
            <Button onClick={() => router.back()} className="mt-4">
              Volver
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!canEdit) {
    return (
      <AppLayout>
        <div className="h-full px-8 py-6">
          <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-6">
            <h2 className="text-xl font-bold text-yellow-400 mb-2">Acceso Denegado</h2>
            <p className="text-gray-300">No tienes permisos para editar este registro</p>
            <Button onClick={() => router.back()} className="mt-4">
              Volver
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

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
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </Button>

          <h1 className="text-3xl font-bold text-gray-100 mb-2">
            {isNew ? 'Registrar' : 'Editar'} Líneas y Monitoreo
          </h1>
          <p className="text-gray-400">
            Paciente: {caseData?.patient?.name} - CI: {formatCI(caseData?.patientId)}
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {error && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {/* Accesos Vasculares */}
            <Card>
              <CardHeader>
                <CardTitle>Accesos Vasculares</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="CVC 1"
                    name="cvc1"
                    value={formData.cvc1}
                    onChange={handleChange}
                    placeholder="Ej: yugular derecha 3 lúmenes"
                  />
                  <Input
                    label="CVC 2"
                    name="cvc2"
                    value={formData.cvc2}
                    onChange={handleChange}
                    placeholder="Ej: subclavia izquierda"
                  />
                  <Input
                    label="CVC 3"
                    name="cvc3"
                    value={formData.cvc3}
                    onChange={handleChange}
                  />
                  <Input
                    label="Línea Arterial 1"
                    name="arterialLine1"
                    value={formData.arterialLine1}
                    onChange={handleChange}
                    placeholder="Ej: radial derecha"
                  />
                  <Input
                    label="Línea Arterial 2"
                    name="arterialLine2"
                    value={formData.arterialLine2}
                    onChange={handleChange}
                  />
                  <Input
                    label="Vía Periférica"
                    name="peripheralIV"
                    value={formData.peripheralIV}
                    onChange={handleChange}
                    placeholder="Ej: 18G mano derecha"
                  />
                </div>

                <div className="mt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="swanGanz"
                      checked={formData.swanGanz}
                      onChange={handleChange}
                      className="w-5 h-5 rounded border-dark-400 bg-dark-600 text-surgical-500 focus:ring-2 focus:ring-surgical-500"
                    />
                    <span className="text-gray-300">Swan-Ganz</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Vía Aérea y Anestesia */}
            <Card>
              <CardHeader>
                <CardTitle>Vía Aérea y Anestesia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tipo de Vía Aérea
                    </label>
                    <select
                      name="airwayType"
                      value={formData.airwayType}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-200 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="IOT">IOT (Intubación Orotraqueal)</option>
                      <option value="TQT">TQT (Traqueostomía)</option>
                      <option value="Máscara Laríngea">Máscara Laríngea</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Laringoscopia (Cormack)
                    </label>
                    <select
                      name="laryngoscopy"
                      value={formData.laryngoscopy}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-200 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="GRADE_I">Grado I</option>
                      <option value="GRADE_II">Grado II</option>
                      <option value="GRADE_III">Grado III</option>
                      <option value="GRADE_IV">Grado IV</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tipo de Anestesia
                    </label>
                    <select
                      name="anesthesiaType"
                      value={formData.anesthesiaType}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-200 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="General">General</option>
                      <option value="Combinada">Combinada (General + Regional)</option>
                      <option value="Regional">Regional</option>
                    </select>
                  </div>

                  <Input
                    label="Premedicación"
                    name="premedication"
                    value={formData.premedication}
                    onChange={handleChange}
                    placeholder="Ej: Midazolam 2mg IV"
                  />
                </div>

                <div className="mt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="tubeSellick"
                      checked={formData.tubeSellick}
                      onChange={handleChange}
                      className="w-5 h-5 rounded border-dark-400 bg-dark-600 text-surgical-500 focus:ring-2 focus:ring-surgical-500"
                    />
                    <span className="text-gray-300">Maniobra de Sellick</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Equipamiento */}
            <Card>
              <CardHeader>
                <CardTitle>Equipamiento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="warmer"
                      checked={formData.warmer}
                      onChange={handleChange}
                      className="w-5 h-5 rounded border-dark-400 bg-dark-600 text-surgical-500 focus:ring-2 focus:ring-surgical-500"
                    />
                    <span className="text-gray-300">Calentador / Level1</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="cellSaverUsed"
                      checked={formData.cellSaverUsed}
                      onChange={handleChange}
                      className="w-5 h-5 rounded border-dark-400 bg-dark-600 text-surgical-500 focus:ring-2 focus:ring-surgical-500"
                    />
                    <span className="text-gray-300">Cell Saver</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="elasticBandages"
                      checked={formData.elasticBandages}
                      onChange={handleChange}
                      className="w-5 h-5 rounded border-dark-400 bg-dark-600 text-surgical-500 focus:ring-2 focus:ring-surgical-500"
                    />
                    <span className="text-gray-300">Vendas Elásticas</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="thermalBlanket"
                      checked={formData.thermalBlanket}
                      onChange={handleChange}
                      className="w-5 h-5 rounded border-dark-400 bg-dark-600 text-surgical-500 focus:ring-2 focus:ring-surgical-500"
                    />
                    <span className="text-gray-300">Manta Térmica</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <Input
                    label="Antibióticos Profilácticos"
                    name="prophylacticATB"
                    value={formData.prophylacticATB}
                    onChange={handleChange}
                    placeholder="Ej: Cefazolina 2g IV"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Puntos de Apoyo / Protección
                    </label>
                    <textarea
                      name="pressurePoints"
                      value={formData.pressurePoints}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-200 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                      placeholder="Descripción de protecciones y puntos de apoyo..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botones */}
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={saving}
              >
                {saving ? 'Guardando...' : (isNew ? 'Crear Registro' : 'Guardar Cambios')}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
