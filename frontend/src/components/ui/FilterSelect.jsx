'use client';

/**
 * Componente Select mejorado para filtros
 * Incluye opción "Todos" por defecto
 */
export default function FilterSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = "Seleccionar...",
  allLabel = "Todos",
  className = ""
}) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
        </label>
      )}
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
        className="w-full px-3 py-2 bg-dark-600 border border-dark-400 rounded-lg text-gray-100 focus:ring-2 focus:ring-surgical-500 focus:border-transparent appearance-none cursor-pointer"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
