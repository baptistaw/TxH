// ci-validator.js
// Validación y normalización de Cédulas de Identidad uruguayas

/**
 * Calcula el dígito verificador de una CI uruguaya
 * @param {string} ciSinDV - CI de 7 dígitos sin dígito verificador
 * @returns {number} Dígito verificador (0-9)
 */
function calcularDigitoVerificador(ciSinDV) {
  // Validación básica
  if (!ciSinDV || typeof ciSinDV !== 'string') {
    throw new Error('CI debe ser un string');
  }

  const ciLimpia = ciSinDV.replace(/[^\d]/g, '');

  if (ciLimpia.length !== 7) {
    throw new Error(`CI debe tener exactamente 7 dígitos, tiene ${ciLimpia.length}`);
  }

  // Coeficientes fijos establecidos por el algoritmo uruguayo
  const coeficientes = [2, 9, 8, 7, 6, 3, 4];

  // Cálculo del total ponderado
  const suma = ciLimpia.split('').reduce((acc, digito, index) => {
    return acc + (parseInt(digito) * coeficientes[index]);
  }, 0);

  // Obtención del dígito verificador con regla de módulo 10
  const resto = suma % 10;
  const dv = (10 - resto) % 10;

  return dv;
}

/**
 * Valida si una CI tiene el dígito verificador correcto
 * @param {string} ci - CI completa (con o sin guión)
 * @returns {Object} { valid: boolean, calculatedDV: number, providedDV: number|null }
 */
function validarCI(ci) {
  if (!ci || typeof ci !== 'string') {
    return { valid: false, error: 'CI inválida' };
  }

  // Limpiar la CI de puntos, guiones y espacios
  const ciLimpia = ci.replace(/[-.\s]/g, '');

  // Si tiene 6 dígitos, es SOSPECHOSO - probablemente faltan los últimos 2 dígitos
  // Las CIs uruguayas se otorgan correlativamente, números tan bajos indican error de transcripción
  if (ciLimpia.length === 6) {
    return {
      valid: false,
      error: `CI de 6 dígitos es sospechosa - probablemente faltan los últimos 2 dígitos (${ciLimpia})`
    };
  }

  // Si tiene 7 dígitos, no tiene DV
  if (ciLimpia.length === 7) {
    const dvCalculado = calcularDigitoVerificador(ciLimpia);
    return {
      valid: false,
      missingDV: true,
      calculatedDV: dvCalculado,
      providedDV: null,
      correctedCI: `${ciLimpia}-${dvCalculado}`
    };
  }

  // Si tiene 8 dígitos, tiene DV
  if (ciLimpia.length === 8) {
    const ciBase = ciLimpia.substring(0, 7);
    const dvProvisto = parseInt(ciLimpia.substring(7, 8));
    const dvCalculado = calcularDigitoVerificador(ciBase);

    return {
      valid: dvProvisto === dvCalculado,
      missingDV: false,
      calculatedDV: dvCalculado,
      providedDV: dvProvisto,
      correctedCI: `${ciBase}-${dvCalculado}`,
      originalCI: `${ciBase}-${dvProvisto}`
    };
  }

  return {
    valid: false,
    error: `Longitud inválida: ${ciLimpia.length} dígitos (debe ser 7 u 8)`
  };
}

/**
 * Normaliza una CI al formato correcto con dígito verificador
 * @param {string} ci - CI raw del Excel
 * @returns {Object} { ci: string (normalizada), ciRaw: string, suspicious: boolean, reason: string }
 */
function normalizarCI(ci) {
  if (!ci || ci === 'undefined' || ci === '') {
    return {
      ci: null,
      ciRaw: ci,
      suspicious: true,
      reason: 'CI vacía o undefined'
    };
  }

  // Manejar caso especial: "CI: timestamp"
  const ciStr = String(ci);
  let ciProcesar = ciStr;

  if (ciStr.includes(':')) {
    ciProcesar = ciStr.split(':')[0].trim();
  }

  const validacion = validarCI(ciProcesar);

  // Caso 1: CI sin DV (7 dígitos) - agregar DV calculado
  if (validacion.missingDV && validacion.correctedCI && typeof validacion.correctedCI === 'string') {
    return {
      ci: validacion.correctedCI.replace('-', ''),
      ciRaw: ciStr,
      ciFormatted: validacion.correctedCI,
      suspicious: false,
      reason: 'DV agregado automáticamente'
    };
  }

  // Caso 2: CI con DV que coincide
  if (validacion.valid && validacion.correctedCI && typeof validacion.correctedCI === 'string') {
    return {
      ci: validacion.correctedCI.replace('-', ''),
      ciRaw: ciStr,
      ciFormatted: validacion.correctedCI,
      suspicious: false,
      reason: 'DV correcto'
    };
  }

  // Caso 3: CI con DV que NO coincide - sospechoso
  if (validacion.providedDV !== null && !validacion.valid && validacion.correctedCI && typeof validacion.correctedCI === 'string') {
    return {
      ci: validacion.correctedCI.replace('-', ''),
      ciRaw: ciStr,
      ciFormatted: validacion.correctedCI,
      suspicious: true,
      reason: `DV incorrecto: provisto=${validacion.providedDV}, calculado=${validacion.calculatedDV}`
    };
  }

  // Caso 4: Error en validación
  return {
    ci: null,
    ciRaw: ciStr,
    suspicious: true,
    reason: validacion.error || 'Error desconocido en validación'
  };
}

module.exports = {
  calcularDigitoVerificador,
  validarCI,
  normalizarCI
};

// Pruebas si se ejecuta directamente
if (require.main === module) {
  console.log('=== PRUEBAS DE VALIDACIÓN DE CI ===\n');

  const casos = [
    '4572863',      // Sin DV
    '45728634',     // Con DV correcto
    '45728635',     // Con DV incorrecto
    '1234567-8',    // Con guión y DV correcto
    '3282071',      // Daniel Picón (sin DV)
    '33263073',     // Robert Guillen (sin DV)
  ];

  casos.forEach(ci => {
    console.log(`CI: ${ci}`);
    const resultado = normalizarCI(ci);
    console.log('  Resultado:', resultado);
    console.log('');
  });
}
