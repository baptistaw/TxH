'use client';

/**
 * Modal de Exportación SPSS
 *
 * Permite al usuario seleccionar uno o múltiples perfiles de exportación y descargar
 * datos en formato compatible con SPSS, con opción de incluir sintaxis
 * y diccionario de datos.
 */

import { useState, useEffect } from 'react';
import { exportsApi } from '@/lib/api';
import Button from '@/components/ui/Button';

// Descripciones de perfiles en español
const PROFILE_DESCRIPTIONS = {
  demographic: 'Datos demográficos: edad, sexo, peso, talla, etc.',
  comorbidities: 'Comorbilidades: hipertensión, diabetes, cardiopatía, etc.',
  laboratory: 'Valores de laboratorio: hemoglobina, creatinina, bilirrubina, etc.',
  surgical: 'Datos quirúrgicos: tiempos de isquemia, duración, procedimiento, etc.',
  fluids: 'Balance de fluidos: cristaloides, coloides, sangrado, diuresis, etc.',
  outcomes: 'Resultados: complicaciones, días en CTI, mortalidad, etc.',
  complete: 'Todas las variables disponibles en un solo archivo.',
};

export default function SPSSExportModal({
  isOpen,
  onClose,
  caseId = null, // null = exportar todos los casos de la organización (string CUID)
  caseIds = [], // Lista específica de casos (array de string CUIDs)
}) {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfiles, setSelectedProfiles] = useState(['complete']);
  const [loading, setLoading] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [error, setError] = useState(null);
  const [downloadType, setDownloadType] = useState('csv'); // 'csv', 'bundle'
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });

  // Cargar perfiles disponibles
  useEffect(() => {
    if (isOpen) {
      loadProfiles();
      // Reset state when opening
      setSelectedProfiles(['complete']);
      setError(null);
      setExportProgress({ current: 0, total: 0 });
    }
  }, [isOpen]);

  const loadProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const response = await exportsApi.getSPSSProfiles();
      setProfiles(response.profiles || []);
    } catch (err) {
      console.error('Error loading profiles:', err);
      setError('Error al cargar perfiles de exportación');
    } finally {
      setLoadingProfiles(false);
    }
  };

  const toggleProfile = (profileId) => {
    setSelectedProfiles((prev) => {
      if (prev.includes(profileId)) {
        // Don't allow deselecting all
        if (prev.length === 1) return prev;
        return prev.filter((p) => p !== profileId);
      } else {
        return [...prev, profileId];
      }
    });
  };

  const selectAllProfiles = () => {
    const allProfileIds = profiles.map((p) => p.id);
    setSelectedProfiles(allProfileIds);
  };

  const selectOnlyComplete = () => {
    setSelectedProfiles(['complete']);
  };

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    try {
      const exportCaseIds = caseId ? [caseId] : caseIds.length > 0 ? caseIds : undefined;

      if (selectedProfiles.length === 1) {
        // Single profile export
        const profile = selectedProfiles[0];
        if (downloadType === 'bundle') {
          await exportsApi.downloadSPSSBundle({
            caseIds: exportCaseIds,
            profile,
          });
        } else {
          await exportsApi.downloadSPSS({
            caseIds: exportCaseIds,
            profile,
          });
        }
      } else {
        // Multiple profiles - download each one
        setExportProgress({ current: 0, total: selectedProfiles.length });

        for (let i = 0; i < selectedProfiles.length; i++) {
          const profile = selectedProfiles[i];
          setExportProgress({ current: i + 1, total: selectedProfiles.length });

          if (downloadType === 'bundle') {
            await exportsApi.downloadSPSSBundle({
              caseIds: exportCaseIds,
              profile,
            });
          } else {
            await exportsApi.downloadSPSS({
              caseIds: exportCaseIds,
              profile,
            });
          }

          // Small delay between downloads to avoid browser blocking
          if (i < selectedProfiles.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }

      onClose();
    } catch (err) {
      console.error('Error exporting:', err);
      setError(err.message || 'Error al exportar datos');
    } finally {
      setLoading(false);
      setExportProgress({ current: 0, total: 0 });
    }
  };

  const handleDownloadSyntax = async () => {
    try {
      // Download syntax for first selected profile (or all if multiple)
      for (const profile of selectedProfiles) {
        await exportsApi.downloadSPSSSyntax(profile);
        if (selectedProfiles.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
    } catch (err) {
      console.error('Error downloading syntax:', err);
      setError('Error al descargar sintaxis SPSS');
    }
  };

  const handleDownloadDictionary = async () => {
    try {
      await exportsApi.downloadDataDictionary();
    } catch (err) {
      console.error('Error downloading dictionary:', err);
      setError('Error al descargar diccionario de datos');
    }
  };

  if (!isOpen) return null;

  const targetDescription = caseId
    ? 'este caso'
    : caseIds.length > 0
      ? `${caseIds.length} casos seleccionados`
      : 'todos los casos de la organización';

  const totalVariables = selectedProfiles.reduce((sum, pId) => {
    const profile = profiles.find((p) => p.id === pId);
    return sum + (profile?.variableCount || 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/70 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg transform overflow-hidden rounded-xl bg-dark-700 shadow-xl transition-all">
          {/* Header */}
          <div className="border-b border-dark-500 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-100">
                Exportar para SPSS
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Exportando: {targetDescription}
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Error */}
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Selección de perfiles */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  Perfiles de exportación
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllProfiles}
                    className="text-xs text-surgical-400 hover:text-surgical-300 transition-colors"
                  >
                    Todos
                  </button>
                  <span className="text-dark-400">|</span>
                  <button
                    type="button"
                    onClick={selectOnlyComplete}
                    className="text-xs text-surgical-400 hover:text-surgical-300 transition-colors"
                  >
                    Solo completo
                  </button>
                </div>
              </div>

              {selectedProfiles.length > 1 && (
                <p className="text-xs text-amber-400 mb-2">
                  {selectedProfiles.length} perfiles seleccionados - se descargarán {selectedProfiles.length} archivos
                </p>
              )}

              {loadingProfiles ? (
                <div className="text-gray-400 text-sm">Cargando perfiles...</div>
              ) : (
                <div className="space-y-2">
                  {profiles.map((profile) => {
                    const isSelected = selectedProfiles.includes(profile.id);
                    return (
                      <label
                        key={profile.id}
                        className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-surgical-900/50 border border-surgical-500'
                            : 'bg-dark-600 border border-dark-500 hover:border-dark-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleProfile(profile.id)}
                          className="mt-1 w-4 h-4 rounded text-surgical-500 bg-dark-600 border-dark-400 focus:ring-surgical-500 focus:ring-offset-dark-700"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-200">
                              {profile.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({profile.variableCount} variables)
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mt-0.5">
                            {PROFILE_DESCRIPTIONS[profile.id] || profile.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {selectedProfiles.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Total: {totalVariables} variables en {selectedProfiles.length} archivo(s)
                </p>
              )}
            </div>

            {/* Tipo de descarga */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Formato de descarga
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                    downloadType === 'csv'
                      ? 'bg-surgical-900/50 border border-surgical-500'
                      : 'bg-dark-600 border border-dark-500 hover:border-dark-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="downloadType"
                    value="csv"
                    checked={downloadType === 'csv'}
                    onChange={(e) => setDownloadType(e.target.value)}
                    className="sr-only"
                  />
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-gray-200">Solo CSV</span>
                </label>
                <label
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                    downloadType === 'bundle'
                      ? 'bg-surgical-900/50 border border-surgical-500'
                      : 'bg-dark-600 border border-dark-500 hover:border-dark-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="downloadType"
                    value="bundle"
                    checked={downloadType === 'bundle'}
                    onChange={(e) => setDownloadType(e.target.value)}
                    className="sr-only"
                  />
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="text-gray-200">Bundle ZIP</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {downloadType === 'bundle'
                  ? 'Incluye: CSV + Sintaxis SPSS + Diccionario de datos'
                  : 'Solo archivo CSV con los datos seleccionados'}
              </p>
            </div>

            {/* Acciones adicionales */}
            <div className="flex gap-2 pt-2 border-t border-dark-500">
              <button
                onClick={handleDownloadSyntax}
                className="flex-1 text-sm text-surgical-400 hover:text-surgical-300 py-2 transition-colors"
              >
                Descargar sintaxis SPSS
              </button>
              <span className="text-dark-500">|</span>
              <button
                onClick={handleDownloadDictionary}
                className="flex-1 text-sm text-surgical-400 hover:text-surgical-300 py-2 transition-colors"
              >
                Descargar diccionario
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-dark-500 px-6 py-4 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleExport}
              disabled={loading || loadingProfiles || selectedProfiles.length === 0}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {exportProgress.total > 1
                    ? `Exportando ${exportProgress.current}/${exportProgress.total}...`
                    : 'Exportando...'}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar {selectedProfiles.length > 1 ? `(${selectedProfiles.length})` : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
