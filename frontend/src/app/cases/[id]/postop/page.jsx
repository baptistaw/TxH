'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { postopApi } from '@/lib/api';
import Button from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import AppLayout from '@/components/layout/AppLayout';

export default function PostOpPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [postop, setPostop] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    evaluationDate: '',
    extubatedInOR: false,
    mechVentHours: '',
    mechVentDays: '',
    reintubation24h: false,
    reoperation: false,
    reoperationCause: '',
    primaryGraftFailure: false,
    acuteRenalFailure: false,
    pulmonaryEdema: false,
    neurotoxicity: false,
    rejection: false,
    apacheInitial: '',
    biliaryComplications: false,
    vascularComplications: false,
    surgicalBleeding: false,
    otherComplications: '',
    icuDays: '',
    wardDays: '',
    dischargeDate: '',
  });

  useEffect(() => {
    loadPostOpData();
  }, [caseId]);

  const loadPostOpData = async () => {
    try {
      setLoading(true);
      const response = await postopApi.get(caseId);
      setPostop(response.data);

      // Inicializar formData con los datos existentes
      if (response.data) {
        setFormData({
          evaluationDate: response.data.evaluationDate ? new Date(response.data.evaluationDate).toISOString().split('T')[0] : '',
          extubatedInOR: response.data.extubatedInOR || false,
          mechVentHours: response.data.mechVentHours || '',
          mechVentDays: response.data.mechVentDays || '',
          reintubation24h: response.data.reintubation24h || false,
          reoperation: response.data.reoperation || false,
          reoperationCause: response.data.reoperationCause || '',
          primaryGraftFailure: response.data.primaryGraftFailure || false,
          acuteRenalFailure: response.data.acuteRenalFailure || false,
          pulmonaryEdema: response.data.pulmonaryEdema || false,
          neurotoxicity: response.data.neurotoxicity || false,
          rejection: response.data.rejection || false,
          apacheInitial: response.data.apacheInitial || '',
          biliaryComplications: response.data.biliaryComplications || false,
          vascularComplications: response.data.vascularComplications || false,
          surgicalBleeding: response.data.surgicalBleeding || false,
          otherComplications: response.data.otherComplications || '',
          icuDays: response.data.icuDays || '',
          wardDays: response.data.wardDays || '',
          dischargeDate: response.data.dischargeDate ? new Date(response.data.dischargeDate).toISOString().split('T')[0] : '',
        });
      } else {
        // Si no existe, activar modo edición para crear nuevo
        setIsEditing(true);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        // No existe registro postop, activar modo edición
        setIsEditing(true);
        setPostop(null);
      } else {
        console.error('Error loading postop data:', error);
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
      // Preparar datos para envío
      const dataToSend = {
        caseId,
        evaluationDate: formData.evaluationDate ? new Date(formData.evaluationDate).toISOString() : new Date().toISOString(),
        extubatedInOR: formData.extubatedInOR,
        mechVentHours: formData.mechVentHours ? parseInt(formData.mechVentHours) : null,
        mechVentDays: formData.mechVentDays ? parseInt(formData.mechVentDays) : null,
        reintubation24h: formData.reintubation24h,
        reoperation: formData.reoperation,
        reoperationCause: formData.reoperationCause || null,
        primaryGraftFailure: formData.primaryGraftFailure,
        acuteRenalFailure: formData.acuteRenalFailure,
        pulmonaryEdema: formData.pulmonaryEdema,
        neurotoxicity: formData.neurotoxicity,
        rejection: formData.rejection,
        apacheInitial: formData.apacheInitial ? parseInt(formData.apacheInitial) : null,
        biliaryComplications: formData.biliaryComplications,
        vascularComplications: formData.vascularComplications,
        surgicalBleeding: formData.surgicalBleeding,
        otherComplications: formData.otherComplications || null,
        icuDays: formData.icuDays ? parseInt(formData.icuDays) : null,
        wardDays: formData.wardDays ? parseInt(formData.wardDays) : null,
        dischargeDate: formData.dischargeDate ? new Date(formData.dischargeDate).toISOString() : null,
      };

      if (postop) {
        // Actualizar
        await postopApi.update(caseId, dataToSend);
      } else {
        // Crear
        await postopApi.create(dataToSend);
      }

      setIsEditing(false);
      await loadPostOpData();
    } catch (error) {
      console.error('Error saving postop data:', error);
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
            <h1 className="text-2xl font-bold text-white">Resultado Postoperatorio</h1>
          </div>

          <div className="flex gap-2">
            {!isEditing && postop && (
              <Button onClick={() => setIsEditing(true)} variant="primary">
                Editar
              </Button>
            )}
            {isEditing && (
              <>
                <Button onClick={() => {
                  if (postop) {
                    setIsEditing(false);
                    loadPostOpData();
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
          {/* Fecha de evaluación */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Información General</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Fecha de Evaluación
                </label>
                <input
                  type="date"
                  name="evaluationDate"
                  value={formData.evaluationDate}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  APACHE II Inicial
                </label>
                <input
                  type="number"
                  name="apacheInitial"
                  value={formData.apacheInitial}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Score APACHE II"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Extubación */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Extubación y Ventilación Mecánica</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="extubatedInOR"
                  name="extubatedInOR"
                  checked={formData.extubatedInOR}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="extubatedInOR" className="ml-2 text-sm text-gray-300">
                  Extubado en Block Quirúrgico
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Horas de ARM
                  </label>
                  <input
                    type="number"
                    name="mechVentHours"
                    value={formData.mechVentHours}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Horas"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Días de ARM
                  </label>
                  <input
                    type="number"
                    name="mechVentDays"
                    value={formData.mechVentDays}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Días"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="reintubation24h"
                  name="reintubation24h"
                  checked={formData.reintubation24h}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="reintubation24h" className="ml-2 text-sm text-gray-300">
                  Falla de Extubación en 24hs
                </label>
              </div>
            </div>
          </div>

          {/* Reoperación */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Reoperación</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="reoperation"
                  name="reoperation"
                  checked={formData.reoperation}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="reoperation" className="ml-2 text-sm text-gray-300">
                  Requirió Reoperación
                </label>
              </div>

              {formData.reoperation && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Causa de Reoperación
                  </label>
                  <textarea
                    name="reoperationCause"
                    value={formData.reoperationCause}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Complicaciones Mayores */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Complicaciones Mayores</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="primaryGraftFailure"
                  name="primaryGraftFailure"
                  checked={formData.primaryGraftFailure}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="primaryGraftFailure" className="ml-2 text-sm text-gray-300">
                  Falla Primaria del Injerto
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="acuteRenalFailure"
                  name="acuteRenalFailure"
                  checked={formData.acuteRenalFailure}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="acuteRenalFailure" className="ml-2 text-sm text-gray-300">
                  Insuficiencia Renal Aguda
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="pulmonaryEdema"
                  name="pulmonaryEdema"
                  checked={formData.pulmonaryEdema}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="pulmonaryEdema" className="ml-2 text-sm text-gray-300">
                  Edema Pulmonar Agudo
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="neurotoxicity"
                  name="neurotoxicity"
                  checked={formData.neurotoxicity}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="neurotoxicity" className="ml-2 text-sm text-gray-300">
                  Neurotoxicidad
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rejection"
                  name="rejection"
                  checked={formData.rejection}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="rejection" className="ml-2 text-sm text-gray-300">
                  Rechazo
                </label>
              </div>
            </div>
          </div>

          {/* Complicaciones Específicas */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Complicaciones Específicas</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="biliaryComplications"
                    name="biliaryComplications"
                    checked={formData.biliaryComplications}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="biliaryComplications" className="ml-2 text-sm text-gray-300">
                    Complicaciones Biliares
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="vascularComplications"
                    name="vascularComplications"
                    checked={formData.vascularComplications}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="vascularComplications" className="ml-2 text-sm text-gray-300">
                    Complicaciones Vasculares
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="surgicalBleeding"
                    name="surgicalBleeding"
                    checked={formData.surgicalBleeding}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="surgicalBleeding" className="ml-2 text-sm text-gray-300">
                    Sangrado Quirúrgico
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Otras Complicaciones
                </label>
                <textarea
                  name="otherComplications"
                  value={formData.otherComplications}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  rows={4}
                  placeholder="Descripción de otras complicaciones..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Estancia */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Estancia Hospitalaria</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Días en CTI
                </label>
                <input
                  type="number"
                  name="icuDays"
                  value={formData.icuDays}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Días"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Días en Internación en Sala
                </label>
                <input
                  type="number"
                  name="wardDays"
                  value={formData.wardDays}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Días"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Fecha de Alta del Trasplante
                </label>
                <input
                  type="date"
                  name="dischargeDate"
                  value={formData.dischargeDate}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
