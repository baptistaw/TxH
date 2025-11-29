// src/app/cases/[id]/team/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { casesApi, cliniciansApi } from '@/lib/api';
import { formatCI } from '@/lib/utils';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import Button from '@/components/ui/Button';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Spinner, { PageSpinner } from '@/components/ui/Spinner';
import { useAuth } from '@/contexts/AuthContext';

export default function TeamManagementPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'ANESTESIOLOGO']}>
      <TeamManagementContent />
    </ProtectedRoute>
  );
}

function TeamManagementContent() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id;
  const { user } = useAuth();

  const [caseData, setCaseData] = useState(null);
  const [team, setTeam] = useState([]);
  const [clinicians, setClinicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Form state para agregar nuevo miembro
  const [newMember, setNewMember] = useState({
    clinicianId: '',
  });

  // Cargar datos
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [caseResponse, teamResponse, cliniciansResponse] = await Promise.all([
          casesApi.getById(caseId),
          casesApi.getTeam(caseId),
          cliniciansApi.list(),
        ]);

        setCaseData(caseResponse);
        setTeam(teamResponse || []);
        setClinicians(cliniciansResponse || []);
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

  // Agregar miembro al equipo
  const handleAddMember = async (e) => {
    e.preventDefault();

    if (!newMember.clinicianId) {
      alert('Debe seleccionar un clínico');
      return;
    }

    // Buscar el clínico seleccionado para obtener su specialty
    const selectedClinician = clinicians.find(
      (c) => c.id === parseInt(newMember.clinicianId)
    );

    if (!selectedClinician || !selectedClinician.specialty) {
      alert('El clínico seleccionado no tiene una especialidad asignada');
      return;
    }

    // Verificar si el clínico ya está en el equipo
    const alreadyInTeam = team.some(
      (member) => member.clinicianId === parseInt(newMember.clinicianId)
    );

    if (alreadyInTeam) {
      alert('Este clínico ya está en el equipo');
      return;
    }

    // Mapear specialty a role (COORDINADORA -> NURSE_COORD)
    const roleMapping = {
      ANESTESIOLOGO: 'ANESTESIOLOGO',
      CIRUJANO: 'CIRUJANO',
      INTENSIVISTA: 'INTENSIVISTA',
      HEPATOLOGO: 'HEPATOLOGO',
      COORDINADORA: 'NURSE_COORD',
    };

    const role = roleMapping[selectedClinician.specialty];
    if (!role) {
      alert('La especialidad del clínico no es válida para el equipo quirúrgico');
      return;
    }

    setSaving(true);
    try {
      await casesApi.addTeamMember(caseId, {
        clinicianId: parseInt(newMember.clinicianId),
        role: role,
      });

      // Recargar equipo
      const teamResponse = await casesApi.getTeam(caseId);
      setTeam(teamResponse || []);

      // Limpiar formulario
      setNewMember({ clinicianId: '' });
      alert('Miembro agregado exitosamente');
    } catch (err) {
      console.error('Error al agregar miembro:', err);
      alert('Error al agregar miembro: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Eliminar miembro del equipo
  const handleRemoveMember = async (teamAssignmentId, clinicianName) => {
    const confirmDelete = window.confirm(
      `¿Está seguro que desea eliminar a ${clinicianName} del equipo?`
    );

    if (!confirmDelete) return;

    setSaving(true);
    try {
      await casesApi.removeTeamMember(caseId, teamAssignmentId);

      // Recargar equipo
      const teamResponse = await casesApi.getTeam(caseId);
      setTeam(teamResponse || []);
      alert('Miembro eliminado exitosamente');
    } catch (err) {
      console.error('Error al eliminar miembro:', err);
      alert('Error al eliminar miembro: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageSpinner />;
  }

  if (error) {
    return (
      <AppLayout>
        <div className="h-full px-8 py-6">
          <div className="alert alert-error">Error al cargar datos: {error}</div>
          <Button onClick={() => router.back()} className="mt-4">
            Volver
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (!caseData) {
    return (
      <AppLayout>
        <div className="h-full px-8 py-6">
          <div className="alert alert-warning">Caso no encontrado</div>
          <Button onClick={() => router.back()} className="mt-4">
            Volver
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (!canEdit) {
    return (
      <AppLayout>
        <div className="h-full px-8 py-6">
          <div className="alert alert-error">No tiene permisos para editar este equipo</div>
          <Button onClick={() => router.back()} className="mt-4">
            Volver
          </Button>
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

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-100 mb-2">
                Gestionar Equipo Clínico
              </h1>
              <p className="text-gray-400">
                Paciente: {caseData.patient?.name} - CI: {formatCI(caseData.patientId)}
              </p>
            </div>

            <Link href={`/cases/${caseId}`}>
              <Button variant="secondary">Ver Detalle del Caso</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Equipo Actual */}
          <Card>
            <CardHeader>
              <CardTitle>Equipo Actual ({team.length})</CardTitle>
              <CardDescription>
                Miembros asignados a este trasplante
              </CardDescription>
            </CardHeader>
            <CardContent>
              {team.length > 0 ? (
                <div className="space-y-3">
                  {team.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 bg-dark-700 rounded-lg border border-dark-400"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-medical-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {member.clinician?.name
                            ?.split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase() || '??'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-200">
                            {member.clinician?.name || 'Sin nombre'}
                          </p>
                          <p className="text-sm text-gray-400 capitalize">
                            {formatRole(member.role) || 'Sin rol'}
                          </p>
                          {member.clinician?.specialty && (
                            <p className="text-xs text-gray-500">
                              {member.clinician.specialty}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() =>
                          handleRemoveMember(member.id, member.clinician?.name)
                        }
                        disabled={saving}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay miembros en el equipo</p>
                  <p className="text-sm mt-2">
                    Agregue miembros usando el formulario de la derecha
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agregar Nuevo Miembro */}
          <Card>
            <CardHeader>
              <CardTitle>Agregar Miembro</CardTitle>
              <CardDescription>
                Asignar un nuevo clínico al equipo quirúrgico
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddMember} className="space-y-4">
                {/* Seleccionar Clínico */}
                <div>
                  <label className="form-label">
                    Clínico <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newMember.clinicianId}
                    onChange={(e) =>
                      setNewMember({ clinicianId: e.target.value })
                    }
                    className="form-select"
                    style={{ color: '#fff' }}
                    required
                  >
                    <option value="" style={{ backgroundColor: '#1f2937', color: '#9ca3af' }}>Seleccione un clínico...</option>
                    {clinicians.map((clinician) => (
                      <option key={clinician.id} value={clinician.id} style={{ backgroundColor: '#1f2937', color: '#f3f4f6' }}>
                        {clinician.name} - {clinician.specialty}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    El clínico será agregado con el rol correspondiente a su especialidad
                  </p>
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={saving || !newMember.clinicianId}
                    className="flex-1"
                  >
                    {saving ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Agregando...
                      </>
                    ) : (
                      <>
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
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        Agregar al Equipo
                      </>
                    )}
                  </Button>
                </div>
              </form>

              {/* Información */}
              <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-300 mb-2">
                  <strong>Nota:</strong> El rol en el equipo se asigna automáticamente según la especialidad del clínico.
                </p>
                <p className="text-sm text-blue-300">
                  Los anestesiólogos miembros del equipo tendrán permisos para editar este trasplante y sus registros intraoperatorios.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

// Helper para formatear roles
function formatRole(role) {
  const roleMap = {
    ANESTESIOLOGO: 'Anestesiólogo',
    CIRUJANO: 'Cirujano',
    INTENSIVISTA: 'Intensivista',
    HEPATOLOGO: 'Hepatólogo',
    NURSE_COORD: 'Enfermera Coordinadora',
  };
  return roleMap[role] || role;
}
