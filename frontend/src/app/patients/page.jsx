// src/app/patients/page.jsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import { patientsApi } from '@/lib/api';
import { formatDate, formatDateTime, formatCI, formatBoolean, calculateAge, debounce } from '@/lib/utils';
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
import { useCatalog, catalogToOptions } from '@/hooks/useCatalog';

const columnHelper = createColumnHelper();

export default function PatientsPage() {
  return (
    <ProtectedRoute>
      <PatientsPageContent />
    </ProtectedRoute>
  );
}

function PatientsPageContent() {
  const [patients, setPatients] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar catálogos
  const { items: providerItems, loading: providerLoading } = useCatalog('Provider');
  const { items: sexItems, loading: sexLoading } = useCatalog('Sex');

  // Filtros
  const [filters, setFilters] = useState({
    q: '',
    page: 1,
    limit: 20,
    myPatients: false,
    transplanted: null,
    provider: null,
    sex: null,
    admissionDateFrom: null,
    admissionDateTo: null,
  });

  // Estado para mostrar/ocultar filtros avanzados
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Definir columnas
  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: 'CI',
        cell: (info) => (
          <span className="font-mono text-surgical-400">
            {formatCI(info.getValue())}
          </span>
        ),
        size: 120,
      }),
      columnHelper.accessor('name', {
        header: 'Nombre',
        cell: (info) => (
          <span className="font-medium">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('sex', {
        header: 'Sexo',
        cell: (info) => info.getValue() || '-',
        size: 80,
      }),
      columnHelper.accessor('birthDate', {
        header: 'Edad',
        cell: (info) => {
          const age = calculateAge(info.getValue());
          return age !== null ? `${age} años` : '-';
        },
        size: 90,
      }),
      columnHelper.accessor('provider', {
        header: 'Prestador',
        cell: (info) => info.getValue() || '-',
      }),
      columnHelper.accessor((row) => row.cases?.[0]?.startAt, {
        id: 'transplantDate',
        header: 'Fecha Trasplante',
        cell: (info) => {
          const date = info.getValue();
          return date ? formatDate(date) : '-';
        },
        size: 130,
      }),
      columnHelper.accessor('transplanted', {
        header: 'Trasplantado',
        cell: (info) => (
          <Badge variant={info.getValue() ? 'success' : 'default'}>
            {formatBoolean(info.getValue())}
          </Badge>
        ),
        size: 120,
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
      columnHelper.display({
        id: 'actions',
        header: 'Acciones',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Link href={`/patients/${row.original.id}`}>
              <button className="text-surgical-400 hover:text-surgical-300 transition-colors text-sm font-medium">
                Ver
              </button>
            </Link>
            <Link href={`/patients/${row.original.id}/edit`}>
              <button className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium">
                Editar
              </button>
            </Link>
          </div>
        ),
        size: 120,
      }),
    ],
    []
  );

  // Cargar datos
  const fetchPatients = async () => {
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

      const data = await patientsApi.list(cleanFilters);
      setPatients(data.data || []);
      setTotalRecords(data.pagination?.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [filters]);

  // Configurar tabla
  const table = useReactTable({
    data: patients,
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
            <h1 className="text-3xl font-bold text-gray-100 mb-2">Pacientes</h1>
            <p className="text-gray-400">
              Gestión de pacientes del programa de trasplante
            </p>
          </div>
          <Link href="/patients/new">
            <Button>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Paciente
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lista de Pacientes</CardTitle>
              <div className="text-sm text-gray-400">
                Total: {totalRecords} pacientes
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
                    placeholder="Buscar paciente..."
                    onChange={(e) => handleSearch(e.target.value)}
                    className="max-w-2xl"
                  />
                </div>
                <div className="flex flex-wrap gap-2 items-center text-xs text-gray-400">
                  <span>Busca en:</span>
                  <span className="px-2 py-1 bg-dark-600 border border-dark-500 rounded">CI</span>
                  <span className="px-2 py-1 bg-dark-600 border border-dark-500 rounded">Nombre</span>
                  <span className="px-2 py-1 bg-dark-600 border border-dark-500 rounded">FNR</span>
                </div>
              </div>

              {/* Filtro "Mis Pacientes" destacado */}
              <div className="bg-surgical-900/20 border border-surgical-500/30 rounded-lg p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.myPatients}
                    onChange={(e) => setFilters((prev) => ({ ...prev, myPatients: e.target.checked, page: 1 }))}
                    className="w-4 h-4 text-surgical-500 bg-dark-600 border-dark-400 rounded focus:ring-surgical-500 focus:ring-2"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-surgical-300">Mostrar solo mis pacientes</span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Filtra los pacientes donde estás asignado en casos o evaluaciones preoperatorias
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
                      label="Trasplantado"
                      value={filters.transplanted}
                      onChange={(value) => setFilters((prev) => ({ ...prev, transplanted: value, page: 1 }))}
                      options={[
                        { value: 'true', label: 'Sí' },
                        { value: 'false', label: 'No' },
                      ]}
                    />

                    <FilterSelect
                      label="Prestador"
                      value={filters.provider}
                      onChange={(value) => setFilters((prev) => ({ ...prev, provider: value, page: 1 }))}
                      options={catalogToOptions(providerItems)}
                      disabled={providerLoading}
                    />

                    <FilterSelect
                      label="Sexo"
                      value={filters.sex}
                      onChange={(value) => setFilters((prev) => ({ ...prev, sex: value, page: 1 }))}
                      options={catalogToOptions(sexItems)}
                      disabled={sexLoading}
                    />

                    <DateRangeFilter
                      label="Fecha de Admisión"
                      startDate={filters.admissionDateFrom}
                      endDate={filters.admissionDateTo}
                      onStartDateChange={(value) => setFilters((prev) => ({ ...prev, admissionDateFrom: value, page: 1 }))}
                      onEndDateChange={(value) => setFilters((prev) => ({ ...prev, admissionDateTo: value, page: 1 }))}
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
                        transplanted: null,
                        provider: null,
                        sex: null,
                        admissionDateFrom: null,
                        admissionDateTo: null,
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

            {/* Tabla */}
            {loading ? (
              <div className="py-12">
                <Spinner size="lg" />
                <p className="text-center text-gray-400 mt-4">
                  Cargando pacientes...
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
                Error al cargar pacientes: {error}
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
