// src/components/intraop/IntraopGrid.jsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { formatDateTime } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';

/**
 * Calcular PAm automáticamente
 * PAm = (PAS + 2*PAD) / 3
 */
function calculateMAP(sys, dia) {
  if (!sys || !dia) return null;
  return Math.round((sys + 2 * dia) / 3);
}

/**
 * Calcular PAPm automáticamente
 * PAPm = (PAPS + 2*PAPD) / 3
 */
function calculatePAPM(paps, papd) {
  if (!paps || !papd) return null;
  return Math.round((paps + 2 * papd) / 3);
}

/**
 * IntraopGrid - Componente mejorado con secciones expandibles
 */
export default function IntraopGrid({
  phase,
  records = [],
  onAdd,
  onUpdate,
  onDelete,
  onDuplicate,
  loading = false,
}) {
  const [editingId, setEditingId] = useState(null);
  const [newRow, setNewRow] = useState(null);
  const [expandedRecord, setExpandedRecord] = useState(null);
  const [activeSection, setActiveSection] = useState('ventilation');
  const inputRefs = useRef({});

  // Form para fila en edición
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm();

  // Watch campos para cálculos automáticos
  const pas = watch('pas');
  const pad = watch('pad');
  const pam = watch('pam');
  const paps = watch('paps');
  const papd = watch('papd');
  const papm = watch('papm');

  // Auto-calcular PAm y PAPm
  useEffect(() => {
    if (editingId || newRow) {
      // Calcular PAm
      const calculatedMAP = calculateMAP(pas, pad);
      if (calculatedMAP && !pam) {
        setValue('pam', calculatedMAP);
      }

      // Calcular PAPm
      const calculatedPAPM = calculatePAPM(paps, papd);
      if (calculatedPAPM && !papm) {
        setValue('papm', calculatedPAPM);
      }
    }
  }, [pas, pad, pam, paps, papd, papm, editingId, newRow, setValue]);

  // Iniciar edición de una fila
  const startEdit = (record) => {
    setEditingId(record.id);
    setNewRow(null);
    setExpandedRecord(record.id);
    reset({
      timestamp: new Date(record.timestamp).toISOString().slice(0, 16),
      // Ventilación
      ventMode: record.ventMode || '',
      fio2: record.fio2 ? Math.round(record.fio2 * 100) : '',
      tidalVolume: record.tidalVolume || '',
      respRate: record.respRate || '',
      peep: record.peep || '',
      peakPressure: record.peakPressure || '',
      // Hemodinamia básica
      heartRate: record.heartRate || '',
      satO2: record.satO2 || '',
      pas: record.pas || '',
      pad: record.pad || '',
      pam: record.pam || '',
      cvp: record.cvp || '',
      etCO2: record.etCO2 || '',
      temp: record.temp || '',
      // Hemodinamia avanzada
      paps: record.paps || '',
      papd: record.papd || '',
      papm: record.papm || '',
      pcwp: record.pcwp || '',
      cardiacOutput: record.cardiacOutput || '',
      // Monitoreo avanzado
      bis: record.bis || '',
      icp: record.icp || '',
      svO2: record.svO2 || '',
      // Laboratorio - Hematología
      hb: record.hb || '',
      hto: record.hto || '',
      platelets: record.platelets || '',
      // Laboratorio - Coagulación
      pt: record.pt || '',
      inr: record.inr || '',
      fibrinogen: record.fibrinogen || '',
      aptt: record.aptt || '',
      // Laboratorio - Electrolitos
      sodium: record.sodium || '',
      potassium: record.potassium || '',
      ionicCalcium: record.ionicCalcium || '',
      magnesium: record.magnesium || '',
      chloride: record.chloride || '',
      phosphorus: record.phosphorus || '',
      // Laboratorio - Gases arteriales
      pH: record.pH || '',
      paO2: record.paO2 || '',
      paCO2: record.paCO2 || '',
      hco3: record.hco3 || '',
      baseExcess: record.baseExcess || '',
      // Laboratorio - Gases venosos
      pvpH: record.pvpH || '',
      pvO2: record.pvO2 || '',
      pvCO2: record.pvCO2 || '',
      // Laboratorio - Función renal
      creatinine: record.creatinine || '',
      azotemia: record.azotemia || '',
      // Laboratorio - Función hepática
      sgot: record.sgot || '',
      sgpt: record.sgpt || '',
      totalBili: record.totalBili || '',
      directBili: record.directBili || '',
      albumin: record.albumin || '',
      proteins: record.proteins || '',
      // Laboratorio - Metabólicos
      glucose: record.glucose || '',
      lactate: record.lactate || '',
    });
  };

  // Cancelar edición
  const cancelEdit = () => {
    setEditingId(null);
    setNewRow(null);
    setExpandedRecord(null);
    reset();
  };

  // Guardar edición
  const saveEdit = async (data) => {
    try {
      if (newRow) {
        await onAdd(data);
      } else {
        await onUpdate(editingId, data);
      }
      cancelEdit();
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  };

  // Agregar nueva fila
  const handleAddRow = () => {
    setNewRow(true);
    setEditingId(null);
    setExpandedRecord('new');
    reset({
      timestamp: new Date().toISOString().slice(0, 16),
      // Inicializar todos los campos vacíos
      ventMode: '',
      fio2: '',
      tidalVolume: '',
      respRate: '',
      peep: '',
      peakPressure: '',
      heartRate: '',
      satO2: '',
      pas: '',
      pad: '',
      pam: '',
      cvp: '',
      etCO2: '',
      temp: '',
      paps: '',
      papd: '',
      papm: '',
      pcwp: '',
      cardiacOutput: '',
      bis: '',
      icp: '',
      svO2: '',
      hb: '',
      hto: '',
      platelets: '',
      pt: '',
      inr: '',
      fibrinogen: '',
      aptt: '',
      sodium: '',
      potassium: '',
      ionicCalcium: '',
      magnesium: '',
      chloride: '',
      phosphorus: '',
      pH: '',
      paO2: '',
      paCO2: '',
      hco3: '',
      baseExcess: '',
      pvpH: '',
      pvO2: '',
      pvCO2: '',
      creatinine: '',
      azotemia: '',
      sgot: '',
      sgpt: '',
      totalBili: '',
      directBili: '',
      albumin: '',
      proteins: '',
      glucose: '',
      lactate: '',
    });

    // Focus en primer input
    setTimeout(() => {
      const firstInput = inputRefs.current['timestamp'];
      if (firstInput) firstInput.focus();
    }, 0);
  };

  // Duplicar última fila
  const handleDuplicateLastRow = async () => {
    try {
      await onDuplicate();
    } catch (error) {
      console.error('Error al duplicar:', error);
    }
  };

  // Eliminar fila
  const handleDeleteRow = async (id) => {
    if (window.confirm('¿Eliminar este registro?')) {
      try {
        await onDelete(id);
      } catch (error) {
        console.error('Error al eliminar:', error);
      }
    }
  };

  // Toggle expandir detalles
  const toggleExpand = (recordId) => {
    if (editingId || newRow) return; // No expandir si está editando
    setExpandedRecord(expandedRecord === recordId ? null : recordId);
  };

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+N: Nueva fila
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        if (!editingId && !newRow) {
          handleAddRow();
        }
      }

      // Ctrl+D: Duplicar última
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        if (!editingId && !newRow && records.length > 0) {
          handleDuplicateLastRow();
        }
      }

      // Escape: Cancelar edición
      if (e.key === 'Escape') {
        if (editingId || newRow) {
          cancelEdit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingId, newRow, records.length]);

  if (loading && records.length === 0) {
    return (
      <div className="py-8 text-center">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          {records.length} registro{records.length !== 1 ? 's' : ''}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddRow}
            disabled={editingId || newRow}
            title="Ctrl+N"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Fila
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleDuplicateLastRow}
            disabled={editingId || newRow || records.length === 0}
            title="Ctrl+D"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Duplicar Última
          </Button>
        </div>
      </div>

      {/* Tabla expandida - Aprovecha todo el ancho */}
      <div className="overflow-x-auto rounded-lg border border-dark-400">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-dark-700 text-gray-400 text-xs uppercase sticky top-0">
            <tr>
              {/* Hora y Hemodinamia básica */}
              <th className="px-2 py-2 text-left sticky left-0 bg-dark-700 z-10">Hora</th>
              <th className="px-2 py-2 text-center">FC</th>
              <th className="px-2 py-2 text-center">PAS</th>
              <th className="px-2 py-2 text-center">PAD</th>
              <th className="px-2 py-2 text-center">PAm</th>
              <th className="px-2 py-2 text-center">SatO₂</th>
              <th className="px-2 py-2 text-center">PVC</th>
              <th className="px-2 py-2 text-center">Temp</th>
              <th className="px-2 py-2 text-center">EtCO₂</th>

              {/* Ventilación */}
              <th className="px-2 py-2 text-center bg-blue-900 bg-opacity-20">Modo</th>
              <th className="px-2 py-2 text-center bg-blue-900 bg-opacity-20">FiO₂</th>
              <th className="px-2 py-2 text-center bg-blue-900 bg-opacity-20">Vt</th>
              <th className="px-2 py-2 text-center bg-blue-900 bg-opacity-20">FR</th>
              <th className="px-2 py-2 text-center bg-blue-900 bg-opacity-20">PEEP</th>

              {/* Hemodinamia avanzada (Swan-Ganz) */}
              <th className="px-2 py-2 text-center bg-purple-900 bg-opacity-20">PAPs</th>
              <th className="px-2 py-2 text-center bg-purple-900 bg-opacity-20">PAPd</th>
              <th className="px-2 py-2 text-center bg-purple-900 bg-opacity-20">PCP</th>
              <th className="px-2 py-2 text-center bg-purple-900 bg-opacity-20">GC</th>

              {/* Monitoreo */}
              <th className="px-2 py-2 text-center bg-pink-900 bg-opacity-20">BIS</th>

              {/* Laboratorio clave */}
              <th className="px-2 py-2 text-center bg-green-900 bg-opacity-20">Hb</th>
              <th className="px-2 py-2 text-center bg-green-900 bg-opacity-20">Hto</th>
              <th className="px-2 py-2 text-center bg-green-900 bg-opacity-20">K⁺</th>
              <th className="px-2 py-2 text-center bg-green-900 bg-opacity-20">Lac</th>
              <th className="px-2 py-2 text-center bg-green-900 bg-opacity-20">Glic</th>

              <th className="px-2 py-2 text-center sticky right-0 bg-dark-700 z-10">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-400">
            {/* Nueva fila */}
            {newRow && (
              <>
                <tr className="bg-surgical-900 bg-opacity-20">
                  <td colSpan={25} className="px-3 py-2">
                    <RecordForm
                      register={register}
                      inputRefs={inputRefs}
                      activeSection={activeSection}
                      setActiveSection={setActiveSection}
                      onSave={handleSubmit(saveEdit)}
                      onCancel={cancelEdit}
                    />
                  </td>
                </tr>
              </>
            )}

            {/* Filas existentes */}
            {records.map((record) => (
              <RecordRow
                key={record.id}
                record={record}
                isEditing={editingId === record.id}
                isExpanded={expandedRecord === record.id}
                onToggleExpand={toggleExpand}
                onEdit={startEdit}
                onDelete={handleDeleteRow}
                register={register}
                inputRefs={inputRefs}
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                onSave={handleSubmit(saveEdit)}
                onCancel={cancelEdit}
              />
            ))}

            {records.length === 0 && !newRow && (
              <tr>
                <td colSpan={25} className="px-3 py-8 text-center text-gray-500">
                  No hay registros. Haz clic en "Nueva Fila" o presiona <kbd className="px-2 py-1 bg-dark-700 rounded">Ctrl+N</kbd>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="space-y-2">
        <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
          <span><kbd className="px-1 bg-dark-700 rounded">Ctrl+N</kbd> Nueva fila</span>
          <span><kbd className="px-1 bg-dark-700 rounded">Ctrl+D</kbd> Duplicar última</span>
          <span><kbd className="px-1 bg-dark-700 rounded">Esc</kbd> Cancelar</span>
          <span className="text-surgical-400">💡 Scroll horizontal para ver todos los campos</span>
          <span className="text-gray-400">Haz clic en una fila para ver campos adicionales</span>
        </div>

        {/* Código de colores */}
        <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
          <span>Columnas con fondo:</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-900 bg-opacity-20"></span>
            Ventilación
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-purple-900 bg-opacity-20"></span>
            Hemodinamia avanzada
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-pink-900 bg-opacity-20"></span>
            Monitoreo
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-900 bg-opacity-20"></span>
            Laboratorio
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Componente para una fila de registro
 */
function RecordRow({
  record,
  isEditing,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  register,
  inputRefs,
  activeSection,
  setActiveSection,
  onSave,
  onCancel,
}) {
  if (isEditing) {
    return (
      <tr className="bg-surgical-900 bg-opacity-20">
        <td colSpan={25} className="px-3 py-2">
          <RecordForm
            register={register}
            inputRefs={inputRefs}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            onSave={onSave}
            onCancel={onCancel}
          />
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr
        className="hover:bg-dark-700 transition-colors cursor-pointer text-xs"
        onClick={() => onToggleExpand(record.id)}
      >
        {/* Hora y Hemodinamia básica */}
        <td className="px-2 py-2 font-mono sticky left-0 bg-dark-600 hover:bg-dark-700 z-10">{formatDateTime(record.timestamp, 'HH:mm')}</td>
        <td className="px-2 py-2 text-center">{record.heartRate || '-'}</td>
        <td className="px-2 py-2 text-center">{record.pas || '-'}</td>
        <td className="px-2 py-2 text-center">{record.pad || '-'}</td>
        <td className="px-2 py-2 text-center font-medium text-surgical-400">{record.pam || '-'}</td>
        <td className="px-2 py-2 text-center">{record.satO2 ? `${record.satO2}%` : '-'}</td>
        <td className="px-2 py-2 text-center">{record.cvp || '-'}</td>
        <td className="px-2 py-2 text-center">{record.temp ? `${record.temp}°C` : '-'}</td>
        <td className="px-2 py-2 text-center">{record.etCO2 || '-'}</td>

        {/* Ventilación */}
        <td className="px-2 py-2 text-center bg-blue-900 bg-opacity-10">{record.ventMode || '-'}</td>
        <td className="px-2 py-2 text-center bg-blue-900 bg-opacity-10">{record.fio2 ? `${Math.round(record.fio2 * 100)}%` : '-'}</td>
        <td className="px-2 py-2 text-center bg-blue-900 bg-opacity-10">{record.tidalVolume || '-'}</td>
        <td className="px-2 py-2 text-center bg-blue-900 bg-opacity-10">{record.respRate || '-'}</td>
        <td className="px-2 py-2 text-center bg-blue-900 bg-opacity-10">{record.peep || '-'}</td>

        {/* Hemodinamia avanzada */}
        <td className="px-2 py-2 text-center bg-purple-900 bg-opacity-10">{record.paps || '-'}</td>
        <td className="px-2 py-2 text-center bg-purple-900 bg-opacity-10">{record.papd || '-'}</td>
        <td className="px-2 py-2 text-center bg-purple-900 bg-opacity-10">{record.pcwp || '-'}</td>
        <td className="px-2 py-2 text-center bg-purple-900 bg-opacity-10">{record.cardiacOutput || '-'}</td>

        {/* Monitoreo */}
        <td className="px-2 py-2 text-center bg-pink-900 bg-opacity-10">{record.bis || '-'}</td>

        {/* Laboratorio clave */}
        <td className="px-2 py-2 text-center bg-green-900 bg-opacity-10">{record.hb || '-'}</td>
        <td className="px-2 py-2 text-center bg-green-900 bg-opacity-10">{record.hto || '-'}</td>
        <td className="px-2 py-2 text-center bg-green-900 bg-opacity-10">{record.potassium || '-'}</td>
        <td className="px-2 py-2 text-center bg-green-900 bg-opacity-10">{record.lactate || '-'}</td>
        <td className="px-2 py-2 text-center bg-green-900 bg-opacity-10">{record.glucose || '-'}</td>

        <td className="px-2 py-2 text-center sticky right-0 bg-dark-600 hover:bg-dark-700 z-10" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => onEdit(record)}
              className="p-1 text-gray-400 hover:text-surgical-400"
              title="Editar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(record.id)}
              className="p-1 text-gray-400 hover:text-red-400"
              title="Eliminar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button className="p-1 text-gray-400">
              <svg
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={25} className="px-6 py-4 bg-dark-800">
            <RecordDetails record={record} />
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * Formulario completo de edición/creación
 */
function RecordForm({ register, inputRefs, activeSection, setActiveSection, onSave, onCancel }) {
  const sections = [
    { id: 'basic', label: '🩺 Básico', icon: '🩺' },
    { id: 'ventilation', label: '🫁 Ventilación', icon: '🫁' },
    { id: 'hemodynamics', label: '💉 Hemodinamia', icon: '💉' },
    { id: 'monitoring', label: '📊 Monitoreo', icon: '📊' },
    { id: 'lab', label: '🧪 Laboratorio', icon: '🧪' },
  ];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-600 pb-2">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActiveSection(section.id)}
            className={`px-3 py-1.5 text-xs rounded-t transition-colors ${
              activeSection === section.id
                ? 'bg-surgical-900 text-surgical-300 font-medium'
                : 'text-gray-400 hover:text-gray-300 hover:bg-dark-700'
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {/* Contenido por sección */}
      <div className="min-h-[200px]">
        {activeSection === 'basic' && <BasicSection register={register} inputRefs={inputRefs} />}
        {activeSection === 'ventilation' && <VentilationSection register={register} />}
        {activeSection === 'hemodynamics' && <HemodynamicsSection register={register} />}
        {activeSection === 'monitoring' && <MonitoringSection register={register} />}
        {activeSection === 'lab' && <LabSection register={register} />}
      </div>

      {/* Botones de acción */}
      <div className="flex justify-end gap-2 pt-4 border-t border-dark-600">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSave}
          className="px-4 py-2 text-sm bg-surgical-600 hover:bg-surgical-700 text-white rounded-lg"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

/**
 * Sección básica (Hora + hemodinamia esencial)
 */
function BasicSection({ register, inputRefs }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <FormField label="Hora" required>
        <input
          type="datetime-local"
          {...register('timestamp', { required: true })}
          ref={(el) => (inputRefs.current['timestamp'] = el)}
          className="form-input"
        />
      </FormField>

      <FormField label="FC (lpm)">
        <input type="number" {...register('heartRate')} className="form-input" placeholder="60-100" />
      </FormField>

      <FormField label="PAS (mmHg)">
        <input type="number" {...register('pas')} className="form-input" placeholder="90-140" />
      </FormField>

      <FormField label="PAD (mmHg)">
        <input type="number" {...register('pad')} className="form-input" placeholder="60-90" />
      </FormField>

      <FormField label="PAm (mmHg)" tooltip="Se calcula automáticamente">
        <input type="number" {...register('pam')} className="form-input bg-dark-800" placeholder="Auto" />
      </FormField>

      <FormField label="SatO₂ (%)">
        <input type="number" {...register('satO2')} className="form-input" placeholder="95-100" />
      </FormField>

      <FormField label="PVC (cmH₂O)">
        <input type="number" {...register('cvp')} className="form-input" placeholder="5-12" />
      </FormField>

      <FormField label="Temp (°C)">
        <input type="number" step="0.1" {...register('temp')} className="form-input" placeholder="36-37" />
      </FormField>

      <FormField label="EtCO₂ (mmHg)">
        <input type="number" {...register('etCO2')} className="form-input" placeholder="35-45" />
      </FormField>
    </div>
  );
}

/**
 * Sección de ventilación
 */
function VentilationSection({ register }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <FormField label="Modo ventilatorio">
        <select {...register('ventMode')} className="form-input">
          <option value="">Seleccionar...</option>
          <option value="VC">VC (Volumen controlado)</option>
          <option value="PC">PC (Presión controlada)</option>
          <option value="SIMV">SIMV</option>
          <option value="PSV">PSV (Presión soporte)</option>
          <option value="CPAP">CPAP</option>
          <option value="OTRO">Otro</option>
        </select>
      </FormField>

      <FormField label="FiO₂ (%)">
        <input type="number" {...register('fio2')} className="form-input" placeholder="21-100" />
      </FormField>

      <FormField label="Vt (ml)">
        <input type="number" {...register('tidalVolume')} className="form-input" placeholder="400-600" />
      </FormField>

      <FormField label="FR (rpm)">
        <input type="number" {...register('respRate')} className="form-input" placeholder="12-20" />
      </FormField>

      <FormField label="PEEP (cmH₂O)">
        <input type="number" {...register('peep')} className="form-input" placeholder="5-10" />
      </FormField>

      <FormField label="PVA (cmH₂O)">
        <input type="number" {...register('peakPressure')} className="form-input" placeholder="20-30" />
      </FormField>
    </div>
  );
}

/**
 * Sección de hemodinamia avanzada
 */
function HemodynamicsSection({ register }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <FormField label="PAPS (mmHg)">
        <input type="number" {...register('paps')} className="form-input" placeholder="15-30" />
      </FormField>

      <FormField label="PAPD (mmHg)">
        <input type="number" {...register('papd')} className="form-input" placeholder="5-15" />
      </FormField>

      <FormField label="PAPm (mmHg)" tooltip="Se calcula automáticamente">
        <input type="number" {...register('papm')} className="form-input bg-dark-800" placeholder="Auto" />
      </FormField>

      <FormField label="PCP (mmHg)">
        <input type="number" {...register('pcwp')} className="form-input" placeholder="6-12" />
      </FormField>

      <FormField label="GC (L/min)">
        <input type="number" step="0.1" {...register('cardiacOutput')} className="form-input" placeholder="4-8" />
      </FormField>
    </div>
  );
}

/**
 * Sección de monitoreo avanzado
 */
function MonitoringSection({ register }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <FormField label="BIS">
        <input type="number" {...register('bis')} className="form-input" placeholder="40-60" />
      </FormField>

      <FormField label="PIC (mmHg)">
        <input type="number" {...register('icp')} className="form-input" placeholder="0-20" />
      </FormField>

      <FormField label="SvO₂ (%)">
        <input type="number" {...register('svO2')} className="form-input" placeholder="60-80" />
      </FormField>
    </div>
  );
}

/**
 * Sección de laboratorio
 */
function LabSection({ register }) {
  return (
    <div className="space-y-6">
      {/* Hematología */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-3">Hematología</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FormField label="Hb (g/dL)">
            <input type="number" step="0.1" {...register('hb')} className="form-input" placeholder="10-15" />
          </FormField>
          <FormField label="Hto (%)">
            <input type="number" {...register('hto')} className="form-input" placeholder="30-45" />
          </FormField>
          <FormField label="Plaquetas (×10³/µL)">
            <input type="number" {...register('platelets')} className="form-input" placeholder="150-400" />
          </FormField>
        </div>
      </div>

      {/* Coagulación */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-3">Coagulación</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FormField label="TP (seg)">
            <input type="number" step="0.1" {...register('pt')} className="form-input" placeholder="11-13.5" />
          </FormField>
          <FormField label="INR">
            <input type="number" step="0.1" {...register('inr')} className="form-input" placeholder="0.8-1.2" />
          </FormField>
          <FormField label="Fibrinógeno (mg/dL)">
            <input type="number" {...register('fibrinogen')} className="form-input" placeholder="200-400" />
          </FormField>
          <FormField label="APTT (seg)">
            <input type="number" step="0.1" {...register('aptt')} className="form-input" placeholder="25-35" />
          </FormField>
        </div>
      </div>

      {/* Electrolitos */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-3">Electrolitos</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FormField label="Na⁺ (mEq/L)">
            <input type="number" {...register('sodium')} className="form-input" placeholder="135-145" />
          </FormField>
          <FormField label="K⁺ (mEq/L)">
            <input type="number" step="0.1" {...register('potassium')} className="form-input" placeholder="3.5-5.0" />
          </FormField>
          <FormField label="Ca²⁺ (mmol/L)">
            <input type="number" step="0.01" {...register('ionicCalcium')} className="form-input" placeholder="1.1-1.3" />
          </FormField>
          <FormField label="Mg (mEq/L)">
            <input type="number" step="0.1" {...register('magnesium')} className="form-input" placeholder="1.5-2.5" />
          </FormField>
          <FormField label="Cl⁻ (mEq/L)">
            <input type="number" {...register('chloride')} className="form-input" placeholder="95-105" />
          </FormField>
          <FormField label="P (mg/dL)">
            <input type="number" step="0.1" {...register('phosphorus')} className="form-input" placeholder="2.5-4.5" />
          </FormField>
        </div>
      </div>

      {/* Gases arteriales */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-3">Gasometría arterial</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FormField label="pH">
            <input type="number" step="0.01" {...register('pH')} className="form-input" placeholder="7.35-7.45" />
          </FormField>
          <FormField label="PaO₂ (mmHg)">
            <input type="number" {...register('paO2')} className="form-input" placeholder="80-100" />
          </FormField>
          <FormField label="PaCO₂ (mmHg)">
            <input type="number" {...register('paCO2')} className="form-input" placeholder="35-45" />
          </FormField>
          <FormField label="HCO₃⁻ (mEq/L)">
            <input type="number" step="0.1" {...register('hco3')} className="form-input" placeholder="22-26" />
          </FormField>
          <FormField label="Exceso de Base (mEq/L)">
            <input type="number" step="0.1" {...register('baseExcess')} className="form-input" placeholder="-2 a +2" />
          </FormField>
        </div>
      </div>

      {/* Gases venosos */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-3">Gasometría venosa</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <FormField label="pH venoso">
            <input type="number" step="0.01" {...register('pvpH')} className="form-input" placeholder="7.30-7.40" />
          </FormField>
          <FormField label="PvO₂ (mmHg)">
            <input type="number" {...register('pvO2')} className="form-input" placeholder="35-45" />
          </FormField>
          <FormField label="PvCO₂ (mmHg)">
            <input type="number" {...register('pvCO2')} className="form-input" placeholder="40-50" />
          </FormField>
        </div>
      </div>

      {/* Función renal */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-3">Función renal</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FormField label="Creatinina (mg/dL)">
            <input type="number" step="0.1" {...register('creatinine')} className="form-input" placeholder="0.6-1.2" />
          </FormField>
          <FormField label="Urea/BUN (mg/dL)">
            <input type="number" {...register('azotemia')} className="form-input" placeholder="10-50" />
          </FormField>
        </div>
      </div>

      {/* Función hepática */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-3">Función hepática</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FormField label="SGOT/AST (U/L)">
            <input type="number" {...register('sgot')} className="form-input" placeholder="5-40" />
          </FormField>
          <FormField label="SGPT/ALT (U/L)">
            <input type="number" {...register('sgpt')} className="form-input" placeholder="5-40" />
          </FormField>
          <FormField label="Bilirrubina Total (mg/dL)">
            <input type="number" step="0.1" {...register('totalBili')} className="form-input" placeholder="0.3-1.2" />
          </FormField>
          <FormField label="Bilirrubina Directa (mg/dL)">
            <input type="number" step="0.1" {...register('directBili')} className="form-input" placeholder="0.0-0.3" />
          </FormField>
          <FormField label="Albúmina (g/dL)">
            <input type="number" step="0.1" {...register('albumin')} className="form-input" placeholder="3.5-5.0" />
          </FormField>
          <FormField label="Proteínas (g/dL)">
            <input type="number" step="0.1" {...register('proteins')} className="form-input" placeholder="6.0-8.0" />
          </FormField>
        </div>
      </div>

      {/* Metabólicos */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-3">Parámetros metabólicos</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FormField label="Glicemia (mg/dL)">
            <input type="number" {...register('glucose')} className="form-input" placeholder="70-110" />
          </FormField>
          <FormField label="Lactato (mmol/L)">
            <input type="number" step="0.1" {...register('lactate')} className="form-input" placeholder="0.5-2.0" />
          </FormField>
        </div>
      </div>
    </div>
  );
}

/**
 * Detalles de un registro (vista expandida)
 */
function RecordDetails({ record }) {
  const sections = [
    {
      title: '🫁 Ventilación',
      fields: [
        { label: 'Modo', value: record.ventMode },
        { label: 'FiO₂', value: record.fio2 ? `${Math.round(record.fio2 * 100)}%` : null },
        { label: 'Vt', value: record.tidalVolume ? `${record.tidalVolume} ml` : null },
        { label: 'FR', value: record.respRate ? `${record.respRate} rpm` : null },
        { label: 'PEEP', value: record.peep ? `${record.peep} cmH₂O` : null },
        { label: 'PVA', value: record.peakPressure ? `${record.peakPressure} cmH₂O` : null },
      ],
    },
    {
      title: '💉 Hemodinamia avanzada',
      fields: [
        { label: 'PAPS/PAPD', value: record.paps && record.papd ? `${record.paps}/${record.papd} mmHg` : null },
        { label: 'PAPm', value: record.papm ? `${record.papm} mmHg` : null },
        { label: 'PCP', value: record.pcwp ? `${record.pcwp} mmHg` : null },
        { label: 'GC', value: record.cardiacOutput ? `${record.cardiacOutput} L/min` : null },
      ],
    },
    {
      title: '📊 Monitoreo avanzado',
      fields: [
        { label: 'BIS', value: record.bis },
        { label: 'PIC', value: record.icp ? `${record.icp} mmHg` : null },
        { label: 'SvO₂', value: record.svO2 ? `${record.svO2}%` : null },
      ],
    },
    {
      title: '🧪 Laboratorio - Hematología',
      fields: [
        { label: 'Hb', value: record.hb ? `${record.hb} g/dL` : null },
        { label: 'Hto', value: record.hto ? `${record.hto}%` : null },
        { label: 'Plaquetas', value: record.platelets ? `${record.platelets} ×10³/µL` : null },
      ],
    },
    {
      title: '🧪 Laboratorio - Coagulación',
      fields: [
        { label: 'TP', value: record.pt ? `${record.pt} seg` : null },
        { label: 'INR', value: record.inr },
        { label: 'Fibrinógeno', value: record.fibrinogen ? `${record.fibrinogen} mg/dL` : null },
        { label: 'APTT', value: record.aptt ? `${record.aptt} seg` : null },
      ],
    },
    {
      title: '🧪 Laboratorio - Electrolitos',
      fields: [
        { label: 'Na⁺', value: record.sodium ? `${record.sodium} mEq/L` : null },
        { label: 'K⁺', value: record.potassium ? `${record.potassium} mEq/L` : null },
        { label: 'Ca²⁺', value: record.ionicCalcium ? `${record.ionicCalcium} mmol/L` : null },
        { label: 'Mg', value: record.magnesium ? `${record.magnesium} mEq/L` : null },
        { label: 'Cl⁻', value: record.chloride ? `${record.chloride} mEq/L` : null },
        { label: 'P', value: record.phosphorus ? `${record.phosphorus} mg/dL` : null },
      ],
    },
    {
      title: '🧪 Laboratorio - Gases arteriales',
      fields: [
        { label: 'pH', value: record.pH },
        { label: 'PaO₂', value: record.paO2 ? `${record.paO2} mmHg` : null },
        { label: 'PaCO₂', value: record.paCO2 ? `${record.paCO2} mmHg` : null },
        { label: 'HCO₃⁻', value: record.hco3 ? `${record.hco3} mEq/L` : null },
        { label: 'EB', value: record.baseExcess ? `${record.baseExcess} mEq/L` : null },
      ],
    },
    {
      title: '🧪 Laboratorio - Gases venosos',
      fields: [
        { label: 'pHv', value: record.pvpH },
        { label: 'PvO₂', value: record.pvO2 ? `${record.pvO2} mmHg` : null },
        { label: 'PvCO₂', value: record.pvCO2 ? `${record.pvCO2} mmHg` : null },
      ],
    },
    {
      title: '🧪 Laboratorio - Función renal',
      fields: [
        { label: 'Creatinina', value: record.creatinine ? `${record.creatinine} mg/dL` : null },
        { label: 'Urea/BUN', value: record.azotemia ? `${record.azotemia} mg/dL` : null },
      ],
    },
    {
      title: '🧪 Laboratorio - Función hepática',
      fields: [
        { label: 'SGOT/AST', value: record.sgot ? `${record.sgot} U/L` : null },
        { label: 'SGPT/ALT', value: record.sgpt ? `${record.sgpt} U/L` : null },
        { label: 'Bili Total', value: record.totalBili ? `${record.totalBili} mg/dL` : null },
        { label: 'Bili Directa', value: record.directBili ? `${record.directBili} mg/dL` : null },
        { label: 'Albúmina', value: record.albumin ? `${record.albumin} g/dL` : null },
        { label: 'Proteínas', value: record.proteins ? `${record.proteins} g/dL` : null },
      ],
    },
    {
      title: '🧪 Laboratorio - Metabólicos',
      fields: [
        { label: 'Glicemia', value: record.glucose ? `${record.glucose} mg/dL` : null },
        { label: 'Lactato', value: record.lactate ? `${record.lactate} mmol/L` : null },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {sections.map((section) => {
        const hasData = section.fields.some((field) => field.value);
        if (!hasData) return null;

        return (
          <div key={section.title}>
            <h4 className="text-sm font-medium text-gray-300 mb-3">{section.title}</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {section.fields.map(
                (field) =>
                  field.value && (
                    <div key={field.label} className="flex justify-between">
                      <span className="text-gray-400">{field.label}:</span>
                      <span className="text-gray-200">{field.value}</span>
                    </div>
                  )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Campo de formulario reutilizable
 */
function FormField({ label, required, tooltip, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
        {tooltip && <span className="text-gray-500 ml-1" title={tooltip}>ⓘ</span>}
      </label>
      {children}
    </div>
  );
}
