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
 * IntraopGrid - Componente reutilizable para edición inline de registros intraoperatorios
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

  // Watch PAS y PAD para calcular PAm automáticamente
  const sys = watch('sys');
  const dia = watch('dia');
  const map = watch('map');

  // Auto-calcular PAm si está vacío
  useEffect(() => {
    if (editingId || newRow) {
      const calculatedMAP = calculateMAP(sys, dia);
      if (calculatedMAP && !map) {
        setValue('map', calculatedMAP);
      }
    }
  }, [sys, dia, map, editingId, newRow, setValue]);

  // Iniciar edición de una fila
  const startEdit = (record) => {
    setEditingId(record.id);
    setNewRow(null);
    reset({
      timestamp: new Date(record.timestamp).toISOString().slice(0, 16),
      heartRate: record.heartRate || '',
      sys: record.sys || '',
      dia: record.dia || '',
      map: record.map || '',
      cvp: record.cvp || '',
      peep: record.peep || '',
      fio2: record.fio2 || '',
      vt: record.vt || '',
    });
  };

  // Cancelar edición
  const cancelEdit = () => {
    setEditingId(null);
    setNewRow(null);
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
    reset({
      timestamp: new Date().toISOString().slice(0, 16),
      heartRate: '',
      sys: '',
      dia: '',
      map: '',
      cvp: '',
      peep: '',
      fio2: '',
      vt: '',
    });

    // Focus en primer input después de renderizar
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

      {/* Tabla */}
      <div className="overflow-x-auto rounded-lg border border-dark-400">
        <table className="w-full text-sm">
          <thead className="bg-dark-700 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Hora</th>
              <th className="px-3 py-2 text-center">FC</th>
              <th className="px-3 py-2 text-center">PAS</th>
              <th className="px-3 py-2 text-center">PAD</th>
              <th className="px-3 py-2 text-center">PAm</th>
              <th className="px-3 py-2 text-center">PVC</th>
              <th className="px-3 py-2 text-center">PEEP</th>
              <th className="px-3 py-2 text-center">FiO₂</th>
              <th className="px-3 py-2 text-center">Vt</th>
              <th className="px-3 py-2 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-400">
            {/* Nueva fila */}
            {newRow && (
              <tr className="bg-surgical-900 bg-opacity-20">
                <td className="px-3 py-2">
                  <input
                    type="datetime-local"
                    {...register('timestamp', { required: true })}
                    ref={(el) => (inputRefs.current['timestamp'] = el)}
                    className="w-full px-2 py-1 text-xs bg-dark-700 border border-dark-400 rounded focus:ring-1 focus:ring-surgical-500"
                  />
                </td>
                <InlineInput register={register} name="heartRate" inputRefs={inputRefs} />
                <InlineInput register={register} name="sys" inputRefs={inputRefs} />
                <InlineInput register={register} name="dia" inputRefs={inputRefs} />
                <InlineInput register={register} name="map" inputRefs={inputRefs} placeholder="Auto" />
                <InlineInput register={register} name="cvp" inputRefs={inputRefs} />
                <InlineInput register={register} name="peep" inputRefs={inputRefs} />
                <InlineInput register={register} name="fio2" inputRefs={inputRefs} />
                <InlineInput register={register} name="vt" inputRefs={inputRefs} />
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={handleSubmit(saveEdit)}
                      className="p-1 text-green-400 hover:text-green-300"
                      title="Guardar (Ctrl+Enter)"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1 text-red-400 hover:text-red-300"
                      title="Cancelar (Esc)"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Filas existentes */}
            {records.map((record) => (
              <tr key={record.id} className="hover:bg-dark-700 transition-colors">
                {editingId === record.id ? (
                  // Modo edición
                  <>
                    <td className="px-3 py-2">
                      <input
                        type="datetime-local"
                        {...register('timestamp', { required: true })}
                        className="w-full px-2 py-1 text-xs bg-dark-700 border border-dark-400 rounded focus:ring-1 focus:ring-surgical-500"
                      />
                    </td>
                    <InlineInput register={register} name="heartRate" inputRefs={inputRefs} />
                    <InlineInput register={register} name="sys" inputRefs={inputRefs} />
                    <InlineInput register={register} name="dia" inputRefs={inputRefs} />
                    <InlineInput register={register} name="map" inputRefs={inputRefs} placeholder="Auto" />
                    <InlineInput register={register} name="cvp" inputRefs={inputRefs} />
                    <InlineInput register={register} name="peep" inputRefs={inputRefs} />
                    <InlineInput register={register} name="fio2" inputRefs={inputRefs} />
                    <InlineInput register={register} name="vt" inputRefs={inputRefs} />
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={handleSubmit(saveEdit)}
                          className="p-1 text-green-400 hover:text-green-300"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button onClick={cancelEdit} className="p-1 text-red-400 hover:text-red-300">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  // Modo vista
                  <>
                    <td className="px-3 py-2 font-mono text-xs">{formatDateTime(record.timestamp, 'HH:mm')}</td>
                    <td className="px-3 py-2 text-center">{record.heartRate || '-'}</td>
                    <td className="px-3 py-2 text-center">{record.sys || '-'}</td>
                    <td className="px-3 py-2 text-center">{record.dia || '-'}</td>
                    <td className="px-3 py-2 text-center font-medium text-surgical-400">{record.map || '-'}</td>
                    <td className="px-3 py-2 text-center">{record.cvp || '-'}</td>
                    <td className="px-3 py-2 text-center">{record.peep || '-'}</td>
                    <td className="px-3 py-2 text-center">{record.fio2 || '-'}</td>
                    <td className="px-3 py-2 text-center">{record.vt || '-'}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => startEdit(record)}
                          disabled={newRow || editingId}
                          className="p-1 text-gray-400 hover:text-surgical-400 disabled:opacity-30"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteRow(record.id)}
                          disabled={newRow || editingId}
                          className="p-1 text-gray-400 hover:text-red-400 disabled:opacity-30"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}

            {records.length === 0 && !newRow && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
                  No hay registros. Haz clic en "Nueva Fila" o presiona <kbd className="px-2 py-1 bg-dark-700 rounded">Ctrl+N</kbd>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Leyenda de atajos */}
      <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
        <span><kbd className="px-1 bg-dark-700 rounded">Ctrl+N</kbd> Nueva fila</span>
        <span><kbd className="px-1 bg-dark-700 rounded">Ctrl+D</kbd> Duplicar última</span>
        <span><kbd className="px-1 bg-dark-700 rounded">Esc</kbd> Cancelar</span>
        <span className="text-surgical-400">PAm se calcula automáticamente si está vacío</span>
      </div>
    </div>
  );
}

/**
 * Input inline para edición de celda
 */
function InlineInput({ register, name, inputRefs, placeholder }) {
  return (
    <td className="px-3 py-2">
      <input
        type="number"
        {...register(name)}
        ref={(el) => (inputRefs.current[name] = el)}
        placeholder={placeholder}
        className="w-full px-2 py-1 text-xs text-center bg-dark-700 border border-dark-400 rounded focus:ring-1 focus:ring-surgical-500"
      />
    </td>
  );
}
