'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';

export default function ResearchExportPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // State
  const [options, setOptions] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const initialLoadDone = useRef(false);

  // Filter state
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    year: '',
    dataSources: [],
    includeRetransplants: true,
    includeHepatoRenal: true,
  });

  // Export options state
  const [exportOptions, setExportOptions] = useState({
    tables: ['patients', 'cases', 'preop', 'preop_labs', 'intraop', 'fluids_blood', 'drugs', 'lines_monitoring', 'postop', 'mortality', 'team'],
    anonymize: false,
    includeDataDictionary: true,
  });

  // Load preview with current filters
  const loadPreview = useCallback(async (currentFilters) => {
    try {
      setLoadingPreview(true);
      const queryParams = new URLSearchParams();
      if (currentFilters.fromDate) queryParams.set('fromDate', currentFilters.fromDate);
      if (currentFilters.toDate) queryParams.set('toDate', currentFilters.toDate);
      if (currentFilters.year) queryParams.set('year', currentFilters.year);
      if (currentFilters.dataSources.length > 0) queryParams.set('dataSources', currentFilters.dataSources.join(','));
      queryParams.set('includeRetransplants', currentFilters.includeRetransplants);
      queryParams.set('includeHepatoRenal', currentFilters.includeHepatoRenal);

      const data = await adminApi.getResearchExportPreview(queryParams.toString());
      setPreview(data);
    } catch (err) {
      console.error('Error loading preview:', err);
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  // Auth check and initial load
  useEffect(() => {
    if (authLoading) return;

    if (!user || user.role !== 'ADMIN') {
      router.push('/');
      return;
    }

    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      loadInitialData();
    }
  }, [user, authLoading, router]);

  // Load initial data
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getResearchExportOptions();
      setOptions(data);
      await loadPreview(filters);
    } catch (err) {
      console.error('Error loading options:', err);
      setError('Error al cargar las opciones de exportación');
    } finally {
      setLoading(false);
    }
  };

  // Update preview when filters change (after initial load)
  useEffect(() => {
    if (!options || !initialLoadDone.current) return;

    const debounce = setTimeout(() => {
      loadPreview(filters);
    }, 500);
    return () => clearTimeout(debounce);
  }, [filters, options, loadPreview]);

  // Handle export
  const handleExport = async () => {
    try {
      setExporting(true);
      setError(null);

      await adminApi.generateResearchExport({
        filters,
        options: exportOptions,
      });

    } catch (err) {
      console.error('Error exporting:', err);
      setError('Error al generar la exportación. Intente nuevamente.');
    } finally {
      setExporting(false);
    }
  };

  // Handle download dictionary
  const handleDownloadDictionary = async () => {
    try {
      await adminApi.downloadResearchDictionary();
    } catch (err) {
      console.error('Error downloading dictionary:', err);
      setError('Error al descargar el diccionario de datos');
    }
  };

  // Toggle table selection
  const toggleTable = (tableId) => {
    setExportOptions(prev => ({
      ...prev,
      tables: prev.tables.includes(tableId)
        ? prev.tables.filter(t => t !== tableId)
        : [...prev.tables, tableId],
    }));
  };

  // Select all/none tables
  const selectAllTables = () => {
    setExportOptions(prev => ({
      ...prev,
      tables: options?.tables?.map(t => t.id) || [],
    }));
  };

  const selectNoTables = () => {
    setExportOptions(prev => ({
      ...prev,
      tables: [],
    }));
  };

  // Toggle data source
  const toggleDataSource = (source) => {
    setFilters(prev => ({
      ...prev,
      dataSources: prev.dataSources.includes(source)
        ? prev.dataSources.filter(s => s !== source)
        : [...prev.dataSources, source],
    }));
  };

  if (authLoading || loading) {
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
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">Exportación para Investigación</h1>
            <p className="text-gray-400 mt-1">
              Exporta la base de datos completa o filtrada para estudios retrospectivos
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => router.push('/admin')}
          >
            Volver
          </Button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Filtros */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filtros de período */}
            <Card>
              <CardHeader>
                <CardTitle>Filtros de Período</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Desde
                    </label>
                    <input
                      type="date"
                      value={filters.fromDate}
                      onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value }))}
                      className="w-full bg-dark-500 border border-dark-300 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-surgical-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Hasta
                    </label>
                    <input
                      type="date"
                      value={filters.toDate}
                      onChange={(e) => setFilters(prev => ({ ...prev, toDate: e.target.value }))}
                      className="w-full bg-dark-500 border border-dark-300 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-surgical-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    O seleccionar año específico
                  </label>
                  <select
                    value={filters.year}
                    onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value, fromDate: '', toDate: '' }))}
                    className="w-full bg-dark-500 border border-dark-300 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-surgical-500"
                  >
                    <option value="">Todos los años</option>
                    {options?.years?.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Origen de datos */}
            <Card>
              <CardHeader>
                <CardTitle>Origen de Datos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-400 mb-2">
                  Selecciona las fuentes de datos a incluir (vacío = todas)
                </p>
                {options?.dataSources?.map(ds => (
                  <label key={ds.source} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.dataSources.includes(ds.source)}
                      onChange={() => toggleDataSource(ds.source)}
                      className="w-4 h-4 rounded border-dark-300 bg-dark-500 text-surgical-500 focus:ring-surgical-500"
                    />
                    <span className="text-gray-300">
                      {ds.source === 'EXCEL_PRE_2019' && 'Excel pre-2019 (datos precarios)'}
                      {ds.source === 'APPSHEET' && 'AppSheet 2019-2024 (datos moderados)'}
                      {ds.source === 'PLATFORM' && 'Plataforma 2024+ (datos completos)'}
                    </span>
                    <span className="text-gray-500 text-sm">({ds.count} casos)</span>
                  </label>
                ))}

                <div className="border-t border-dark-300 pt-3 mt-3 space-y-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.includeRetransplants}
                      onChange={(e) => setFilters(prev => ({ ...prev, includeRetransplants: e.target.checked }))}
                      className="w-4 h-4 rounded border-dark-300 bg-dark-500 text-surgical-500 focus:ring-surgical-500"
                    />
                    <span className="text-gray-300">Incluir retrasplantes</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.includeHepatoRenal}
                      onChange={(e) => setFilters(prev => ({ ...prev, includeHepatoRenal: e.target.checked }))}
                      className="w-4 h-4 rounded border-dark-300 bg-dark-500 text-surgical-500 focus:ring-surgical-500"
                    />
                    <span className="text-gray-300">Incluir hepato-renales</span>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Tablas a exportar */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Tablas a Exportar</CardTitle>
                <div className="flex space-x-2">
                  <button
                    onClick={selectAllTables}
                    className="text-xs text-surgical-400 hover:text-surgical-300"
                  >
                    Todas
                  </button>
                  <span className="text-gray-500">|</span>
                  <button
                    onClick={selectNoTables}
                    className="text-xs text-gray-400 hover:text-gray-300"
                  >
                    Ninguna
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {options?.tables?.map(table => (
                    <label
                      key={table.id}
                      className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        exportOptions.tables.includes(table.id)
                          ? 'bg-surgical-500/10 border-surgical-500/30'
                          : 'bg-dark-500 border-dark-300 hover:border-dark-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={exportOptions.tables.includes(table.id)}
                        onChange={() => toggleTable(table.id)}
                        className="w-4 h-4 mt-0.5 rounded border-dark-300 bg-dark-500 text-surgical-500 focus:ring-surgical-500"
                      />
                      <div>
                        <div className="text-gray-200 font-medium">{table.name}</div>
                        <div className="text-gray-500 text-xs">{table.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Opciones adicionales */}
            <Card>
              <CardHeader>
                <CardTitle>Opciones de Exportación</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.anonymize}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, anonymize: e.target.checked }))}
                    className="w-4 h-4 rounded border-dark-300 bg-dark-500 text-surgical-500 focus:ring-surgical-500"
                  />
                  <div>
                    <span className="text-gray-300">Anonimizar datos</span>
                    <p className="text-xs text-gray-500">Reemplaza CI y nombre por códigos anónimos (P001, P002...)</p>
                  </div>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeDataDictionary}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, includeDataDictionary: e.target.checked }))}
                    className="w-4 h-4 rounded border-dark-300 bg-dark-500 text-surgical-500 focus:ring-surgical-500"
                  />
                  <div>
                    <span className="text-gray-300">Incluir diccionario de datos</span>
                    <p className="text-xs text-gray-500">Añade data_dictionary.csv con descripción de variables</p>
                  </div>
                </label>
              </CardContent>
            </Card>
          </div>

          {/* Preview y acciones */}
          <div className="space-y-6">
            {/* Vista previa */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Vista Previa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {preview ? (
                  <div className={loadingPreview ? 'opacity-50' : ''}>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Casos</span>
                        <span className="text-gray-100 font-semibold">{preview.cases}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Pacientes</span>
                        <span className="text-gray-100 font-semibold">{preview.patients}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Registros intraop</span>
                        <span className="text-gray-100 font-semibold">{preview.intraopRecords}</span>
                      </div>
                    </div>

                    {preview.dateRange?.from && (
                      <div className="border-t border-dark-300 pt-3 mt-3">
                        <div className="text-sm text-gray-400">Período de datos:</div>
                        <div className="text-gray-200">
                          {preview.dateRange.from} - {preview.dateRange.to}
                        </div>
                      </div>
                    )}

                    <div className="border-t border-dark-300 pt-3 mt-3">
                      <div className="text-sm text-gray-400 mb-2">
                        Tablas seleccionadas: {exportOptions.tables.length}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {exportOptions.tables.map(t => (
                          <span key={t} className="text-xs bg-dark-400 text-gray-300 px-2 py-0.5 rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-4">
                    <Spinner size="sm" className="mx-auto" />
                  </div>
                )}

                <div className="space-y-2 pt-4">
                  <Button
                    onClick={handleExport}
                    disabled={exporting || exportOptions.tables.length === 0 || preview?.cases === 0}
                    className="w-full"
                    variant="primary"
                  >
                    {exporting ? (
                      <>
                        <Spinner size="sm" className="mr-2" />
                        Generando...
                      </>
                    ) : (
                      'Descargar ZIP'
                    )}
                  </Button>

                  <Button
                    onClick={handleDownloadDictionary}
                    variant="ghost"
                    className="w-full"
                  >
                    Solo diccionario de datos
                  </Button>
                </div>

                {exportOptions.tables.length === 0 && (
                  <p className="text-yellow-500 text-sm text-center">
                    Selecciona al menos una tabla
                  </p>
                )}

                {preview?.cases === 0 && (
                  <p className="text-yellow-500 text-sm text-center">
                    No hay datos con los filtros actuales
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Info */}
            <Card>
              <CardContent className="text-sm text-gray-400 space-y-2 py-4">
                <p><strong className="text-gray-300">Formato:</strong> CSV (UTF-8 con BOM)</p>
                <p><strong className="text-gray-300">Estructura:</strong> Modelo relacional (múltiples CSVs)</p>
                <p><strong className="text-gray-300">Compatibilidad:</strong> SPSS, Stata, R, Excel</p>
                <p className="pt-2 border-t border-dark-300 mt-2">
                  Los archivos se descargan como ZIP con un README explicativo.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
