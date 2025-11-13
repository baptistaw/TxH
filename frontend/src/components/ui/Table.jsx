// src/components/ui/Table.jsx

import { cn } from '@/lib/utils';
import { flexRender } from '@tanstack/react-table';

/**
 * Tabla básica (sin TanStack)
 */
export function SimpleTable({ children, className }) {
  return (
    <div className="overflow-x-auto">
      <table
        className={cn(
          'w-full text-sm text-left text-gray-300',
          className
        )}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className }) {
  return (
    <thead
      className={cn(
        'text-xs uppercase bg-dark-700 text-gray-400 border-b border-dark-400',
        className
      )}
    >
      {children}
    </thead>
  );
}

export function TableBody({ children, className }) {
  return (
    <tbody className={cn('divide-y divide-dark-400', className)}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className, ...props }) {
  return (
    <tr
      className={cn('hover:bg-dark-700 transition-colors', className)}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ children, className, ...props }) {
  return (
    <th className={cn('px-6 py-3 font-medium', className)} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ children, className, ...props }) {
  return (
    <td className={cn('px-6 py-4', className)} {...props}>
      {children}
    </td>
  );
}

/**
 * Componente de tabla integrado con TanStack Table
 */
export function DataTable({ table, className }) {
  return (
    <div className="w-full">
      <div className="overflow-x-auto rounded-lg border border-dark-400">
        <table className={cn('w-full text-sm text-left text-gray-300', className)}>
          <thead className="text-xs uppercase bg-dark-700 text-gray-400 border-b border-dark-400">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 font-medium"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-dark-400">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={table.getAllColumns().length}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No hay datos disponibles
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-dark-700 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Componente de paginación para TanStack Table
 */
export function TablePagination({ table, totalRecords }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-dark-400 bg-dark-700 rounded-b-lg">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span>
          Mostrando {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} a{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            totalRecords
          )}{' '}
          de {totalRecords} resultados
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="px-3 py-1 text-sm border border-dark-400 rounded hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Anterior
        </button>

        <span className="text-sm text-gray-400">
          Página {table.getState().pagination.pageIndex + 1} de{' '}
          {table.getPageCount()}
        </span>

        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="px-3 py-1 text-sm border border-dark-400 rounded hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

export default DataTable;
