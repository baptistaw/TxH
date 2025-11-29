'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import { proceduresApi, cliniciansApi } from '@/lib/api';
import { formatDate, formatDateTime, calculateAge, debounce } from '@/lib/utils';
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

export default function ProceduresPage() {
  return (
    <ProtectedRoute>
      <ProceduresPageContent />
    </ProtectedRoute>
  );
}

function ProceduresPageContent() {
  const [procedures, setProcedures] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar catálogos
  const { items: procedureTypeItems, loading: procedureTypeLoading } = useCatalog('ProcedureType');
  const { items: asaItems, loading: asaLoading } = useCatalog('ASA');
  const { items: locationItems, loading: locationLoading } = useCatalog('ProcedureLocation');

  // Cargar clínicos
  const [clinicians, setClinicians] = useState([]);
  const [cliniciansLoading, setCliniciansLoading] = useState(true);

  // Filtros
  const [filters, setFilters] = useState({
    q: '',
    page: 1,
    limit: 20,
    myProcedures: false,
    procedureType: null,
    location: null,
    asa: null,
    clinicianId: null,
    transplanted: null,
    startDate: null,
    endDate: null,
  });

  // Estado para mostrar/ocultar filtros avanzados
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Definir columnas
  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.patient?.name, {
        id: 'patientName',
        header: 'Paciente',
        cell: (info) => (
          <span className="font-medium">{info.getValue() || '-'}</span>
        ),
      }),
      columnHelper.accessor((row) => row.patient?.id, {
        id: 'patientCI',
        header: 'CI',
        cell: (info) => (
          <span className="font-mono text-surgical-400">{info.getValue() || '-'}</span>
        ),
        size: 120,
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
      columnHelper.accessor('procedureType', {
        header: 'Tipo de Procedimiento',
        cell: (info) => {
          const type = info.getValue();
          if (!type) return '-';

          // Buscar el label dinámicamente del catálogo
          const item = procedureTypeItems.find(item => item.code === type);
          const label = item?.label || type;

          return (
            <span className="text-sm text-gray-300">
              {label}
            </span>
          );
        },
        size: 180,
      }),
      columnHelper.accessor('startAt', {
        header: 'Fecha/Hora Inicio',
        cell: (info) => {
          const value = info.getValue();
          return value ? (
            <span className="text-sm">{formatDateTime(value)}</span>
          ) : '-';
        },
        size: 150,
      }),
      columnHelper.accessor('duration', {
        header: 'Duración',
        cell: (info) => {
          const minutes = info.getValue();
          if (!minutes) return '-';
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          return (
            <span className="text-sm font-mono">
              {hours > 0 ? `${hours}h ` : ''}{mins}m
            </span>
          );
        },
        size: 100,
      }),
      columnHelper.accessor('location', {
        header: 'Ubicación',
        cell: (info) => (
          <span className="text-sm text-gray-300">
            {info.getValue() || '-'}
          </span>
        ),
        size: 100,
      }),
      columnHelper.accessor('asa', {
        header: 'ASA',
        cell: (info) => {
          const value = info.getValue();
          if (!value) return '-';

          return (
            <Badge variant="default">
              ASA {value}
            </Badge>
          );
        },
        size: 80,
      }),
      columnHelper.accessor((row) => row.clinician?.name, {
        id: 'clinicianName',
        header: 'Clínico',
        cell: (info) => (
          <span className="text-sm text-gray-300">
            {info.getValue() || '-'}
          </span>
        ),
        size: 150,
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
          <div className="flex gap-2">
            <Link href={`/procedures/${info.getValue()}`}>
              <Button variant="ghost" size="sm">
                Ver
              </Button>
            </Link>
          </div>
        ),
        size: 100,
        enableSorting: false,
      }),
    ],
    [procedureTypeItems]
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
  useEffect(() => {
    const fetchProcedures = async () => {
      setLoading(true);
      try {
        // Limpiar filtros: eliminar valores null, undefined o vacíos
        const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            acc[key] = value;
          }
          return acc;
        }, {});

        const data = await proceduresApi.list(cleanFilters);
        setProcedures(data.data || []);
        setTotalRecords(data.total || 0);
        setError(null);
      } catch (err) {
        setError(err.message);
        setProcedures([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProcedures();
  }, [filters]);

  // Debounced search
  const handleSearch = useMemo(
    () =>
      debounce((value) => {
        setFilters((prev) => ({ ...prev, q: value, page: 1 }));
      }, 500),
    []
  );

  // Configurar tabla
  const table = useReactTable({
    data: procedures,
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

  return (
    <AppLayout>
      <div className="h-full px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-100 mb-2">
                Procedimientos Quirúrgicos
              </h1>
              <p className="text-gray-400">
                Biopsias, endoscopías y otros procedimientos no-trasplante
              </p>
            </div>
            <Link href="/procedures/new">
              <Button>
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Nuevo Procedimiento
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lista de Procedimientos</CardTitle>
              <div className="text-sm text-gray-400">
                Total: {totalRecords} procedimientos
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
                    placeholder="Buscar procedimiento..."
                    onChange={(e) => handleSearch(e.target.value)}
                    className="max-w-2xl"
                  />
                </div>
                <div className="flex flex-wrap gap-2 items-center text-xs text-gray-400">
                  <span>Busca en:</span>
                  <span className="px-2 py-1 bg-dark-600 border border-dark-500 rounded">CI del Paciente</span>
                  <span className="px-2 py-1 bg-dark-600 border border-dark-500 rounded">Nombre del Paciente</span>
                  <span className="px-2 py-1 bg-dark-600 border border-dark-500 rounded">Tipo de Procedimiento</span>
                </div>
              </div>

              {/* Filtro "Mis Procedimientos" destacado */}
              <div className="bg-surgical-900/20 border border-surgical-500/30 rounded-lg p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.myProcedures}
                    onChange={(e) => setFilters((prev) => ({ ...prev, myProcedures: e.target.checked, page: 1 }))}
                    className="w-4 h-4 text-surgical-500 bg-dark-600 border-dark-400 rounded focus:ring-surgical-500 focus:ring-2"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-surgical-300">Mostrar solo mis procedimientos</span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Filtra los procedimientos donde estás asignado como responsable
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
                      label="Tipo de Procedimiento"
                      value={filters.procedureType}
                      onChange={(value) => setFilters((prev) => ({ ...prev, procedureType: value, page: 1 }))}
                      options={catalogToOptions(procedureTypeItems)}
                      disabled={procedureTypeLoading}
                    />

                    <FilterSelect
                      label="ASA"
                      value={filters.asa}
                      onChange={(value) => setFilters((prev) => ({ ...prev, asa: value, page: 1 }))}
                      options={catalogToOptions(asaItems)}
                      disabled={asaLoading}
                    />

                    <FilterSelect
                      label="Ubicación"
                      value={filters.location}
                      onChange={(value) => setFilters((prev) => ({ ...prev, location: value, page: 1 }))}
                      options={catalogToOptions(locationItems)}
                      disabled={locationLoading}
                    />

                    <FilterSelect
                      label="Clínico Asignado"
                      value={filters.clinicianId}
                      onChange={(value) => setFilters((prev) => ({ ...prev, clinicianId: value, page: 1 }))}
                      options={clinicians.map(c => ({ value: String(c.id), label: c.name }))}
                      disabled={cliniciansLoading}
                    />

                    <DateRangeFilter
                      label="Fecha del Procedimiento"
                      startDate={filters.startDate}
                      endDate={filters.endDate}
                      onStartDateChange={(value) => setFilters((prev) => ({ ...prev, startDate: value, page: 1 }))}
                      onEndDateChange={(value) => setFilters((prev) => ({ ...prev, endDate: value, page: 1 }))}
                    />
                  </div>

                  {/* Botón para limpiar filtros */}
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({
                        search: filters.search,
                        myProcedures: filters.myProcedures,
                        page: 1,
                        limit: 20,
                        transplanted: null,
                        procedureType: null,
                        location: null,
                        asa: null,
                        clinicianId: null,
                        startDate: null,
                        endDate: null,
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
              <div className="flex justify-center items-center py-12">
                <Spinner />
                <p className="text-center text-gray-400 mt-4">
                  Cargando procedimientos...
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
                Error al cargar procedimientos: {error}
              </div>
            ) : procedures.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-300">
                  No hay procedimientos registrados
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Comienza creando un nuevo procedimiento quirúrgico
                </p>
                <div className="mt-6">
                  <Link href="/procedures/new">
                    <Button>
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Nuevo Procedimiento
                    </Button>
                  </Link>
                </div>
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
