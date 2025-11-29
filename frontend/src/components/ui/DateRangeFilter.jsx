'use client';

/**
 * Componente de filtro por rango de fechas
 * Retorna las fechas en formato ISO para enviar al backend
 */
export default function DateRangeFilter({
  label,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className = ""
}) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div className="flex gap-2 items-center">
        <input
          type="date"
          value={startDate || ''}
          onChange={(e) => onStartDateChange(e.target.value || null)}
          className="flex-1 px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
          placeholder="Desde"
        />
        <span className="text-gray-400">→</span>
        <input
          type="date"
          value={endDate || ''}
          onChange={(e) => onEndDateChange(e.target.value || null)}
          className="flex-1 px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500 focus:border-transparent"
          placeholder="Hasta"
        />
      </div>
    </div>
  );
}
