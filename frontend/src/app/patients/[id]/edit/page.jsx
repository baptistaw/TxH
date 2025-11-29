// src/app/patients/[id]/edit/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { patientsApi } from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import { useCatalog } from '@/hooks/useCatalog';
import Spinner from '@/components/ui/Spinner';

export default function EditPatientPage() {
  return (
    <ProtectedRoute requiredRoles={['ADMIN', 'ANESTESIOLOGO']}>
      <EditPatientContent />
    </ProtectedRoute>
  );
}

function EditPatientContent() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Cargar catálogos
  const { items: sexItems, loading: sexLoading } = useCatalog('Sex');
  const { items: providerItems, loading: providerLoading } = useCatalog('Provider');

  const [formData, setFormData] = useState({
    name: '',
    fnr: '',
    birthDate: '',
    sex: '',
    provider: '',
    height: '',
    weight: '',
    bloodGroup: '',
    phone: '',
    email: '',
    notes: '',
    transplanted: false,
    inList: false,
    meld: '',
    bloodType: '',
    admissionDate: '',
  });

  // Cargar datos del paciente
  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setLoading(true);
        const patient = await patientsApi.getById(patientId);

        // Convertir fechas a formato yyyy-MM-dd para inputs de tipo date
        const birthDate = patient.birthDate ? patient.birthDate.split('T')[0] : '';
        const admissionDate = patient.admissionDate ? patient.admissionDate.split('T')[0] : '';

        setFormData({
          name: patient.name || '',
          fnr: patient.fnr || '',
          birthDate,
          sex: patient.sex || '',
          provider: patient.provider || '',
          height: patient.height || '',
          weight: patient.weight || '',
          bloodGroup: patient.bloodGroup || '',
          phone: patient.phone || '',
          email: patient.email || '',
          notes: patient.notes || '',
          transplanted: patient.transplanted || false,
          inList: patient.inList || false,
          meld: patient.meld || '',
          bloodType: patient.bloodType || '',
          admissionDate,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [patientId]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Preparar payload
      const payload = {
        name: formData.name.trim(),
        fnr: formData.fnr?.trim() || undefined,
        birthDate: formData.birthDate ? new Date(formData.birthDate).toISOString() : undefined,
        sex: formData.sex || undefined,
        provider: formData.provider || undefined,
        height: formData.height ? parseFloat(formData.height) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        bloodGroup: formData.bloodGroup?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
        transplanted: formData.transplanted,
        inList: formData.inList,
        meld: formData.meld ? parseInt(formData.meld) : undefined,
        bloodType: formData.bloodType?.trim() || undefined,
        admissionDate: formData.admissionDate ? new Date(formData.admissionDate).toISOString() : undefined,
      };

      await patientsApi.update(patientId, payload);

      // Mostrar mensaje de éxito y redirigir
      alert(`Paciente actualizado exitosamente`);
      router.push(`/patients/${patientId}`);
    } catch (err) {
      console.error('Error updating patient:', err);
      setError(err.message || 'Error al actualizar el paciente');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="space-y-6 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/patients/${patientId}`}>
                <Button variant="ghost" size="sm">
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Volver
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-gray-100">Editar Paciente</h1>
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
              <CardHeader>
                <CardTitle>Datos Básicos</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nombre Completo"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Nombre y Apellidos"
                    required
                  />

                  <Input
                    label="FNR (Ficha Nacional de Registro)"
                    type="text"
                    value={formData.fnr}
                    onChange={(e) => handleChange('fnr', e.target.value)}
                    placeholder="FNR123456"
                  />

                  <Input
                    label="Fecha de Nacimiento"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => handleChange('birthDate', e.target.value)}
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Sexo
                    </label>
                    <select
                      value={formData.sex}
                      onChange={(e) => handleChange('sex', e.target.value)}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                      disabled={sexLoading}
                    >
                      <option value="">Seleccionar...</option>
                      {sexItems.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Prestador de Salud
                    </label>
                    <select
                      value={formData.provider}
                      onChange={(e) => handleChange('provider', e.target.value)}
                      className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                      disabled={providerLoading}
                    >
                      <option value="">Seleccionar...</option>
                      {providerItems.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="Teléfono"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+598 99 123 456"
                  />

                  <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="paciente@ejemplo.com"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Datos Físicos */}
            <Card>
              <CardHeader>
                <CardTitle>Datos Físicos</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Altura (cm)"
                    type="number"
                    step="0.1"
                    value={formData.height}
                    onChange={(e) => handleChange('height', e.target.value)}
                    placeholder="170"
                  />

                  <Input
                    label="Peso (kg)"
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => handleChange('weight', e.target.value)}
                    placeholder="70"
                  />

                  <Input
                    label="Grupo Sanguíneo"
                    type="text"
                    value={formData.bloodGroup}
                    onChange={(e) => handleChange('bloodGroup', e.target.value)}
                    placeholder="A+"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Datos de Trasplante */}
            <Card>
              <CardHeader>
                <CardTitle>Datos de Trasplante</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.transplanted}
                        onChange={(e) => handleChange('transplanted', e.target.checked)}
                        className="w-4 h-4 text-surgical-500 bg-dark-600 border-dark-400 rounded focus:ring-surgical-500 focus:ring-2"
                      />
                      <span className="text-sm font-medium text-gray-300">Trasplantado</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.inList}
                        onChange={(e) => handleChange('inList', e.target.checked)}
                        className="w-4 h-4 text-surgical-500 bg-dark-600 border-dark-400 rounded focus:ring-surgical-500 focus:ring-2"
                      />
                      <span className="text-sm font-medium text-gray-300">En Lista de Espera</span>
                    </label>
                  </div>

                  <Input
                    label="MELD Score"
                    type="number"
                    value={formData.meld}
                    onChange={(e) => handleChange('meld', e.target.value)}
                    placeholder="15"
                  />

                  <Input
                    label="Tipo de Sangre"
                    type="text"
                    value={formData.bloodType}
                    onChange={(e) => handleChange('bloodType', e.target.value)}
                    placeholder="A+"
                  />

                  <Input
                    label="Fecha de Admisión a Lista"
                    type="date"
                    value={formData.admissionDate}
                    onChange={(e) => handleChange('admissionDate', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notas */}
            <Card>
              <CardHeader>
                <CardTitle>Notas Clínicas</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notas y Observaciones
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                    placeholder="Notas clínicas y observaciones sobre el paciente..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Botones de Acción */}
            <div className="flex justify-end gap-3">
              <Link href={`/patients/${patientId}`}>
                <Button type="button" variant="secondary">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
