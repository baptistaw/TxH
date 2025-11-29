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

const PHASE_LABELS = {
  pre_incision: 'Pre-incisión',
  intraoperatorio: 'Intraoperatorio',
  postoperatorio: 'Postoperatorio',
};

export default function ProtocolsManagement() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [protocols, setProtocols] = useState([]);
  const [antibiotics, setAntibiotics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [showProtocolModal, setShowProtocolModal] = useState(false);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [showAntibioticModal, setShowAntibioticModal] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState(null);
  const [editingPhase, setEditingPhase] = useState(null);
  const [editingAntibiotic, setEditingAntibiotic] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(null);

  const [protocolFormData, setProtocolFormData] = useState({
    code: '',
    name: '',
    type: 'hepatico',
    isStandard: false,
    forAllergy: false,
    forColonization: '',
    description: '',
    active: true,
  });

  const [phaseFormData, setPhaseFormData] = useState({
    phase: 'pre_incision',
    order: 0,
    timing: '',
    duration: '',
    description: '',
    condition: '',
  });

  const [antibioticFormData, setAntibioticFormData] = useState({
    antibioticCode: '',
    dose: '',
    frequency: '',
    route: 'IV',
    notes: '',
    order: 0,
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
      return;
    }

    if (user && user.role === 'ADMIN') {
      loadProtocols();
      loadAntibiotics();
    }
  }, [user, authLoading, router]);

  const loadProtocols = async () => {
    try {
      setLoading(true);
      const data = await adminApi.listProtocols();
      setProtocols(data.data || []);
    } catch (error) {
      console.error('Error loading protocols:', error);
      alert('Error al cargar protocolos');
    } finally {
      setLoading(false);
    }
  };

  const loadAntibiotics = async () => {
    try {
      const data = await adminApi.listAntibiotics();
      setAntibiotics(data.data || []);
    } catch (error) {
      console.error('Error loading antibiotics:', error);
    }
  };

  const handleViewProtocol = (protocol) => {
    setSelectedProtocol(protocol);
  };

  const handleCreateProtocol = () => {
    setEditingProtocol(null);
    setProtocolFormData({
      code: '',
      name: '',
      type: 'hepatico',
      isStandard: false,
      forAllergy: false,
      forColonization: '',
      description: '',
      active: true,
    });
    setShowProtocolModal(true);
  };

  const handleEditProtocol = (protocol) => {
    setEditingProtocol(protocol);
    setProtocolFormData(protocol);
    setShowProtocolModal(true);
  };

  const handleSubmitProtocol = async (e) => {
    e.preventDefault();

    try {
      if (editingProtocol) {
        await adminApi.updateProtocol(editingProtocol.id, protocolFormData);
        alert('Protocolo actualizado exitosamente');
      } else {
        await adminApi.createProtocol(protocolFormData);
        alert('Protocolo creado exitosamente');
      }

      setShowProtocolModal(false);
      loadProtocols();
    } catch (error) {
      console.error('Error saving protocol:', error);
      alert(error.message || 'Error al guardar protocolo');
    }
  };

  const handleDeleteProtocol = async (protocolId) => {
    if (!confirm('¿Está seguro de desactivar este protocolo?')) {
      return;
    }

    try {
      await adminApi.deleteProtocol(protocolId);
      alert('Protocolo desactivado exitosamente');
      loadProtocols();
      if (selectedProtocol?.id === protocolId) {
        setSelectedProtocol(null);
      }
    } catch (error) {
      console.error('Error deleting protocol:', error);
      alert(error.message || 'Error al desactivar protocolo');
    }
  };

  // Phase management
  const handleCreatePhase = (protocol) => {
    setSelectedProtocol(protocol);
    setEditingPhase(null);
    setCurrentPhase(null);
    setPhaseFormData({
      phase: 'pre_incision',
      order: protocol.phases.length + 1,
      timing: '',
      duration: '',
      description: '',
      condition: '',
    });
    setShowPhaseModal(true);
  };

  const handleEditPhase = (protocol, phase) => {
    setSelectedProtocol(protocol);
    setEditingPhase(phase);
    setPhaseFormData(phase);
    setShowPhaseModal(true);
  };

  const handleSubmitPhase = async (e) => {
    e.preventDefault();

    try {
      if (editingPhase) {
        await adminApi.updatePhase(selectedProtocol.id, editingPhase.id, phaseFormData);
        alert('Fase actualizada exitosamente');
      } else {
        await adminApi.createPhase(selectedProtocol.id, phaseFormData);
        alert('Fase creada exitosamente');
      }

      setShowPhaseModal(false);
      loadProtocols();

      // Reload selected protocol
      const updatedProtocol = await adminApi.getProtocolById(selectedProtocol.id);
      setSelectedProtocol(updatedProtocol);
    } catch (error) {
      console.error('Error saving phase:', error);
      alert(error.message || 'Error al guardar fase');
    }
  };

  const handleDeletePhase = async (protocol, phase) => {
    if (!confirm('¿Está seguro de eliminar esta fase? Se eliminarán también todos sus antibióticos.')) {
      return;
    }

    try {
      await adminApi.deletePhase(protocol.id, phase.id);
      alert('Fase eliminada exitosamente');

      // Reload selected protocol
      const updatedProtocol = await adminApi.getProtocolById(protocol.id);
      setSelectedProtocol(updatedProtocol);
      loadProtocols();
    } catch (error) {
      console.error('Error deleting phase:', error);
      alert(error.message || 'Error al eliminar fase');
    }
  };

  // Antibiotic management
  const handleCreateAntibiotic = (protocol, phase) => {
    setSelectedProtocol(protocol);
    setCurrentPhase(phase);
    setEditingAntibiotic(null);
    setAntibioticFormData({
      antibioticCode: '',
      dose: '',
      frequency: '',
      route: 'IV',
      notes: '',
      order: phase.antibiotics.length + 1,
    });
    setShowAntibioticModal(true);
  };

  const handleEditAntibiotic = (protocol, phase, antibiotic) => {
    setSelectedProtocol(protocol);
    setCurrentPhase(phase);
    setEditingAntibiotic(antibiotic);
    setAntibioticFormData(antibiotic);
    setShowAntibioticModal(true);
  };

  const handleSubmitAntibiotic = async (e) => {
    e.preventDefault();

    try {
      if (editingAntibiotic) {
        await adminApi.updatePhaseAntibiotic(
          selectedProtocol.id,
          currentPhase.id,
          editingAntibiotic.id,
          antibioticFormData
        );
        alert('Antibiótico actualizado exitosamente');
      } else {
        await adminApi.createPhaseAntibiotic(
          selectedProtocol.id,
          currentPhase.id,
          antibioticFormData
        );
        alert('Antibiótico agregado exitosamente');
      }

      setShowAntibioticModal(false);

      // Reload selected protocol
      const updatedProtocol = await adminApi.getProtocolById(selectedProtocol.id);
      setSelectedProtocol(updatedProtocol);
      loadProtocols();
    } catch (error) {
      console.error('Error saving antibiotic:', error);
      alert(error.message || 'Error al guardar antibiótico');
    }
  };

  const handleDeleteAntibiotic = async (protocol, phase, antibiotic) => {
    if (!confirm('¿Está seguro de eliminar este antibiótico?')) {
      return;
    }

    try {
      await adminApi.deletePhaseAntibiotic(protocol.id, phase.id, antibiotic.id);
      alert('Antibiótico eliminado exitosamente');

      // Reload selected protocol
      const updatedProtocol = await adminApi.getProtocolById(protocol.id);
      setSelectedProtocol(updatedProtocol);
      loadProtocols();
    } catch (error) {
      console.error('Error deleting antibiotic:', error);
      alert(error.message || 'Error al eliminar antibiótico');
    }
  };

  if (authLoading || (loading && protocols.length === 0)) {
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
            <h1 className="text-3xl font-bold text-gray-100">Protocolos de Antibióticos</h1>
            <p className="text-gray-400 mt-1">Gestión de protocolos de profilaxis antibiótica</p>
          </div>
          <Link href="/admin">
            <Button variant="secondary">← Volver al Panel</Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de protocolos */}
          <div className="lg:col-span-1">
            <Card>
              <div className="p-4 border-b border-dark-400">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-100">Protocolos</h2>
                  <Button onClick={handleCreateProtocol} size="sm">
                    + Crear
                  </Button>
                </div>
              </div>

              <div className="divide-y divide-dark-400 max-h-[calc(100vh-300px)] overflow-y-auto">
                {protocols.map((protocol) => (
                  <div
                    key={protocol.id}
                    onClick={() => handleViewProtocol(protocol)}
                    className={`p-4 cursor-pointer hover:bg-dark-500 transition-colors ${
                      selectedProtocol?.id === protocol.id ? 'bg-surgical-500/10' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-100">{protocol.name}</h3>
                        <p className="text-xs text-gray-400 mt-1">{protocol.code}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={protocol.isStandard ? 'success' : 'default'}>
                            {protocol.type}
                          </Badge>
                          {protocol.isStandard && (
                            <span className="text-xs text-green-400">★ Estándar</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {protocols.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No hay protocolos creados
                </div>
              )}
            </Card>
          </div>

          {/* Detalle del protocolo seleccionado */}
          <div className="lg:col-span-2">
            {selectedProtocol ? (
              <Card>
                {/* Protocol header */}
                <div className="p-6 border-b border-dark-400">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-100">{selectedProtocol.name}</h2>
                      <p className="text-sm text-gray-400 mt-1">{selectedProtocol.code}</p>
                      {selectedProtocol.description && (
                        <p className="text-sm text-gray-300 mt-3">{selectedProtocol.description}</p>
                      )}

                      <div className="flex flex-wrap gap-2 mt-4">
                        <Badge variant="info">
                          {selectedProtocol.type}
                        </Badge>
                        {selectedProtocol.isStandard && (
                          <Badge variant="success">
                            Estándar
                          </Badge>
                        )}
                        {selectedProtocol.forAllergy && (
                          <Badge variant="warning">
                            Para alergia
                          </Badge>
                        )}
                        {selectedProtocol.forColonization && (
                          <Badge variant="danger">
                            {selectedProtocol.forColonization}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditProtocol(selectedProtocol)}
                        className="px-3 py-1 text-surgical-400 hover:bg-surgical-500/10 rounded-lg text-sm transition-colors"
                      >
                        Editar
                      </button>
                      {selectedProtocol.active && (
                        <button
                          onClick={() => handleDeleteProtocol(selectedProtocol.id)}
                          className="px-3 py-1 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
                        >
                          Desactivar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Phases */}
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-100">
                      Fases del Protocolo
                    </h3>
                    <Button
                      onClick={() => handleCreatePhase(selectedProtocol)}
                      size="sm"
                    >
                      + Agregar Fase
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {selectedProtocol.phases && selectedProtocol.phases.length > 0 ? (
                      selectedProtocol.phases.map((phase) => (
                        <div key={phase.id} className="border border-dark-400 rounded-lg p-4 bg-dark-500/30">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-md font-semibold text-gray-100">
                                  {PHASE_LABELS[phase.phase] || phase.phase}
                                </h4>
                                <span className="text-xs text-gray-400">Orden: {phase.order}</span>
                              </div>
                              {phase.timing && (
                                <p className="text-sm text-gray-300 mt-1">⏱ {phase.timing}</p>
                              )}
                              {phase.duration && (
                                <p className="text-sm text-gray-300 mt-1">⌛ {phase.duration}</p>
                              )}
                              {phase.condition && (
                                <p className="text-sm text-yellow-300 mt-1 bg-yellow-500/10 border border-yellow-500/30 p-2 rounded">
                                  ⚠ Condición: {phase.condition}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditPhase(selectedProtocol, phase)}
                                className="text-surgical-400 hover:text-surgical-300 text-sm transition-colors"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeletePhase(selectedProtocol, phase)}
                                className="text-red-400 hover:text-red-300 text-sm transition-colors"
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>

                          {/* Antibiotics in phase */}
                          <div className="mt-3 bg-dark-600 rounded-lg p-3 border border-dark-400">
                            <div className="flex justify-between items-center mb-2">
                              <h5 className="text-sm font-semibold text-gray-300">Antibióticos</h5>
                              <button
                                onClick={() => handleCreateAntibiotic(selectedProtocol, phase)}
                                className="text-xs text-surgical-400 hover:text-surgical-300 transition-colors"
                              >
                                + Agregar
                              </button>
                            </div>

                            {phase.antibiotics && phase.antibiotics.length > 0 ? (
                              <div className="space-y-2">
                                {phase.antibiotics.map((atb) => (
                                  <div key={atb.id} className="bg-dark-500 p-3 rounded border border-dark-400">
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-100">
                                          {atb.antibioticCode}
                                        </p>
                                        <p className="text-xs text-gray-300 mt-1">
                                          {atb.dose} {atb.route} {atb.frequency && `- ${atb.frequency}`}
                                        </p>
                                        {atb.notes && (
                                          <p className="text-xs text-gray-400 mt-1 italic">{atb.notes}</p>
                                        )}
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleEditAntibiotic(selectedProtocol, phase, atb)}
                                          className="text-surgical-400 hover:text-surgical-300 text-xs transition-colors"
                                        >
                                          Editar
                                        </button>
                                        <button
                                          onClick={() => handleDeleteAntibiotic(selectedProtocol, phase, atb)}
                                          className="text-red-400 hover:text-red-300 text-xs transition-colors"
                                        >
                                          Eliminar
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 text-center py-2">
                                No hay antibióticos en esta fase
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No hay fases definidas para este protocolo
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-gray-500">Seleccione un protocolo para ver sus detalles</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Create/Edit Protocol */}
      {showProtocolModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-dark-600 border border-dark-400 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-dark-600 px-6 py-4 border-b border-dark-400">
              <h3 className="text-lg font-semibold text-gray-100">
                {editingProtocol ? 'Editar Protocolo' : 'Crear Protocolo'}
              </h3>
            </div>

            <form onSubmit={handleSubmitProtocol} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Código *</label>
                  <Input
                    type="text"
                    required
                    value={protocolFormData.code}
                    onChange={(e) => setProtocolFormData({ ...protocolFormData, code: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tipo *</label>
                  <select
                    required
                    value={protocolFormData.type}
                    onChange={(e) => setProtocolFormData({ ...protocolFormData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-500 border border-dark-400 text-gray-300 rounded-lg focus:ring-2 focus:ring-surgical-500"
                  >
                    <option value="hepatico">Hepático</option>
                    <option value="hepatorrenal">Hepatorrenal</option>
                    <option value="especial">Especial</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre *</label>
                <Input
                  type="text"
                  required
                  value={protocolFormData.name}
                  onChange={(e) => setProtocolFormData({ ...protocolFormData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Descripción</label>
                <textarea
                  value={protocolFormData.description}
                  onChange={(e) => setProtocolFormData({ ...protocolFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-dark-500 border border-dark-400 text-gray-300 rounded-lg focus:ring-2 focus:ring-surgical-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Colonización (si aplica)
                </label>
                <Input
                  type="text"
                  value={protocolFormData.forColonization}
                  onChange={(e) => setProtocolFormData({ ...protocolFormData, forColonization: e.target.value })}
                  placeholder="Ej: SAMR, XDR"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isStandard"
                    checked={protocolFormData.isStandard}
                    onChange={(e) => setProtocolFormData({ ...protocolFormData, isStandard: e.target.checked })}
                    className="h-4 w-4 text-surgical-600 focus:ring-surgical-500 border-dark-400 rounded bg-dark-500"
                  />
                  <label htmlFor="isStandard" className="ml-2 block text-sm text-gray-300">
                    Protocolo estándar
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="forAllergy"
                    checked={protocolFormData.forAllergy}
                    onChange={(e) => setProtocolFormData({ ...protocolFormData, forAllergy: e.target.checked })}
                    className="h-4 w-4 text-surgical-600 focus:ring-surgical-500 border-dark-400 rounded bg-dark-500"
                  />
                  <label htmlFor="forAllergy" className="ml-2 block text-sm text-gray-300">
                    Para pacientes con alergia
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    checked={protocolFormData.active}
                    onChange={(e) => setProtocolFormData({ ...protocolFormData, active: e.target.checked })}
                    className="h-4 w-4 text-surgical-600 focus:ring-surgical-500 border-dark-400 rounded bg-dark-500"
                  />
                  <label htmlFor="active" className="ml-2 block text-sm text-gray-300">
                    Activo
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowProtocolModal(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingProtocol ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create/Edit Phase */}
      {showPhaseModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-dark-600 border border-dark-400 rounded-lg shadow-2xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-dark-400">
              <h3 className="text-lg font-semibold text-gray-100">
                {editingPhase ? 'Editar Fase' : 'Crear Fase'}
              </h3>
            </div>

            <form onSubmit={handleSubmitPhase} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Fase *</label>
                  <select
                    required
                    value={phaseFormData.phase}
                    onChange={(e) => setPhaseFormData({ ...phaseFormData, phase: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-500 border border-dark-400 text-gray-300 rounded-lg focus:ring-2 focus:ring-surgical-500"
                  >
                    <option value="pre_incision">Pre-incisión</option>
                    <option value="intraoperatorio">Intraoperatorio</option>
                    <option value="postoperatorio">Postoperatorio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Orden *</label>
                  <Input
                    type="number"
                    required
                    value={phaseFormData.order}
                    onChange={(e) => setPhaseFormData({ ...phaseFormData, order: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Momento (timing)</label>
                <Input
                  type="text"
                  value={phaseFormData.timing}
                  onChange={(e) => setPhaseFormData({ ...phaseFormData, timing: e.target.value })}
                  placeholder="Ej: 30-60 min antes de incisión"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Duración</label>
                <Input
                  type="text"
                  value={phaseFormData.duration}
                  onChange={(e) => setPhaseFormData({ ...phaseFormData, duration: e.target.value })}
                  placeholder="Ej: Durante toda la cirugía, 24 horas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Condición especial</label>
                <Input
                  type="text"
                  value={phaseFormData.condition}
                  onChange={(e) => setPhaseFormData({ ...phaseFormData, condition: e.target.value })}
                  placeholder="Ej: Si cirugía se prolonga > 10 horas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Descripción</label>
                <textarea
                  value={phaseFormData.description}
                  onChange={(e) => setPhaseFormData({ ...phaseFormData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-dark-500 border border-dark-400 text-gray-300 rounded-lg focus:ring-2 focus:ring-surgical-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowPhaseModal(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingPhase ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create/Edit Antibiotic */}
      {showAntibioticModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-dark-600 border border-dark-400 rounded-lg shadow-2xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-dark-400">
              <h3 className="text-lg font-semibold text-gray-100">
                {editingAntibiotic ? 'Editar Antibiótico' : 'Agregar Antibiótico'}
              </h3>
            </div>

            <form onSubmit={handleSubmitAntibiotic} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Antibiótico *</label>
                <select
                  required
                  value={antibioticFormData.antibioticCode}
                  onChange={(e) => setAntibioticFormData({ ...antibioticFormData, antibioticCode: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-500 border border-dark-400 text-gray-300 rounded-lg focus:ring-2 focus:ring-surgical-500"
                >
                  <option value="">Seleccione...</option>
                  {antibiotics.map((atb) => (
                    <option key={atb.code} value={atb.code}>
                      {atb.code} - {atb.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Dosis *</label>
                  <Input
                    type="text"
                    required
                    value={antibioticFormData.dose}
                    onChange={(e) => setAntibioticFormData({ ...antibioticFormData, dose: e.target.value })}
                    placeholder="Ej: 4.5 g"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Vía *</label>
                  <select
                    required
                    value={antibioticFormData.route}
                    onChange={(e) => setAntibioticFormData({ ...antibioticFormData, route: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-500 border border-dark-400 text-gray-300 rounded-lg focus:ring-2 focus:ring-surgical-500"
                  >
                    <option value="IV">IV</option>
                    <option value="IM">IM</option>
                    <option value="VO">VO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Frecuencia</label>
                <Input
                  type="text"
                  value={antibioticFormData.frequency}
                  onChange={(e) => setAntibioticFormData({ ...antibioticFormData, frequency: e.target.value })}
                  placeholder="Ej: c/8h, dosis única, BIC"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Orden</label>
                <Input
                  type="number"
                  value={antibioticFormData.order}
                  onChange={(e) => setAntibioticFormData({ ...antibioticFormData, order: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Notas</label>
                <textarea
                  value={antibioticFormData.notes}
                  onChange={(e) => setAntibioticFormData({ ...antibioticFormData, notes: e.target.value })}
                  rows={2}
                  placeholder="Notas adicionales"
                  className="w-full px-3 py-2 bg-dark-500 border border-dark-400 text-gray-300 rounded-lg focus:ring-2 focus:ring-surgical-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAntibioticModal(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingAntibiotic ? 'Actualizar' : 'Agregar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
