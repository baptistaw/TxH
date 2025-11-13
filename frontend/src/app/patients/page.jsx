// src/app/patients/page.jsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  createColumnHelper,
} from '@tanstack/react-table';
import { patientsApi } from '@/lib/api';
import { formatDate, formatCI, formatBoolean, debounce } from '@/lib/utils';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Navbar from '@/components/layout/Navbar';
import DataTable, { TablePagination } from '@/components/ui/Table';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

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

  // Filtros
  const [filters, setFilters] = useState({
    search: '',
    page: 1,
    limit: 20,
  });

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
        header: 'Fecha Nac.',
        cell: (info) => formatDate(info.getValue()),
        size: 120,
      }),
      columnHelper.accessor('provider', {
        header: 'Prestador',
        cell: (info) => info.getValue() || '-',
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
    ],
    []
  );

  // Cargar datos
  const fetchPatients = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await patientsApi.list(filters);
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
          <h1 className="text-3xl font-bold text-gray-100 mb-2">Pacientes</h1>
          <p className="text-gray-400">
            Gestión de pacientes del programa de trasplante
          </p>
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
            <div className="mb-6">
              <Input
                placeholder="Buscar por CI o nombre..."
                onChange={(e) => handleSearch(e.target.value)}
                className="max-w-md"
              />
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
                <TablePagination table={table} totalRecords={totalRecords} />
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
