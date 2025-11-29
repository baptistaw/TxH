'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { mortalityApi, casesApi } from '@/lib/api';
import Button from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import AppLayout from '@/components/layout/AppLayout';

export default function MortalityPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id;
  const [transplantCase, setTransplantCase] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mortality, setMortality] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    earlyDeath: false,
    deathDate: '',
    deathCause: '',
    aliveAtDischarge: true,
    aliveAt1Year: null,
    aliveAt3Years: null,
    aliveAt5Years: null,
    lateDeathCause: '',
    readmissionWithin6m: false,
    daysToFirstReadm: '',
    daysToSecondReadm: '',
    readmissionCause: '',
  });

  useEffect(() => {
    loadMortalityData();
  }, [caseId]);

  const loadMortalityData = async () => {
    try {
      setLoading(true);

      // Primero cargar el caso para obtener el patientId
      const caseResponse = await casesApi.get(caseId);
      setTransplantCase(caseResponse.data);
      const patientId = caseResponse.data.patientId;

      // Luego cargar los datos de mortalidad usando el patientId
      const response = await mortalityApi.get(patientId);
      setMortality(response.data);

      // Inicializar formData con los datos existentes
      if (response.data) {
        setFormData({
          earlyDeath: response.data.earlyDeath || false,
          deathDate: response.data.deathDate ? new Date(response.data.deathDate).toISOString().split('T')[0] : '',
          deathCause: response.data.deathCause || '',
          aliveAtDischarge: response.data.aliveAtDischarge ?? true,
          aliveAt1Year: response.data.aliveAt1Year,
          aliveAt3Years: response.data.aliveAt3Years,
          aliveAt5Years: response.data.aliveAt5Years,
          lateDeathCause: response.data.lateDeathCause || '',
          readmissionWithin6m: response.data.readmissionWithin6m || false,
          daysToFirstReadm: response.data.daysToFirstReadm || '',
          daysToSecondReadm: response.data.daysToSecondReadm || '',
          readmissionCause: response.data.readmissionCause || '',
        });
      } else {
        // Si no existe, activar modo edición para crear nuevo
        setIsEditing(true);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        // No existe registro, activar modo edición
        setIsEditing(true);
        setMortality(null);
      } else {
        console.error('Error loading mortality data:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (!transplantCase) {
        alert('Error: No se pudo cargar la información del caso');
        return;
      }

      const patientId = transplantCase.patientId;

      // Preparar datos para envío
      const dataToSend = {
        patientId,
        earlyDeath: formData.earlyDeath,
        deathDate: formData.deathDate ? new Date(formData.deathDate).toISOString() : null,
        deathCause: formData.deathCause || null,
        aliveAtDischarge: formData.aliveAtDischarge,
        aliveAt1Year: formData.aliveAt1Year !== null && formData.aliveAt1Year !== '' ? formData.aliveAt1Year === 'true' : null,
        aliveAt3Years: formData.aliveAt3Years !== null && formData.aliveAt3Years !== '' ? formData.aliveAt3Years === 'true' : null,
        aliveAt5Years: formData.aliveAt5Years !== null && formData.aliveAt5Years !== '' ? formData.aliveAt5Years === 'true' : null,
        lateDeathCause: formData.lateDeathCause || null,
        readmissionWithin6m: formData.readmissionWithin6m,
        daysToFirstReadm: formData.daysToFirstReadm ? parseInt(formData.daysToFirstReadm) : null,
        daysToSecondReadm: formData.daysToSecondReadm ? parseInt(formData.daysToSecondReadm) : null,
        readmissionCause: formData.readmissionCause || null,
      };

      if (mortality) {
        // Actualizar
        await mortalityApi.update(patientId, dataToSend);
      } else {
        // Crear
        await mortalityApi.create(dataToSend);
      }

      setIsEditing(false);
      await loadMortalityData();
    } catch (error) {
      console.error('Error saving mortality data:', error);
      alert('Error al guardar los datos: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-white">Mortalidad y Seguimiento</h1>
          </div>

          <div className="flex gap-2">
            {!isEditing && mortality && (
              <Button onClick={() => setIsEditing(true)} variant="primary">
                Editar
              </Button>
            )}
            {isEditing && (
              <>
                <Button onClick={() => {
                  if (mortality) {
                    setIsEditing(false);
                    loadMortalityData();
                  } else {
                    router.back();
                  }
                }} variant="secondary">
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} variant="primary" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mortalidad Precoz */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Mortalidad Precoz (&lt;30 días post-trasplante)</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="earlyDeath"
                  name="earlyDeath"
                  checked={formData.earlyDeath}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="earlyDeath" className="ml-2 text-sm text-gray-300">
                  Muerte Precoz (dentro de los 30 días post-trasplante)
                </label>
              </div>

              {formData.earlyDeath && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Fecha de Muerte
                    </label>
                    <input
                      type="date"
                      name="deathDate"
                      value={formData.deathDate}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Causa de Muerte
                    </label>
                    <textarea
                      name="deathCause"
                      value={formData.deathCause}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      rows={4}
                      placeholder="Descripción de la causa de muerte..."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Seguimiento */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Seguimiento de Supervivencia</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="aliveAtDischarge"
                  name="aliveAtDischarge"
                  checked={formData.aliveAtDischarge}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="aliveAtDischarge" className="ml-2 text-sm text-gray-300">
                  Vivo al Alta
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Vivo al Año
                </label>
                <select
                  name="aliveAt1Year"
                  value={formData.aliveAt1Year === null ? '' : formData.aliveAt1Year.toString()}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">No evaluado</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Vivo a los 3 Años
                </label>
                <select
                  name="aliveAt3Years"
                  value={formData.aliveAt3Years === null ? '' : formData.aliveAt3Years.toString()}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">No evaluado</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Vivo a los 5 Años
                </label>
                <select
                  name="aliveAt5Years"
                  value={formData.aliveAt5Years === null ? '' : formData.aliveAt5Years.toString()}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="">No evaluado</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>

            {/* Causa de muerte tardía */}
            {(!formData.aliveAtDischarge || formData.aliveAt1Year === 'false' || formData.aliveAt3Years === 'false' || formData.aliveAt5Years === 'false') && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Causa de Muerte Tardía
                </label>
                <textarea
                  name="lateDeathCause"
                  value={formData.lateDeathCause}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  rows={4}
                  placeholder="Descripción de la causa de muerte tardía..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            )}
          </div>

          {/* Reingresos */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Reingresos</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="readmissionWithin6m"
                  name="readmissionWithin6m"
                  checked={formData.readmissionWithin6m}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="readmissionWithin6m" className="ml-2 text-sm text-gray-300">
                  Reingreso dentro de los 6 meses
                </label>
              </div>

              {formData.readmissionWithin6m && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Días hasta 1er Reingreso
                      </label>
                      <input
                        type="number"
                        name="daysToFirstReadm"
                        value={formData.daysToFirstReadm}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder="Días"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Días hasta 2do Reingreso
                      </label>
                      <input
                        type="number"
                        name="daysToSecondReadm"
                        value={formData.daysToSecondReadm}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder="Días"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Causa de Reingreso
                    </label>
                    <textarea
                      name="readmissionCause"
                      value={formData.readmissionCause}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      rows={4}
                      placeholder="Descripción de la causa de reingreso..."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
