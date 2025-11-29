'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { searchApi } from '@/lib/api';

export default function GlobalSearch({ collapsed = false }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Debounce search
  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchApi.global(query, 'all', 5);
        setResults(data);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd+K or Ctrl+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }

      // Escape to close
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        setResults(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get all results as flat array
  const getAllResults = useCallback(() => {
    if (!results) return [];
    return [
      ...results.patients.map(p => ({ ...p, resultType: 'patient' })),
      ...results.procedures.map(p => ({ ...p, resultType: 'procedure' })),
      ...results.preops.map(p => ({ ...p, resultType: 'preop' })),
    ];
  }, [results]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    const allResults = getAllResults();

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const result = allResults[selectedIndex];
      handleResultClick(result);
    }
  };

  // Handle result click
  const handleResultClick = (result) => {
    setIsOpen(false);
    setQuery('');
    setResults(null);

    switch (result.resultType) {
      case 'patient':
        router.push(`/patients/${result.id}`);
        break;
      case 'procedure':
        router.push(`/procedures/${result.id}`);
        break;
      case 'preop':
        router.push(`/preop/${result.id}`);
        break;
    }
  };

  // Format age from birthDate
  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('es-UY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Search trigger button */}
      <button
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className={`flex items-center gap-2 bg-surgical-500/20 border border-surgical-500 rounded-lg text-gray-300 hover:bg-surgical-500/30 transition-colors ${
          collapsed ? 'p-2 justify-center' : 'px-3 py-2 w-full'
        }`}
        title={collapsed ? 'Buscar (Ctrl+K)' : ''}
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {!collapsed && (
          <>
            <span className="text-sm flex-1 text-left">Buscar...</span>
            <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-dark-600 rounded border border-dark-400">
              <span className="text-xs">Ctrl</span>
              <span>K</span>
            </kbd>
          </>
        )}
      </button>

      {/* Search modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

          {/* Search container */}
          <div className="relative w-full max-w-2xl bg-dark-600 rounded-xl shadow-2xl border border-dark-400 overflow-hidden">
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-dark-400">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar pacientes, procedimientos, evaluaciones..."
                className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 outline-none text-lg"
                autoFocus
              />
              {loading && (
                <div className="w-5 h-5 border-2 border-surgical-500 border-t-transparent rounded-full animate-spin" />
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-200"
              >
                <kbd className="px-2 py-0.5 text-xs bg-dark-500 rounded border border-dark-400">ESC</kbd>
              </button>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {query.length < 2 && (
                <div className="px-4 py-8 text-center text-gray-500">
                  <p>Escribe al menos 2 caracteres para buscar</p>
                  <p className="text-sm mt-2">Busca por CI, nombre, FNR, tipo de procedimiento...</p>
                </div>
              )}

              {query.length >= 2 && !loading && results && results.totalResults === 0 && (
                <div className="px-4 py-8 text-center text-gray-500">
                  <p>No se encontraron resultados para "{query}"</p>
                </div>
              )}

              {results && results.totalResults > 0 && (
                <div className="py-2">
                  {/* Patients */}
                  {results.patients.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-dark-500">
                        Pacientes ({results.patients.length})
                      </div>
                      {results.patients.map((patient, idx) => {
                        const globalIdx = idx;
                        return (
                          <button
                            key={patient.id}
                            onClick={() => handleResultClick({ ...patient, resultType: 'patient' })}
                            className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-dark-500 transition-colors ${
                              selectedIndex === globalIdx ? 'bg-dark-500' : ''
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-surgical-500/20 flex items-center justify-center">
                              <span className="text-surgical-400 font-medium">
                                {patient.name?.charAt(0) || 'P'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-100 truncate">{patient.name}</span>
                                {patient.transplanted && (
                                  <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">Trasplantado</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-gray-400">
                                <span>CI: {patient.id}</span>
                                {patient.sex && <span>{patient.sex === 'M' ? 'Masculino' : patient.sex === 'F' ? 'Femenino' : 'Otro'}</span>}
                                {patient.birthDate && <span>{calculateAge(patient.birthDate)} años</span>}
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {patient._count?.procedures || 0} proc. | {patient._count?.preops || 0} eval.
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Procedures */}
                  {results.procedures.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-dark-500">
                        Procedimientos ({results.procedures.length})
                      </div>
                      {results.procedures.map((proc, idx) => {
                        const globalIdx = results.patients.length + idx;
                        const isTransplant = ['TRASPLANTE_HEPATICO', 'RETRASPLANTE_HEPATICO'].includes(proc.procedureType);
                        return (
                          <button
                            key={proc.id}
                            onClick={() => handleResultClick({ ...proc, resultType: 'procedure' })}
                            className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-dark-500 transition-colors ${
                              selectedIndex === globalIdx ? 'bg-dark-500' : ''
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isTransplant ? 'bg-red-500/20' : 'bg-green-500/20'
                            }`}>
                              <span className={isTransplant ? 'text-2xl' : 'text-xl'}>
                                {isTransplant ? '🫀' : '🏥'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-100 truncate">
                                {formatProcedureType(proc.procedureType)}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-gray-400">
                                <span>{proc.patient?.name}</span>
                                {proc.startAt && <span>{formatDate(proc.startAt)}</span>}
                                {proc.location && <span>{proc.location}</span>}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Preops */}
                  {results.preops.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-dark-500">
                        Evaluaciones Preoperatorias ({results.preops.length})
                      </div>
                      {results.preops.map((preop, idx) => {
                        const globalIdx = results.patients.length + results.procedures.length + idx;
                        return (
                          <button
                            key={preop.id}
                            onClick={() => handleResultClick({ ...preop, resultType: 'preop' })}
                            className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-dark-500 transition-colors ${
                              selectedIndex === globalIdx ? 'bg-dark-500' : ''
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                              <span className="text-xl">🩺</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-100 truncate">
                                Evaluación - {preop.patient?.name}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-gray-400">
                                {preop.evaluationDate && <span>{formatDate(preop.evaluationDate)}</span>}
                                {preop.meld && <span>MELD: {preop.meld}</span>}
                                {preop.child && <span>Child: {preop.child}</span>}
                                {preop.etiology1 && <span>{preop.etiology1}</span>}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-dark-400 bg-dark-500/50">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-dark-600 rounded border border-dark-400">↑</kbd>
                    <kbd className="px-1.5 py-0.5 bg-dark-600 rounded border border-dark-400">↓</kbd>
                    navegar
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-dark-600 rounded border border-dark-400">Enter</kbd>
                    seleccionar
                  </span>
                </div>
                {results && results.totalResults > 0 && (
                  <span>{results.totalResults} resultados</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to format procedure type
function formatProcedureType(type) {
  const typeMap = {
    'TRASPLANTE_HEPATICO': 'Trasplante Hepático',
    'RETRASPLANTE_HEPATICO': 'Retrasplante Hepático',
    'BIOPSIA_HEPATICA': 'Biopsia Hepática',
    'ENDOSCOPIA': 'Endoscopía',
    'PARACENTESIS': 'Paracentesis',
    'COLANGIOGRAFIA': 'Colangiografía',
    'CPRE': 'CPRE',
    'TIPS': 'TIPS',
    'OTRO': 'Otro procedimiento',
  };
  return typeMap[type] || type;
}
