// src/app/cases/page.jsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import { casesApi, cliniciansApi } from '@/lib/api';
import { formatDate, formatDateTime, formatCI, formatDuration, formatBoolean, calculateAge, debounce } from '@/lib/utils';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import DataTable, { TablePagination } from '@/components/ui/Table';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import FilterSelect from '@/components/ui/FilterSelect';
import DateRangeFilter from '@/components/ui/DateRangeFilter';
import { useCatalog, catalogToOptions, useEtiologies, etiologiesToOptions } from '@/hooks/useCatalog';

const columnHelper = createColumnHelper();

export default function CasesPage() {
  return (
    <ProtectedRoute>
      <CasesPageContent />
    </ProtectedRoute>
  );
}

function CasesPageContent() {
  const [cases, setCases] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar etiologías y catálogo de sexo
  const { items: etiologyItems, loading: etiologyLoading } = useEtiologies();
  const { items: sexItems, loading: sexLoading } = useCatalog('Sex');

  // Cargar clínicos
  const [clinicians, setClinicians] = useState([]);
  const [cliniciansLoading, setCliniciansLoading] = useState(true);

  // Filtros
  const [filters, setFilters] = useState({
    q: '',
    page: 1,
    limit: 20,
    myPatients: false,
    isRetransplant: null,
    isHepatoRenal: null,
    optimalDonor: null,
    clinicianId: null,
    startDate: null,
    endDate: null,
    transplantDateFrom: null,
    transplantDateTo: null,
    etiology: null,
    sex: null,
    dataSource: null,
  });

  // Estado para mostrar/ocultar filtros avanzados
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Definir columnas
  const columns = useMemo(
    () => [
      columnHelper.accessor('patientId', {
        header: 'CI Paciente',
        cell: (info) => (
          <span className="font-mono text-surgical-400">
            {formatCI(info.getValue())}
          </span>
        ),
        size: 120,
      }),
      columnHelper.accessor((row) => row.patient?.name, {
        id: 'patientName',
        header: 'Paciente',
        cell: (info) => (
          <span className="font-medium">{info.getValue() || '-'}</span>
        ),
      }),
      columnHelper.accessor((row) => row.patient?.sex, {
        id: 'patientSex',
        header: 'Sexo',
        cell: (info) => info.getValue() || '-',
        size: 70,
      }),
      columnHelper.accessor((row) => row.patient?.birthDate, {
        id: 'patientAge',
        header: 'Edad',
        cell: (info) => {
          const age = calculateAge(info.getValue());
          return age !== null ? `${age}` : '-';
        },
        size: 70,
      }),
      columnHelper.accessor('startAt', {
        header: 'Fecha Inicio',
        cell: (info) => (
          <span className="text-sm">{formatDateTime(info.getValue())}</span>
        ),
        size: 150,
      }),
      columnHelper.accessor('duration', {
        header: 'Duración',
        cell: (info) => (
          <span className="font-mono text-sm">
            {formatDuration(info.getValue())}
          </span>
        ),
        size: 100,
      }),
      columnHelper.accessor('isRetransplant', {
        header: 'Retx',
        cell: (info) => (
          <Badge variant={info.getValue() ? 'warning' : 'default'}>
            {formatBoolean(info.getValue())}
          </Badge>
        ),
        size: 80,
      }),
      columnHelper.accessor('isHepatoRenal', {
        header: 'HR',
        cell: (info) => (
          <Badge variant={info.getValue() ? 'info' : 'default'}>
            {formatBoolean(info.getValue())}
          </Badge>
        ),
        size: 80,
      }),
      columnHelper.accessor((row) => row.team, {
        id: 'teamMembers',
        header: 'Equipo',
        cell: (info) => {
          const team = info.getValue();
          if (!team || team.length === 0) return '-';
          const names = team.map(t => t.clinician?.name).filter(Boolean).join(', ');
          return (
            <span className="text-sm text-gray-300 truncate" title={names}>
              {names || '-'}
            </span>
          );
        },
        size: 200,
      }),
      columnHelper.accessor('dataSource', {
        header: 'Origen',
        cell: (info) => {
          const dataSourceMap = {
            'EXCEL_PRE_2019': { label: 'Excel', variant: 'default' },
            'APPSHEET': { label: 'Appsheet', variant: 'info' },
            'PLATFORM': { label: 'Producción', variant: 'success' },
          };
          const source = dataSourceMap[info.getValue()] || { label: '-', variant: 'default' };
          return (
            <Badge variant={source.variant} size="sm">
              {source.label}
            </Badge>
          );
        },
        size: 110,
      }),
      columnHelper.accessor('createdAt', {
        header: 'Fecha Creación',
        cell: (info) => (
          <span className="text-xs text-gray-400">
            {formatDateTime(info.getValue())}
          </span>
        ),
        size: 150,
      }),
      columnHelper.accessor('id', {
        header: 'Acciones',
        cell: (info) => (
          <Link href={`/cases/${info.getValue()}`}>
            <Button size="sm" variant="outline">
              Ver Detalles
            </Button>
          </Link>
        ),
        size: 120,
      }),
    ],
    []
  );

  // Cargar clínicos
  useEffect(() => {
    const fetchClinicians = async () => {
      try {
        const data = await cliniciansApi.list();
        setClinicians(data.data || []);
      } catch (err) {
        console.error('Error loading clinicians:', err);
      } finally {
        setCliniciansLoading(false);
      }
    };

    fetchClinicians();
  }, []);

  // Cargar datos
  const fetchCases = async () => {
    setLoading(true);
    setError(null);

    try {
      // Limpiar filtros: eliminar valores null, undefined o vacíos
      const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {});

      const data = await casesApi.list(cleanFilters);
      setCases(data.data || []);
      setTotalRecords(data.pagination?.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [filters]);

  // Configurar tabla
  const table = useReactTable({
    data: cases,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalRecords / filters.limit),
    state: {
      pagination: {
        pageIndex: filters.page - 1,
        pageSize: filters.limit,
      },
    },
    onPaginationChange: (updater) => {
      const newState =
        typeof updater === 'function'
          ? updater({ pageIndex: filters.page - 1, pageSize: filters.limit })
          : updater;

      setFilters((prev) => ({
        ...prev,
        page: newState.pageIndex + 1,
      }));
    },
  });

  // Debounced search
  const handleSearch = useMemo(
    () =>
      debounce((value) => {
        setFilters((prev) => ({ ...prev, q: value, page: 1 }));
      }, 500),
    []
  );

  return (
    <AppLayout>
      <div className="h-full px-8 py-6">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-100 mb-2">
              Casos de Trasplante
            </h1>
            <p className="text-gray-400">
              Registros de procedimientos de trasplante hepático
            </p>
          </div>
          <Link href="/cases/new">
            <Button>
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Trasplante
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lista de Casos</CardTitle>
              <div className="text-sm text-gray-400">
                Total: {totalRecords} casos
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Filtros */}
            <div className="mb-6 space-y-4">
              {/* Búsqueda de texto */}
              <div className="space-y-3">
                <div className="relative">
                  <Input
                    placeholder="Buscar caso de trasplante..."
                    onChange={(e) => handleSearch(e.target.value)}
                    className="max-w-2xl"
                  />
                </div>
                <div className="flex flex-wrap gap-2 items-center text-xs text-gray-400">
                  <span>Busca en:</span>
                  <span className="px-2 py-1 bg-dark-600 border border-dark-500 rounded">CI del Paciente</span>
                  <span className="px-2 py-1 bg-dark-600 border border-dark-500 rounded">Nombre del Paciente</span>
                  <span className="px-2 py-1 bg-dark-600 border border-dark-500 rounded">ID del Caso</span>
                </div>
              </div>

              {/* Filtro "Mis Casos" destacado */}
              <div className="bg-surgical-900/20 border border-surgical-500/30 rounded-lg p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.myPatients}
                    onChange={(e) => setFilters((prev) => ({ ...prev, myPatients: e.target.checked, page: 1 }))}
                    className="w-4 h-4 text-surgical-500 bg-dark-600 border-dark-400 rounded focus:ring-surgical-500 focus:ring-2"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-surgical-300">Mostrar solo mis casos</span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Filtra los casos donde estás asignado como parte del equipo quirúrgico
                    </p>
                  </div>
                </label>
              </div>

              {/* Botón para mostrar/ocultar filtros avanzados */}
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="text-surgical-400"
                >
                  <svg
                    className={`w-4 h-4 mr-2 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {showAdvancedFilters ? 'Ocultar' : 'Mostrar'} filtros avanzados
                </Button>
              </div>

              {/* Filtros Avanzados */}
              {showAdvancedFilters && (
                <div className="border-t border-dark-500 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FilterSelect
                      label="Retrasplante"
                      value={filters.isRetransplant}
                      onChange={(value) => setFilters((prev) => ({ ...prev, isRetransplant: value, page: 1 }))}
                      options={[
                        { value: 'true', label: 'Sí' },
                        { value: 'false', label: 'No' },
                      ]}
                    />

                    <FilterSelect
                      label="Hepato-Renal"
                      value={filters.isHepatoRenal}
                      onChange={(value) => setFilters((prev) => ({ ...prev, isHepatoRenal: value, page: 1 }))}
                      options={[
                        { value: 'true', label: 'Sí' },
                        { value: 'false', label: 'No' },
                      ]}
                    />

                    <FilterSelect
                      label="Donante Óptimo"
                      value={filters.optimalDonor}
                      onChange={(value) => setFilters((prev) => ({ ...prev, optimalDonor: value, page: 1 }))}
                      options={[
                        { value: 'true', label: 'Sí' },
                        { value: 'false', label: 'No' },
                      ]}
                    />

                    <FilterSelect
                      label="Etiología"
                      value={filters.etiology}
                      onChange={(value) => setFilters((prev) => ({ ...prev, etiology: value, page: 1 }))}
                      options={etiologiesToOptions(etiologyItems)}
                      disabled={etiologyLoading}
                    />

                    <FilterSelect
                      label="Sexo"
                      value={filters.sex}
                      onChange={(value) => setFilters((prev) => ({ ...prev, sex: value, page: 1 }))}
                      options={catalogToOptions(sexItems)}
                      disabled={sexLoading}
                    />

                    <FilterSelect
                      label="Origen de Datos"
                      value={filters.dataSource}
                      onChange={(value) => setFilters((prev) => ({ ...prev, dataSource: value, page: 1 }))}
                      options={[
                        { value: 'EXCEL_PRE_2019', label: 'Excel (hasta 2019)' },
                        { value: 'APPSHEET', label: 'Appsheet (2019-actual)' },
                        { value: 'PLATFORM', label: 'Esta Plataforma (producción)' },
                      ]}
                    />

                    <FilterSelect
                      label="Clínico del Equipo"
                      value={filters.clinicianId}
                      onChange={(value) => setFilters((prev) => ({ ...prev, clinicianId: value, page: 1 }))}
                      options={clinicians.map(c => ({ value: String(c.id), label: c.name }))}
                      disabled={cliniciansLoading}
                    />

                    <DateRangeFilter
                      label="Fecha de Inicio Cirugía"
                      startDate={filters.startDate}
                      endDate={filters.endDate}
                      onStartDateChange={(value) => setFilters((prev) => ({ ...prev, startDate: value, page: 1 }))}
                      onEndDateChange={(value) => setFilters((prev) => ({ ...prev, endDate: value, page: 1 }))}
                    />

                    <DateRangeFilter
                      label="Fecha del Trasplante"
                      startDate={filters.transplantDateFrom}
                      endDate={filters.transplantDateTo}
                      onStartDateChange={(value) => setFilters((prev) => ({ ...prev, transplantDateFrom: value, page: 1 }))}
                      onEndDateChange={(value) => setFilters((prev) => ({ ...prev, transplantDateTo: value, page: 1 }))}
                    />
                  </div>

                  {/* Botón para limpiar filtros */}
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({
                        q: filters.q,
                        myPatients: filters.myPatients,
                        page: 1,
                        limit: 20,
                        isRetransplant: null,
                        isHepatoRenal: null,
                        optimalDonor: null,
                        clinicianId: null,
                        startDate: null,
                        endDate: null,
                        transplantDateFrom: null,
                        transplantDateTo: null,
                        etiology: null,
                        sex: null,
                        dataSource: null,
                      })}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Limpiar filtros avanzados
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Leyenda */}
            <div className="mb-4 flex flex-wrap gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="warning">Sí</Badge>
                <span className="text-gray-400">Retx = Retrasplante</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="info">Sí</Badge>
                <span className="text-gray-400">HR = Hepato-Renal</span>
              </div>
            </div>

            {/* Tabla */}
            {loading ? (
              <div className="py-12">
                <Spinner size="lg" />
                <p className="text-center text-gray-400 mt-4">
                  Cargando casos...
                </p>
              </div>
            ) : error ? (
              <div className="alert alert-error">
                <svg
                  className="w-5 h-5 inline-block mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Error al cargar casos: {error}
              </div>
            ) : (
              <>
                <DataTable table={table} />
                <TablePagination
                  table={table}
                  totalRecords={totalRecords}
                  onPageSizeChange={(newSize) => setFilters((prev) => ({ ...prev, limit: newSize, page: 1 }))}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
