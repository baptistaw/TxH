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
import { casesApi } from '@/lib/api';
import { formatDate, formatDateTime, formatCI, formatDuration, formatBoolean, debounce } from '@/lib/utils';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Navbar from '@/components/layout/Navbar';
import DataTable, { TablePagination } from '@/components/ui/Table';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

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

  // Filtros
  const [filters, setFilters] = useState({
    search: '',
    page: 1,
    limit: 20,
  });

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

  // Cargar datos
  const fetchCases = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await casesApi.list(filters);
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
        setFilters((prev) => ({ ...prev, search: value, page: 1 }));
      }, 500),
    []
  );

  return (
    <div className="min-h-screen bg-dark-500">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-100 mb-2">
            Casos de Trasplante
          </h1>
          <p className="text-gray-400">
            Registros de procedimientos de trasplante hepático
          </p>
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
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="Buscar por CI o nombre..."
                onChange={(e) => handleSearch(e.target.value)}
              />

              {/* Espacio para más filtros si se necesitan */}
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
                <TablePagination table={table} totalRecords={totalRecords} />
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
