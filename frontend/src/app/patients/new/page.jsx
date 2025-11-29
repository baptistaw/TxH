'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { patientsApi } from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import { useCatalog } from '@/hooks/useCatalog';

function NewPatientContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar catálogos
  const { items: sexItems, loading: sexLoading } = useCatalog('Sex');
  const { items: providerItems, loading: providerLoading } = useCatalog('Provider');

  const [formData, setFormData] = useState({
    id: '', // CI
    name: '',
    fnr: '',
    birthDate: '',
    sex: '',
    provider: '',
    height: '',
    weight: '',
    bloodGroup: '',
    observations: '',
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validar CI requerido
      if (!formData.id || !formData.name) {
        throw new Error('CI y nombre son campos obligatorios');
      }

      // Preparar payload
      const payload = {
        id: formData.id.trim(),
        ciRaw: formData.id.trim(),
        name: formData.name.trim(),
        fnr: formData.fnr?.trim() || undefined,
        birthDate: formData.birthDate ? new Date(formData.birthDate).toISOString() : undefined,
        sex: formData.sex || undefined,
        provider: formData.provider || undefined,
        height: formData.height ? parseFloat(formData.height) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        bloodGroup: formData.bloodGroup?.trim() || undefined,
        observations: formData.observations?.trim() || undefined,
      };

      const newPatient = await patientsApi.create(payload);

      // Mostrar mensaje de éxito y redirigir
      alert(`Paciente ${newPatient.name} (CI: ${newPatient.id}) creado exitosamente`);
      router.push('/patients');
    } catch (err) {
      console.error('Error creating patient:', err);
      setError(err.message || 'Error al crear el paciente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/patients">
            <Button variant="ghost" size="sm">
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-100">Nuevo Paciente</h1>
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
                label="Cédula de Identidad (CI)"
                type="text"
                value={formData.id}
                onChange={(e) => handleChange('id', e.target.value)}
                placeholder="12345678"
                required
                helperText="Sin puntos ni guiones"
              />

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

        {/* Observaciones */}
        <Card>
          <CardHeader>
            <CardTitle>Observaciones</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notas y Observaciones
              </label>
              <textarea
                value={formData.observations}
                onChange={(e) => handleChange('observations', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                placeholder="Observaciones adicionales sobre el paciente..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Botones de Acción */}
        <div className="flex justify-end gap-3">
          <Link href="/patients">
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
                Guardar Paciente
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewPatient() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="h-full px-8 py-6">
          <NewPatientContent />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
