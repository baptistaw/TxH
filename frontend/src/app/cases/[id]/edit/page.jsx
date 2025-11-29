// src/app/cases/[id]/edit/page.jsx
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

export default function EditCasePage() {
  return (
    <ProtectedRoute>
      <EditCaseContent />
    </ProtectedRoute>
  );
}

function EditCaseContent() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [caseData, setCaseData] = useState(null);
  const [team, setTeam] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    startAt: '',
    endAt: '',
    asa: '',
    isRetransplant: false,
    isHepatoRenal: false,
    optimalDonor: false,
    provenance: '',
    coldIschemiaTime: '',
    warmIschemiaTime: '',
    icuTransferDate: '',
    transplantDate: '',
  });

  // Cargar datos del caso
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const caseResponse = await casesApi.getById(caseId);
        setCaseData(caseResponse);

        // Cargar equipo para verificar permisos
        try {
          const teamResponse = await casesApi.getTeam(caseId);
          setTeam(teamResponse || []);
        } catch (err) {
          console.warn('No se pudo cargar equipo:', err);
        }

        // Convertir fechas a formato datetime-local
        const formatDateTimeLocal = (dateStr) => {
          if (!dateStr) return '';
          const date = new Date(dateStr);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        // Inicializar formulario con datos existentes
        setFormData({
          startAt: formatDateTimeLocal(caseResponse.startAt),
          endAt: formatDateTimeLocal(caseResponse.endAt),
          asa: caseResponse.asa || '',
          isRetransplant: caseResponse.isRetransplant || false,
          isHepatoRenal: caseResponse.isHepatoRenal || false,
          optimalDonor: caseResponse.optimalDonor || false,
          provenance: caseResponse.provenance || '',
          coldIschemiaTime: caseResponse.coldIschemiaTime || '',
          warmIschemiaTime: caseResponse.warmIschemiaTime || '',
          icuTransferDate: formatDateTimeLocal(caseResponse.icuTransferDate),
          transplantDate: formatDateTimeLocal(caseResponse.transplantDate),
        });
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

  // Manejar cambios en el formulario
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
      alert('No tienes permisos para editar este trasplante');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Preparar datos para enviar
      const updatePayload = {
        startAt: formData.startAt ? new Date(formData.startAt).toISOString() : null,
        endAt: formData.endAt ? new Date(formData.endAt).toISOString() : null,
        asa: formData.asa || null,
        isRetransplant: formData.isRetransplant,
        isHepatoRenal: formData.isHepatoRenal,
        optimalDonor: formData.optimalDonor,
        provenance: formData.provenance || null,
        coldIschemiaTime: formData.coldIschemiaTime ? parseInt(formData.coldIschemiaTime) : null,
        warmIschemiaTime: formData.warmIschemiaTime ? parseInt(formData.warmIschemiaTime) : null,
        icuTransferDate: formData.icuTransferDate ? new Date(formData.icuTransferDate).toISOString() : null,
        transplantDate: formData.transplantDate ? new Date(formData.transplantDate).toISOString() : null,
      };

      await casesApi.update(caseId, updatePayload);
      alert('Trasplante actualizado exitosamente');
      router.push(`/cases/${caseId}`);
    } catch (err) {
      console.error('Error al actualizar trasplante:', err);
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
            <p className="text-gray-300">No tienes permisos para editar este trasplante</p>
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
            Editar Trasplante
          </h1>
          <p className="text-gray-400">
            Paciente: {caseData?.patient?.name} - CI: {formatCI(caseData?.patientId)}
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Datos del Trasplante</CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Fecha/Hora Inicio */}
                <Input
                  label="Fecha/Hora Inicio"
                  type="datetime-local"
                  name="startAt"
                  value={formData.startAt}
                  onChange={handleChange}
                  required
                />

                {/* Fecha/Hora Fin */}
                <Input
                  label="Fecha/Hora Fin"
                  type="datetime-local"
                  name="endAt"
                  value={formData.endAt}
                  onChange={handleChange}
                />

                {/* ASA */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Clasificación ASA
                  </label>
                  <select
                    name="asa"
                    value={formData.asa}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-200 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="I">ASA I</option>
                    <option value="II">ASA II</option>
                    <option value="III">ASA III</option>
                    <option value="IV">ASA IV</option>
                    <option value="V">ASA V</option>
                    <option value="VI">ASA VI</option>
                  </select>
                </div>

                {/* Procedencia */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Procedencia
                  </label>
                  <select
                    name="provenance"
                    value={formData.provenance}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-200 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
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

                {/* Tiempo Isquemia Fría */}
                <Input
                  label="Tiempo Isquemia Fría (minutos)"
                  type="number"
                  name="coldIschemiaTime"
                  value={formData.coldIschemiaTime}
                  onChange={handleChange}
                  min="0"
                />

                {/* Tiempo Isquemia Caliente */}
                <Input
                  label="Tiempo Isquemia Caliente (minutos)"
                  type="number"
                  name="warmIschemiaTime"
                  value={formData.warmIschemiaTime}
                  onChange={handleChange}
                  min="0"
                />

                {/* Fecha Traslado CTI */}
                <Input
                  label="Fecha/Hora Traslado a CTI"
                  type="datetime-local"
                  name="icuTransferDate"
                  value={formData.icuTransferDate}
                  onChange={handleChange}
                />

                {/* Fecha Trasplante */}
                <Input
                  label="Fecha del Trasplante"
                  type="datetime-local"
                  name="transplantDate"
                  value={formData.transplantDate}
                  onChange={handleChange}
                />
              </div>

              {/* Checkboxes */}
              <div className="mt-6 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isRetransplant"
                    checked={formData.isRetransplant}
                    onChange={handleChange}
                    className="w-5 h-5 rounded border-dark-400 bg-dark-600 text-surgical-500 focus:ring-2 focus:ring-surgical-500"
                  />
                  <span className="text-gray-300">Retrasplante</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isHepatoRenal"
                    checked={formData.isHepatoRenal}
                    onChange={handleChange}
                    className="w-5 h-5 rounded border-dark-400 bg-dark-600 text-surgical-500 focus:ring-2 focus:ring-surgical-500"
                  />
                  <span className="text-gray-300">Trasplante Hepato-Renal</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="optimalDonor"
                    checked={formData.optimalDonor}
                    onChange={handleChange}
                    className="w-5 h-5 rounded border-dark-400 bg-dark-600 text-surgical-500 focus:ring-2 focus:ring-surgical-500"
                  />
                  <span className="text-gray-300">Donante Óptimo</span>
                </label>
              </div>

              {/* Botones */}
              <div className="flex gap-3 mt-8">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.back()}
                  disabled={saving}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </AppLayout>
  );
}
