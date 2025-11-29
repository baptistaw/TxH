'use client';

import { useState, useEffect, useRef } from 'react';
import { patientsApi } from '@/lib/api';

/**
 * Componente de búsqueda de pacientes con autocompletado
 * Permite buscar por CI o nombre
 */
export default function PatientSearch({
  selectedPatientId,
  onSelect,
  required = false,
  disabled = false
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const wrapperRef = useRef(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [wrapperRef]);

  // Cargar paciente seleccionado inicialmente
  useEffect(() => {
    if (selectedPatientId && !selectedPatient) {
      loadSelectedPatient(selectedPatientId);
    }
  }, [selectedPatientId]);

  const loadSelectedPatient = async (id) => {
    try {
      const patient = await patientsApi.getById(id);
      setSelectedPatient(patient);
      setSearchTerm(`${patient.id} - ${patient.name}`);
    } catch (error) {
      console.error('Error loading patient:', error);
    }
  };

  // Buscar pacientes con debounce
  useEffect(() => {
    // No buscar si ya hay un paciente seleccionado
    if (selectedPatient) {
      return;
    }

    if (searchTerm.length < 2) {
      setPatients([]);
      return;
    }

    const timer = setTimeout(() => {
      searchPatients(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedPatient]);

  const searchPatients = async (query) => {
    try {
      setLoading(true);
      const result = await patientsApi.list({ q: query, limit: 50 });
      setPatients(result.data || []);
      setShowDropdown(true);
    } catch (error) {
      console.error('Error searching patients:', error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setSearchTerm(`${patient.id} - ${patient.name}`);
    setShowDropdown(false);
    onSelect(patient.id, patient);
  };

  const handleClear = () => {
    setSelectedPatient(null);
    setSearchTerm('');
    setPatients([]);
    onSelect('', null);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!e.target.value) {
              handleClear();
            }
          }}
          onFocus={() => {
            // Solo mostrar dropdown si hay pacientes y NO hay uno seleccionado
            if (patients.length > 0 && !selectedPatient) {
              setShowDropdown(true);
            }
          }}
          placeholder="Buscar por CI o nombre del paciente..."
          className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500 focus:border-transparent pr-20"
          required={required}
          disabled={disabled}
        />

        {/* Indicador de carga */}
        {loading && (
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-surgical-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Botón limpiar */}
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 px-2 py-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {showDropdown && patients.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-dark-600 border border-dark-400 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {patients.map((patient) => (
            <button
              key={patient.id}
              type="button"
              onClick={() => handleSelectPatient(patient)}
              className="w-full px-4 py-3 text-left hover:bg-dark-500 transition-colors border-b border-dark-400 last:border-b-0"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-100">{patient.name}</div>
                  <div className="text-sm text-gray-400 mt-1">
                    CI: {patient.id}
                    {patient.fnr && ` • FNR: ${patient.fnr}`}
                  </div>
                  {patient.birthDate && (
                    <div className="text-xs text-gray-500 mt-1">
                      Nacimiento: {new Date(patient.birthDate).toLocaleDateString('es-UY')}
                    </div>
                  )}
                </div>
                {patient._count?.cases > 0 && (
                  <div className="ml-3 px-2 py-1 bg-surgical-500/20 text-surgical-400 text-xs rounded">
                    {patient._count.cases} {patient._count.cases === 1 ? 'caso' : 'casos'}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Mensaje cuando no hay resultados */}
      {showDropdown && !loading && !selectedPatient && searchTerm.length >= 2 && patients.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-dark-600 border border-dark-400 rounded-lg shadow-lg p-4 text-center text-gray-400">
          No se encontraron pacientes que coincidan con "{searchTerm}"
        </div>
      )}
    </div>
  );
}
