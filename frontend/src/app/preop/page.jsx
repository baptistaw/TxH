// src/app/preop/page.jsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import { preopApi, cliniciansApi } from '@/lib/api';
import { formatDate, formatDateTime, formatCI, calculateAge, debounce } from '@/lib/utils';
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

const columnHelper = createColumnHelper();

export default function PreopEvaluationsPage() {
  return (
    <ProtectedRoute>
      <PreopEvaluationsPageContent />
    </ProtectedRoute>
  );
}

function PreopEvaluationsPageContent() {
  const [evaluations, setEvaluations] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar clínicos
  const [clinicians, setClinicians] = useState([]);
  const [cliniciansLoading, setCliniciansLoading] = useState(true);

  // Filtros
  const [filters, setFilters] = useState({
    q: '',
    page: 1,
    limit: 20,
    myEvaluations: false,
    inList: null,
    child: null,
    meldMin: null,
    meldMax: null,
    clinicianId: null,
    transplanted: null,
    evaluationDateFrom: null,
    evaluationDateTo: null,
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
      columnHelper.accessor('evaluationDate', {
        header: 'Fecha Evaluación',
        cell: (info) => (
          <span className="text-sm">{formatDate(info.getValue())}</span>
        ),
        size: 130,
      }),
      columnHelper.accessor('meld', {
        header: 'MELD',
        cell: (info) => {
          const value = info.getValue();
          if (!value) return '-';

          const color =
            value >= 30 ? 'text-red-400' :
            value >= 20 ? 'text-orange-400' :
            value >= 10 ? 'text-yellow-400' :
            'text-green-400';

          return (
            <span className={`font-bold ${color}`}>
              {value}
            </span>
          );
        },
        size: 80,
      }),
      columnHelper.accessor('meldNa', {
        header: 'MELD-Na',
        cell: (info) => {
          const value = info.getValue();
          if (!value) return '-';

          return (
            <span className="font-mono text-sm">
              {value}
            </span>
          );
        },
        size: 90,
      }),
      columnHelper.accessor('child', {
        header: 'Child',
        cell: (info) => {
          const value = info.getValue();
          if (!value) return '-';

          const variant =
            value === 'C' ? 'danger' :
            value === 'B' ? 'warning' :
            'success';

          return (
            <Badge variant={variant}>
              {value}
            </Badge>
          );
        },
        size: 80,
      }),
      columnHelper.accessor('etiology1', {
        header: 'Etiología',
        cell: (info) => (
          <span className="text-sm text-gray-300 truncate">
            {info.getValue() || '-'}
          </span>
        ),
        size: 150,
      }),
      columnHelper.accessor('inList', {
        header: 'En Lista',
        cell: (info) => (
          <Badge variant={info.getValue() ? 'success' : 'default'}>
            {info.getValue() ? 'Sí' : 'No'}
          </Badge>
        ),
        size: 90,
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
            <Link href={`/preop/${info.getValue()}`}>
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
  useEffect(() => {
    const fetchEvaluations = async () => {
      setLoading(true);
      try {
        // Limpiar filtros: eliminar valores null, undefined o vacíos
        const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            acc[key] = value;
          }
          return acc;
        }, {});

        const data = await preopApi.list(cleanFilters);
        setEvaluations(data.data || data.evaluations || []);
        setTotalRecords(data.total || 0);
        setError(null);
      } catch (err) {
        setError(err.message);
        setEvaluations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluations();
  }, [filters]);

  // Configurar tabla
  const table = useReactTable({
    data: evaluations,
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
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-100 mb-2">
                Evaluaciones Pretrasplante
              </h1>
              <p className="text-gray-400">
                Evaluaciones preoperatorias de candidatos a trasplante hepático
              </p>
            </div>
            <Link href="/preop/new">
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
                Nueva Evaluación
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lista de Evaluaciones</CardTitle>
              <div className="text-sm text-gray-400">
                Total: {totalRecords} evaluaciones
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
                    placeholder="Buscar evaluación pretrasplante..."
                    onChange={(e) => handleSearch(e.target.value)}
                    className="max-w-2xl"
                  />
                </div>
                <div className="flex flex-wrap gap-2 items-center text-xs text-gray-400">
                  <span>Busca en:</span>
                  <span className="px-2 py-1 bg-dark-600 border border-dark-500 rounded">CI del Paciente</span>
                  <span className="px-2 py-1 bg-dark-600 border border-dark-500 rounded">Nombre del Paciente</span>
                </div>
              </div>

              {/* Filtro "Mis Evaluaciones" destacado */}
              <div className="bg-surgical-900/20 border border-surgical-500/30 rounded-lg p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.myEvaluations}
                    onChange={(e) => setFilters((prev) => ({ ...prev, myEvaluations: e.target.checked, page: 1 }))}
                    className="w-4 h-4 text-surgical-500 bg-dark-600 border-dark-400 rounded focus:ring-surgical-500 focus:ring-2"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-surgical-300">Mostrar solo mis evaluaciones</span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Filtra las evaluaciones donde estás asignado como evaluador
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
                      label="En Lista"
                      value={filters.inList}
                      onChange={(value) => setFilters((prev) => ({ ...prev, inList: value, page: 1 }))}
                      options={[
                        { value: 'true', label: 'Sí' },
                        { value: 'false', label: 'No' },
                      ]}
                    />

                    <FilterSelect
                      label="Child-Pugh"
                      value={filters.child}
                      onChange={(value) => setFilters((prev) => ({ ...prev, child: value, page: 1 }))}
                      options={[
                        { value: 'A', label: 'Child A' },
                        { value: 'B', label: 'Child B' },
                        { value: 'C', label: 'Child C' },
                      ]}
                    />

                    <FilterSelect
                      label="Clínico Asignado"
                      value={filters.clinicianId}
                      onChange={(value) => setFilters((prev) => ({ ...prev, clinicianId: value, page: 1 }))}
                      options={clinicians.map(c => ({ value: String(c.id), label: c.name }))}
                      disabled={cliniciansLoading}
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Rango MELD
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          value={filters.meldMin || ''}
                          onChange={(e) => setFilters((prev) => ({ ...prev, meldMin: e.target.value || null, page: 1 }))}
                          placeholder="Min"
                          min="0"
                          max="40"
                          className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                          type="number"
                          value={filters.meldMax || ''}
                          onChange={(e) => setFilters((prev) => ({ ...prev, meldMax: e.target.value || null, page: 1 }))}
                          placeholder="Max"
                          min="0"
                          max="40"
                          className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <DateRangeFilter
                      label="Fecha de Evaluación"
                      startDate={filters.evaluationDateFrom}
                      endDate={filters.evaluationDateTo}
                      onStartDateChange={(value) => setFilters((prev) => ({ ...prev, evaluationDateFrom: value, page: 1 }))}
                      onEndDateChange={(value) => setFilters((prev) => ({ ...prev, evaluationDateTo: value, page: 1 }))}
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
                        myEvaluations: filters.myEvaluations,
                        page: 1,
                        limit: 20,
                        transplanted: null,
                        inList: null,
                        child: null,
                        meldMin: null,
                        meldMax: null,
                        clinicianId: null,
                        evaluationDateFrom: null,
                        evaluationDateTo: null,
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
                  Cargando evaluaciones...
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
                Error al cargar evaluaciones: {error}
              </div>
            ) : evaluations.length === 0 ? (
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
                  No hay evaluaciones
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Comienza creando una nueva evaluación pretrasplante
                </p>
                <div className="mt-6">
                  <Link href="/preop/new">
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
                      Nueva Evaluación
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <DataTable table={table} />
                <TablePagination table={table} totalRecords={totalRecords} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
