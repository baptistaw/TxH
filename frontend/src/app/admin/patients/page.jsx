'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi } from '@/lib/api';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';

export default function PatientsManagement() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [patients, setPatients] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [transplantedFilter, setTransplantedFilter] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
      return;
    }

    if (user && user.role === 'ADMIN') {
      loadPatients();
    }
  }, [user, authLoading, router, searchTerm, providerFilter, transplantedFilter]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const params = {
        search: searchTerm,
        provider: providerFilter,
        transplanted: transplantedFilter,
      };

      const data = await adminApi.listPatients(params);
      setPatients(data.data || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error loading patients:', error);
      alert('Error al cargar pacientes');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (patientId) => {
    try {
      const data = await adminApi.getPatientById(patientId);
      setSelectedPatient(data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error loading patient details:', error);
      alert('Error al cargar detalles del paciente');
    }
  };

  if (authLoading || (loading && patients.length === 0)) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Spinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">Gestión de Pacientes</h1>
            <p className="text-gray-400 mt-1">Ver y buscar pacientes del sistema</p>
          </div>
          <Link href="/admin">
            <Button variant="secondary">← Volver al Panel</Button>
          </Link>
        </div>
        {/* Filtros y búsqueda */}
        <Card>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por nombre o CI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  className="w-full md:w-48 px-4 py-2 bg-dark-500 border border-dark-400 text-gray-300 rounded-lg focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                >
                  <option value="">Todos los prestadores</option>
                  <option value="ASSE">ASSE</option>
                  <option value="FEMI">FEMI</option>
                  <option value="CASMU">CASMU</option>
                  <option value="MP">MP</option>
                  <option value="OTRA">OTRA</option>
                </select>
              </div>
              <div>
                <select
                  value={transplantedFilter}
                  onChange={(e) => setTransplantedFilter(e.target.value)}
                  className="w-full md:w-48 px-4 py-2 bg-dark-500 border border-dark-400 text-gray-300 rounded-lg focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                >
                  <option value="">Todos</option>
                  <option value="true">Trasplantados</option>
                  <option value="false">No trasplantados</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen */}
        {pagination && (
          <div className="bg-surgical-500/10 border border-surgical-500/30 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-sm text-surgical-400">
              Mostrando {patients.length} de {pagination.total} pacientes
            </p>
          </div>
        )}

        {/* Tabla de pacientes */}
        <Card>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-dark-400">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      CI
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Prestador
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Trasplantado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Registros
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-400">
                  {patients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-dark-500 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-100">{patient.id}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">{patient.name}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Badge variant="default">
                          {patient.provider || '-'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {patient.transplanted ? (
                          <Badge variant="success">Sí</Badge>
                        ) : (
                          <Badge variant="default">No</Badge>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-400">
                        <div className="space-y-1">
                          <div className="text-gray-300">{patient._count?.cases || 0} casos</div>
                          <div className="text-xs text-gray-500">
                            {patient._count?.procedures || 0} proc. / {patient._count?.preops || 0} preop
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(patient.id)}
                          className="text-surgical-400 hover:text-surgical-300 transition-colors"
                        >
                          Ver detalles
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            </div>

            {patients.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-gray-500">No se encontraron pacientes</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de detalles del paciente */}
      {showDetailModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-dark-600 border border-dark-400 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-dark-600 px-6 py-4 border-b border-dark-400 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-100">
                Detalles del Paciente
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Información del paciente */}
              <div>
                <h4 className="text-md font-semibold text-gray-100 mb-3">Información General</h4>
                <div className="grid grid-cols-2 gap-4 bg-dark-500 p-4 rounded-lg border border-dark-400">
                  <div>
                    <p className="text-sm text-gray-400">CI</p>
                    <p className="text-sm font-medium text-gray-200">{selectedPatient.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Nombre</p>
                    <p className="text-sm font-medium text-gray-200">{selectedPatient.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Prestador</p>
                    <p className="text-sm font-medium text-gray-200">{selectedPatient.provider || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Trasplantado</p>
                    <p className="text-sm font-medium text-gray-200">{selectedPatient.transplanted ? 'Sí' : 'No'}</p>
                  </div>
                </div>
              </div>

              {/* Casos de trasplante */}
              {selectedPatient.cases && selectedPatient.cases.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-100 mb-3">
                    Casos de Trasplante ({selectedPatient.cases.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedPatient.cases.map((c) => (
                      <div key={c.id} className="bg-dark-500 border border-dark-400 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-200">
                              Caso ID: {c.id}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(c.startAt).toLocaleDateString('es-UY')}
                            </p>
                          </div>
                          <Link
                            href={`/cases/${c.id}`}
                            className="text-surgical-400 hover:text-surgical-300 text-sm transition-colors"
                          >
                            Ver caso →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evaluaciones preop */}
              {selectedPatient.preops && selectedPatient.preops.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-100 mb-3">
                    Evaluaciones Preoperatorias ({selectedPatient.preops.length})
                  </h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {selectedPatient.preops.map((preop) => (
                      <div key={preop.id} className="bg-dark-500 border border-dark-400 p-3 rounded-lg text-sm">
                        <p className="font-medium text-gray-200">
                          {new Date(preop.evaluationDate).toLocaleDateString('es-UY')}
                        </p>
                        {preop.etiologies && preop.etiologies.length > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            Etiologías: {preop.etiologies.map(e => e.etiology.name).join(', ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Procedimientos */}
              {selectedPatient.procedures && selectedPatient.procedures.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-100 mb-3">
                    Otros Procedimientos ({selectedPatient.procedures.length})
                  </h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {selectedPatient.procedures.map((proc) => (
                      <div key={proc.id} className="bg-dark-500 border border-dark-400 p-3 rounded-lg text-sm">
                        <p className="font-medium text-gray-200">{proc.procedureType}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(proc.startAt).toLocaleDateString('es-UY')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-dark-600 px-6 py-4 border-t border-dark-400">
              <Button
                onClick={() => setShowDetailModal(false)}
                variant="secondary"
                className="w-full"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
