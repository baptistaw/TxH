// src/lib/utils.js - Utilidades generales

import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Combinar clases CSS (similar a clsx)
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Formatear fecha
 */
export function formatDate(date, formatStr = 'dd/MM/yyyy') {
  if (!date) return '-';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr, { locale: es });
  } catch {
    return '-';
  }
}

/**
 * Formatear fecha y hora
 */
export function formatDateTime(date, formatStr = 'dd/MM/yyyy HH:mm') {
  return formatDate(date, formatStr);
}

/**
 * Formatear CI (cédula uruguaya)
 */
export function formatCI(ci) {
  if (!ci) return '-';

  // Remover caracteres no numéricos
  const digits = ci.toString().replace(/\D/g, '');

  // Formato: 1.234.567-8
  if (digits.length === 8) {
    return `${digits[0]}.${digits.slice(1, 4)}.${digits.slice(4, 7)}-${digits[7]}`;
  }

  // Formato: 123.456-7 (7 dígitos)
  if (digits.length === 7) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}-${digits[6]}`;
  }

  // Formato: 12.345-6 (6 dígitos)
  if (digits.length === 6) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}-${digits[5]}`;
  }

  return ci;
}

/**
 * Formatear duración en minutos a horas:minutos
 */
export function formatDuration(minutes) {
  if (!minutes || minutes === 0) return '-';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}min`;
  }

  return `${hours}h ${mins}min`;
}

/**
 * Formatear score MELD
 */
export function formatMELD(meld) {
  if (!meld && meld !== 0) return '-';
  return meld.toString();
}

/**
 * Formatear boolean SI/NO
 */
export function formatBoolean(value) {
  if (value === true || value === 'true') return 'Sí';
  if (value === false || value === 'false') return 'No';
  return '-';
}

/**
 * Calcular edad desde fecha de nacimiento
 */
export function calculateAge(birthDate) {
  if (!birthDate) return null;

  try {
    const dateObj = typeof birthDate === 'string' ? parseISO(birthDate) : birthDate;
    const today = new Date();
    let age = today.getFullYear() - dateObj.getFullYear();
    const monthDiff = today.getMonth() - dateObj.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateObj.getDate())) {
      age--;
    }

    return age;
  } catch {
    return null;
  }
}

/**
 * Capitalizar primera letra
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Truncar texto
 */
export function truncate(str, maxLength = 50) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

/**
 * Debounce function
 */
export function debounce(func, wait = 300) {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Obtener iniciales de un nombre
 */
export function getInitials(name) {
  if (!name) return '??';

  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Validar CI uruguayo (simple)
 */
export function isValidCI(ci) {
  if (!ci) return false;
  const digits = ci.toString().replace(/\D/g, '');
  return digits.length >= 6 && digits.length <= 8;
}

/**
 * Generar color basado en string (para avatares)
 */
export function stringToColor(str) {
  if (!str) return '#6b7280';

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = hash % 360;
  return `hsl(${hue}, 60%, 50%)`;
}

/**
 * Manejar errores de API de forma amigable
 */
export function getErrorMessage(error) {
  if (!error) return 'Error desconocido';

  if (error.message) return error.message;
  if (error.data?.message) return error.data.message;
  if (error.data?.error) return error.data.error;

  if (error.status === 401) return 'No autorizado';
  if (error.status === 403) return 'Acceso denegado';
  if (error.status === 404) return 'No encontrado';
  if (error.status === 500) return 'Error del servidor';

  return 'Error en la solicitud';
}

/**
 * Sleep para async/await
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
