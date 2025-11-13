// tools/etl/helpers.js - Funciones auxiliares para ETL
const { parse, isValid } = require('date-fns');
const { zonedTimeToUtc } = require('date-fns-tz');
const stringSimilarity = require('string-similarity');

/**
 * Normalizar CI uruguaya
 * Remover puntos, guiones y ceros iniciales
 */
function normalizeCI(ciRaw) {
  if (!ciRaw) return null;

  const ci = String(ciRaw)
    .replace(/[\.\-\s]/g, '') // Remover puntos, guiones, espacios
    .replace(/^0+/, ''); // Remover ceros iniciales

  return ci.length >= 6 && ci.length <= 8 ? ci : null;
}

/**
 * Parsear fecha flexible (dd/mm/yyyy, d/m/yyyy, dd/mm/yy)
 * y convertir a UTC asumiendo America/Montevideo
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr === '') return null;

  const formats = [
    'dd/MM/yyyy',
    'd/M/yyyy',
    'dd/MM/yy',
    'd/M/yy',
    'yyyy-MM-dd',
  ];

  for (const format of formats) {
    try {
      const parsed = parse(String(dateStr), format, new Date());

      if (isValid(parsed)) {
        // Convertir de America/Montevideo a UTC
        return zonedTimeToUtc(parsed, 'America/Montevideo');
      }
    } catch (error) {
      // Continuar con siguiente formato
    }
  }

  return null;
}

/**
 * Convertir SI/NO a boolean
 */
function siNoToBoolean(value) {
  if (value === null || value === undefined || value === '') return null;

  const str = String(value).toUpperCase().trim();

  if (str === 'SI' || str === 'SÍ' || str === 'YES' || str === '1' || str === 'TRUE') {
    return true;
  }

  if (str === 'NO' || str === '0' || str === 'FALSE') {
    return false;
  }

  return null;
}

/**
 * Parsear campo de equipo formato "CP: Nombre"
 * Retorna { cp, name } o null
 */
function parseTeamMember(value) {
  if (!value) return null;

  const match = String(value).match(/^(\d+):\s*(.+)$/);

  if (match) {
    return {
      cp: parseInt(match[1], 10),
      name: match[2].trim(),
    };
  }

  return null;
}

/**
 * Encontrar clínico similar por nombre (fuzzy matching)
 * Retorna el CP si encuentra match con similaridad > threshold
 */
function findSimilarClinician(name, clinicians, threshold = 0.8) {
  if (!name || clinicians.length === 0) return null;

  const normalized = name.toLowerCase().trim();
  const matches = stringSimilarity.findBestMatch(
    normalized,
    clinicians.map((c) => c.name.toLowerCase())
  );

  if (matches.bestMatch.rating >= threshold) {
    const index = matches.bestMatchIndex;
    return clinicians[index].id;
  }

  return null;
}

/**
 * Convertir número a entero (manejar notación científica de Excel)
 */
function safeInt(value) {
  if (value === null || value === undefined || value === '') return null;

  const num = Number(value);
  return isNaN(num) ? null : Math.floor(num);
}

/**
 * Convertir a float
 */
function safeFloat(value) {
  if (value === null || value === undefined || value === '') return null;

  const num = Number(value);
  return isNaN(num) ? null : num;
}

/**
 * Convertir string vacío a null
 */
function emptyToNull(value) {
  if (value === '' || value === undefined) return null;
  return value;
}

/**
 * Validar que un objeto no esté completamente vacío
 */
function isNotEmpty(obj) {
  return Object.values(obj).some((v) => v !== null && v !== undefined && v !== '');
}

module.exports = {
  normalizeCI,
  parseDate,
  siNoToBoolean,
  parseTeamMember,
  findSimilarClinician,
  safeInt,
  safeFloat,
  emptyToNull,
  isNotEmpty,
};
