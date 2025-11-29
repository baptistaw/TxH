// src/routes/analytics.js - Rutas de analíticas y KPIs de calidad
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');
const prisma = require('../lib/prisma');

// ============================================================================
// DATOS HISTÓRICOS MANUALES (del PDF de Gestión de Calidad)
// Tiempo cero de registro: 1 de enero de 2023
// Estos datos fueron recopilados manualmente antes de la implementación del sistema
// ============================================================================
const HISTORICAL_DATA = {
  // Fecha de inicio del registro manual
  startDate: new Date('2023-01-01'),

  // Datos anuales por indicador (del PDF de Gestión de Calidad)
  yearly: {
    2023: {
      totalTransplants: 14, // Basado en datos del PDF
      bloodReplacement: {
        rate: 92.8,
        applied: 13,
        notApplied: 1,
        notEvaluated: 0,
      },
      antibiotic: {
        rate: 87.7,
        applied: 12,
        notApplied: 2, // Estimado basado en el porcentaje
        notEvaluated: 0,
      },
      pdfSent: {
        rate: 100.0,
        sent: 14,
        notSent: 0,
      },
      // Fast Track no se registró en 2023
      fastTrack: null,
    },
    2024: {
      totalTransplants: 20, // Basado en datos del PDF
      bloodReplacement: {
        rate: 100.0,
        applied: 20,
        notApplied: 0,
        notEvaluated: 0,
      },
      antibiotic: {
        rate: 100.0,
        applied: 20,
        notApplied: 0,
        notEvaluated: 0,
      },
      pdfSent: {
        rate: 100.0,
        sent: 20,
        notSent: 0,
      },
      // Fast Track no se registró en 2024
      fastTrack: null,
    },
  },

  // Tendencia trimestral histórica (estimaciones basadas en los datos anuales)
  quarterly: {
    '2023-Q1': { total: 3, bloodReplacementRate: 92.8, antibioticRate: 87.7, pdfSentRate: 100.0 },
    '2023-Q2': { total: 4, bloodReplacementRate: 92.8, antibioticRate: 87.7, pdfSentRate: 100.0 },
    '2023-Q3': { total: 3, bloodReplacementRate: 92.8, antibioticRate: 87.7, pdfSentRate: 100.0 },
    '2023-Q4': { total: 4, bloodReplacementRate: 92.8, antibioticRate: 87.7, pdfSentRate: 100.0 },
    '2024-Q1': { total: 5, bloodReplacementRate: 100.0, antibioticRate: 100.0, pdfSentRate: 100.0 },
    '2024-Q2': { total: 5, bloodReplacementRate: 100.0, antibioticRate: 100.0, pdfSentRate: 100.0 },
    '2024-Q3': { total: 5, bloodReplacementRate: 100.0, antibioticRate: 100.0, pdfSentRate: 100.0 },
    '2024-Q4': { total: 5, bloodReplacementRate: 100.0, antibioticRate: 100.0, pdfSentRate: 100.0 },
  },
};

// Fecha de corte: cuando el sistema entró en producción (datos automáticos a partir de esta fecha)
// TODO: Actualizar esta fecha cuando el sistema entre en producción
const SYSTEM_PRODUCTION_DATE = null; // null = sistema aún no está en producción

/**
 * Determina si una fecha corresponde a datos históricos (manuales)
 */
function isHistoricalData(date) {
  if (!SYSTEM_PRODUCTION_DATE) return true; // Si no hay fecha de producción, todo es histórico
  return new Date(date) < SYSTEM_PRODUCTION_DATE;
}

/**
 * Obtiene los datos históricos para un año específico
 */
function getHistoricalYearData(year) {
  return HISTORICAL_DATA.yearly[year] || null;
}

// GET /api/analytics/kpis - Obtener indicadores de calidad
router.get('/kpis', authenticate, asyncHandler(async (req, res) => {
  const { year, startDate, endDate } = req.query;

  // Construir filtros de fecha
  let dateFilter = {};

  if (year) {
    const yearNum = parseInt(year);
    dateFilter = {
      startAt: {
        gte: new Date(`${yearNum}-01-01`),
        lt: new Date(`${yearNum + 1}-01-01`),
      }
    };
  } else if (startDate || endDate) {
    dateFilter = {
      startAt: {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      }
    };
  }

  // Obtener solo procedimientos de trasplante
  const transplants = await prisma.procedure.findMany({
    where: {
      procedureType: {
        in: ['TRASPLANTE_HEPATICO', 'RETRASPLANTE_HEPATICO']
      },
      ...dateFilter
    },
    select: {
      id: true,
      startAt: true,
      bloodReplacementProtocol: true,
      bloodReplacementProtocolReason: true,
      antibioticProphylaxisProtocol: true,
      antibioticProphylaxisProtocolReason: true,
      fastTrackProtocol: true,
      fastTrackProtocolReason: true,
      pdfSentByEmail: true,
      pdfSentAt: true,
    },
    orderBy: { startAt: 'asc' }
  });

  const totalTransplants = transplants.length;

  // Calcular indicadores
  // Objetivo 1: Protocolo de Reposición de Hemoderivados
  const bloodReplacementApplied = transplants.filter(t => t.bloodReplacementProtocol === true).length;
  const bloodReplacementNotApplied = transplants.filter(t => t.bloodReplacementProtocol === false).length;
  const bloodReplacementNotEvaluated = transplants.filter(t => t.bloodReplacementProtocol === null).length;

  // Objetivo 2: Protocolo de Profilaxis ATB
  const antibioticApplied = transplants.filter(t => t.antibioticProphylaxisProtocol === true).length;
  const antibioticNotApplied = transplants.filter(t => t.antibioticProphylaxisProtocol === false).length;
  const antibioticNotEvaluated = transplants.filter(t => t.antibioticProphylaxisProtocol === null).length;

  // Objetivo 3: Envío de PDF por email
  const pdfSent = transplants.filter(t => t.pdfSentByEmail === true).length;
  const pdfNotSent = transplants.filter(t => t.pdfSentByEmail === false || t.pdfSentByEmail === null).length;

  // Objetivo 5: Protocolo Fast Track
  const fastTrackApplied = transplants.filter(t => t.fastTrackProtocol === true).length;
  const fastTrackNotApplied = transplants.filter(t => t.fastTrackProtocol === false).length;
  const fastTrackNotEvaluated = transplants.filter(t => t.fastTrackProtocol === null).length;

  // Calcular tasas (sobre trasplantes evaluados)
  const calcRate = (applied, notApplied) => {
    const evaluated = applied + notApplied;
    return evaluated > 0 ? ((applied / evaluated) * 100).toFixed(1) : null;
  };

  // Preparar datos de tendencia por mes/trimestre
  const trendData = {};

  transplants.forEach(t => {
    if (!t.startAt) return;
    const date = new Date(t.startAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!trendData[monthKey]) {
      trendData[monthKey] = {
        month: monthKey,
        total: 0,
        bloodReplacement: { applied: 0, notApplied: 0, notEvaluated: 0 },
        antibiotic: { applied: 0, notApplied: 0, notEvaluated: 0 },
        pdfSent: { sent: 0, notSent: 0 },
        fastTrack: { applied: 0, notApplied: 0, notEvaluated: 0 },
      };
    }

    trendData[monthKey].total++;

    // Blood replacement
    if (t.bloodReplacementProtocol === true) trendData[monthKey].bloodReplacement.applied++;
    else if (t.bloodReplacementProtocol === false) trendData[monthKey].bloodReplacement.notApplied++;
    else trendData[monthKey].bloodReplacement.notEvaluated++;

    // Antibiotic
    if (t.antibioticProphylaxisProtocol === true) trendData[monthKey].antibiotic.applied++;
    else if (t.antibioticProphylaxisProtocol === false) trendData[monthKey].antibiotic.notApplied++;
    else trendData[monthKey].antibiotic.notEvaluated++;

    // PDF sent
    if (t.pdfSentByEmail === true) trendData[monthKey].pdfSent.sent++;
    else trendData[monthKey].pdfSent.notSent++;

    // Fast track
    if (t.fastTrackProtocol === true) trendData[monthKey].fastTrack.applied++;
    else if (t.fastTrackProtocol === false) trendData[monthKey].fastTrack.notApplied++;
    else trendData[monthKey].fastTrack.notEvaluated++;
  });

  // Convertir a array ordenado y calcular tasas
  const trendArray = Object.values(trendData)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(m => ({
      ...m,
      bloodReplacementRate: calcRate(m.bloodReplacement.applied, m.bloodReplacement.notApplied),
      antibioticRate: calcRate(m.antibiotic.applied, m.antibiotic.notApplied),
      pdfSentRate: m.total > 0 ? ((m.pdfSent.sent / m.total) * 100).toFixed(1) : null,
      fastTrackRate: calcRate(m.fastTrack.applied, m.fastTrack.notApplied),
    }));

  // Obtener razones de no cumplimiento
  const nonComplianceReasons = {
    bloodReplacement: transplants
      .filter(t => t.bloodReplacementProtocol === false && t.bloodReplacementProtocolReason)
      .map(t => t.bloodReplacementProtocolReason),
    antibiotic: transplants
      .filter(t => t.antibioticProphylaxisProtocol === false && t.antibioticProphylaxisProtocolReason)
      .map(t => t.antibioticProphylaxisProtocolReason),
    fastTrack: transplants
      .filter(t => t.fastTrackProtocol === false && t.fastTrackProtocolReason)
      .map(t => t.fastTrackProtocolReason),
  };

  // Determinar si usar datos históricos o del sistema
  const yearNum = year ? parseInt(year) : null;
  const historicalData = yearNum ? getHistoricalYearData(yearNum) : null;

  // Si no hay filtro y sistema no está en producción, combinar datos históricos de todos los años
  let combinedHistoricalData = null;
  if (!year && !startDate && !endDate && !SYSTEM_PRODUCTION_DATE) {
    // Combinar datos de 2023 y 2024
    const data2023 = HISTORICAL_DATA.yearly[2023];
    const data2024 = HISTORICAL_DATA.yearly[2024];
    if (data2023 && data2024) {
      const totalTx = data2023.totalTransplants + data2024.totalTransplants;
      combinedHistoricalData = {
        totalTransplants: totalTx,
        bloodReplacement: {
          applied: data2023.bloodReplacement.applied + data2024.bloodReplacement.applied,
          notApplied: data2023.bloodReplacement.notApplied + data2024.bloodReplacement.notApplied,
          notEvaluated: 0,
          rate: ((data2023.bloodReplacement.applied + data2024.bloodReplacement.applied) / totalTx * 100),
        },
        antibiotic: {
          applied: data2023.antibiotic.applied + data2024.antibiotic.applied,
          notApplied: data2023.antibiotic.notApplied + data2024.antibiotic.notApplied,
          notEvaluated: 0,
          rate: ((data2023.antibiotic.applied + data2024.antibiotic.applied) / totalTx * 100),
        },
        pdfSent: {
          sent: data2023.pdfSent.sent + data2024.pdfSent.sent,
          notSent: data2023.pdfSent.notSent + data2024.pdfSent.notSent,
          rate: ((data2023.pdfSent.sent + data2024.pdfSent.sent) / totalTx * 100),
        },
      };
    }
  }

  const useHistoricalData = (historicalData && (yearNum === 2023 || yearNum === 2024) && !SYSTEM_PRODUCTION_DATE) || combinedHistoricalData;

  // Si hay datos históricos para el año seleccionado, usarlos para los primeros 3 indicadores
  let finalIndicators;
  let dataSource;

  if (useHistoricalData) {
    // Usar datos históricos (manuales) del PDF - ya sea de un año o combinados
    const dataToUse = combinedHistoricalData || historicalData;
    const isCombined = !!combinedHistoricalData;

    dataSource = {
      type: 'manual',
      description: isCombined
        ? 'Datos históricos combinados (2023-2024)'
        : 'Datos recopilados manualmente del sistema anterior',
      note: isCombined
        ? 'Datos acumulados de los años 2023 y 2024 (tiempo cero: 1/1/2023)'
        : 'Estos datos fueron extraídos del PDF de Gestión de Calidad (tiempo cero: 1/1/2023)',
    };

    finalIndicators = {
      // Objetivo 1: Protocolo de Reposición (datos históricos)
      bloodReplacementProtocol: {
        name: 'Protocolo de Reposición de Hemoderivados',
        objective: 'Objetivo 1',
        target: 80,
        applied: dataToUse.bloodReplacement.applied,
        notApplied: dataToUse.bloodReplacement.notApplied,
        notEvaluated: dataToUse.bloodReplacement.notEvaluated || 0,
        rate: dataToUse.bloodReplacement.rate.toFixed(1),
        totalEvaluated: dataToUse.bloodReplacement.applied + dataToUse.bloodReplacement.notApplied,
        dataSource: 'manual',
      },
      // Objetivo 2: Protocolo de Profilaxis ATB (datos históricos)
      antibioticProphylaxis: {
        name: 'Protocolo de Profilaxis Antibiótica',
        objective: 'Objetivo 2',
        target: 100,
        applied: dataToUse.antibiotic.applied,
        notApplied: dataToUse.antibiotic.notApplied,
        notEvaluated: dataToUse.antibiotic.notEvaluated || 0,
        rate: dataToUse.antibiotic.rate.toFixed(1),
        totalEvaluated: dataToUse.antibiotic.applied + dataToUse.antibiotic.notApplied,
        dataSource: 'manual',
      },
      // Objetivo 3: Envío de PDF (datos históricos)
      pdfEmailSent: {
        name: 'Registro y Envío de Ficha Anestésica',
        objective: 'Objetivo 3',
        target: 100,
        sent: dataToUse.pdfSent.sent,
        notSent: dataToUse.pdfSent.notSent,
        rate: dataToUse.pdfSent.rate.toFixed(1),
        totalEvaluated: dataToUse.totalTransplants,
        dataSource: 'manual',
      },
      // Objetivo 5: Fast Track (no hay datos históricos - comienza con producción)
      fastTrackProtocol: {
        name: 'Protocolo de Extubación Temprana (Fast Track)',
        objective: 'Objetivo 5',
        target: 70,
        applied: 0,
        notApplied: 0,
        notEvaluated: 0,
        rate: null,
        totalEvaluated: 0,
        dataSource: 'pending',
        note: 'Este indicador comenzará a registrarse cuando el sistema entre en producción',
      },
    };
  } else {
    // Usar datos del sistema (automáticos)
    dataSource = {
      type: SYSTEM_PRODUCTION_DATE ? 'automated' : 'pending',
      description: SYSTEM_PRODUCTION_DATE
        ? 'Datos capturados automáticamente por el sistema'
        : 'Sistema aún no en producción - mostrando datos históricos disponibles',
    };

    finalIndicators = {
      // Objetivo 1: Protocolo de Reposición
      bloodReplacementProtocol: {
        name: 'Protocolo de Reposición de Hemoderivados',
        objective: 'Objetivo 1',
        target: 80,
        applied: bloodReplacementApplied,
        notApplied: bloodReplacementNotApplied,
        notEvaluated: bloodReplacementNotEvaluated,
        rate: calcRate(bloodReplacementApplied, bloodReplacementNotApplied),
        totalEvaluated: bloodReplacementApplied + bloodReplacementNotApplied,
        dataSource: SYSTEM_PRODUCTION_DATE ? 'automated' : 'none',
      },
      // Objetivo 2: Protocolo de Profilaxis ATB
      antibioticProphylaxis: {
        name: 'Protocolo de Profilaxis Antibiótica',
        objective: 'Objetivo 2',
        target: 100,
        applied: antibioticApplied,
        notApplied: antibioticNotApplied,
        notEvaluated: antibioticNotEvaluated,
        rate: calcRate(antibioticApplied, antibioticNotApplied),
        totalEvaluated: antibioticApplied + antibioticNotApplied,
        dataSource: SYSTEM_PRODUCTION_DATE ? 'automated' : 'none',
      },
      // Objetivo 3: Envío de PDF
      pdfEmailSent: {
        name: 'Registro y Envío de Ficha Anestésica',
        objective: 'Objetivo 3',
        target: 100,
        sent: pdfSent,
        notSent: pdfNotSent,
        rate: totalTransplants > 0 ? ((pdfSent / totalTransplants) * 100).toFixed(1) : null,
        totalEvaluated: totalTransplants,
        dataSource: SYSTEM_PRODUCTION_DATE ? 'automated' : 'none',
      },
      // Objetivo 5: Fast Track
      fastTrackProtocol: {
        name: 'Protocolo de Extubación Temprana (Fast Track)',
        objective: 'Objetivo 5',
        target: 70,
        applied: fastTrackApplied,
        notApplied: fastTrackNotApplied,
        notEvaluated: fastTrackNotEvaluated,
        rate: calcRate(fastTrackApplied, fastTrackNotApplied),
        totalEvaluated: fastTrackApplied + fastTrackNotApplied,
        dataSource: SYSTEM_PRODUCTION_DATE ? 'automated' : 'pending',
        note: !SYSTEM_PRODUCTION_DATE ? 'Este indicador comenzará a registrarse cuando el sistema entre en producción' : undefined,
      },
    };
  }

  // Preparar datos de tendencia histórica si corresponde
  let historicalTrend = [];
  if (!SYSTEM_PRODUCTION_DATE) {
    // Agregar tendencia trimestral histórica
    historicalTrend = Object.entries(HISTORICAL_DATA.quarterly).map(([quarter, data]) => ({
      period: quarter,
      periodType: 'quarter',
      total: data.total,
      bloodReplacementRate: data.bloodReplacementRate?.toFixed(1) || null,
      antibioticRate: data.antibioticRate?.toFixed(1) || null,
      pdfSentRate: data.pdfSentRate?.toFixed(1) || null,
      fastTrackRate: null, // No hay datos históricos
      dataSource: 'manual',
    }));
  }

  // Determinar totales y rango de fechas para el summary
  const summaryTotalTransplants = useHistoricalData
    ? (combinedHistoricalData ? combinedHistoricalData.totalTransplants : historicalData.totalTransplants)
    : totalTransplants;

  const summaryDateRange = useHistoricalData
    ? (combinedHistoricalData
        ? { start: new Date('2023-01-01'), end: new Date('2024-12-31') }
        : { start: new Date(`${yearNum}-01-01`), end: new Date(`${yearNum}-12-31`) })
    : { start: transplants[0]?.startAt || null, end: transplants[transplants.length - 1]?.startAt || null };

  res.json({
    summary: {
      totalTransplants: summaryTotalTransplants,
      dateRange: summaryDateRange,
      dataSource,
    },
    indicators: finalIndicators,
    trend: trendArray,
    historicalTrend,
    nonComplianceReasons,
    // Información sobre años disponibles con datos históricos
    availableHistoricalYears: Object.keys(HISTORICAL_DATA.yearly).map(Number),
    systemProductionDate: SYSTEM_PRODUCTION_DATE,
  });
}));

// GET /api/analytics/clinical - KPIs clínicos adicionales
router.get('/clinical', authenticate, asyncHandler(async (req, res) => {
  const { year, startDate, endDate } = req.query;

  // Construir filtros de fecha para trasplantes
  let dateFilter = {};
  if (year) {
    const yearNum = parseInt(year);
    dateFilter = {
      startAt: {
        gte: new Date(`${yearNum}-01-01`),
        lt: new Date(`${yearNum + 1}-01-01`),
      }
    };
  } else if (startDate || endDate) {
    dateFilter = {
      startAt: {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      }
    };
  }

  // ============================================================================
  // 1. ESTADÍSTICAS DE TRASPLANTES
  // ============================================================================

  // Obtener casos de trasplante con datos completos
  const transplantCases = await prisma.transplantCase.findMany({
    where: dateFilter,
    include: {
      patient: {
        select: {
          id: true,
          birthDate: true,
          sex: true,
          bloodGroup: true,
          admissionDate: true,
        }
      },
      preops: {
        orderBy: { evaluationDate: 'desc' },
        take: 1,
        select: {
          meld: true,
          meldNa: true,
          child: true,
          etiology1: true,
          etiology2: true,
        }
      }
    },
    orderBy: { startAt: 'asc' }
  });

  const totalTransplants = transplantCases.length;

  // Calcular métricas de trasplante
  const retransplants = transplantCases.filter(c => c.isRetransplant).length;
  const hepatoRenal = transplantCases.filter(c => c.isHepatoRenal).length;

  // Tiempos de isquemia (solo casos con datos válidos)
  // Isquemia fría: típicamente 6-12 horas, máximo razonable 24 horas (1440 min)
  const coldIschemiaValues = transplantCases
    .filter(c => c.coldIschemiaTime && c.coldIschemiaTime > 0 && c.coldIschemiaTime <= 1440)
    .map(c => c.coldIschemiaTime);
  // Isquemia caliente: típicamente 30-60 min, máximo razonable 180 min (3 horas)
  const warmIschemiaValues = transplantCases
    .filter(c => c.warmIschemiaTime && c.warmIschemiaTime > 0 && c.warmIschemiaTime <= 180)
    .map(c => c.warmIschemiaTime);

  // Duración de cirugía (filtrar outliers: entre 1 y 14 horas)
  const durationValues = transplantCases
    .filter(c => c.duration && c.duration >= 60 && c.duration <= 840)
    .map(c => c.duration);

  // ============================================================================
  // 2. DEMOGRAFÍA
  // ============================================================================

  // Calcular edades al momento del trasplante
  const agesAtTransplant = transplantCases
    .filter(c => c.patient?.birthDate && c.startAt)
    .map(c => {
      const txDate = new Date(c.startAt);
      const birth = new Date(c.patient.birthDate);
      let age = txDate.getFullYear() - birth.getFullYear();
      const monthDiff = txDate.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && txDate.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    })
    .filter(a => a > 0 && a < 120); // Filtrar valores inválidos

  // Distribución por sexo
  const sexDistribution = {};
  transplantCases.forEach(c => {
    const sex = c.patient?.sex || 'NO_ESPECIFICADO';
    sexDistribution[sex] = (sexDistribution[sex] || 0) + 1;
  });

  // Distribución por grupo sanguíneo
  const bloodGroupDistribution = {};
  transplantCases.forEach(c => {
    const bg = c.patient?.bloodGroup || 'NO_CLASIFICADO';
    bloodGroupDistribution[bg] = (bloodGroupDistribution[bg] || 0) + 1;
  });

  // ============================================================================
  // 3. SEVERIDAD (MELD y Child-Pugh)
  // ============================================================================

  const meldValues = transplantCases
    .filter(c => c.preops?.[0]?.meld && c.preops[0].meld > 0)
    .map(c => c.preops[0].meld);

  const meldNaValues = transplantCases
    .filter(c => c.preops?.[0]?.meldNa && c.preops[0].meldNa > 0)
    .map(c => c.preops[0].meldNa);

  // Distribución Child-Pugh
  const childDistribution = { A: 0, B: 0, C: 0, NO_EVALUADO: 0 };
  transplantCases.forEach(c => {
    const child = c.preops?.[0]?.child;
    if (child && ['A', 'B', 'C'].includes(child.toUpperCase())) {
      childDistribution[child.toUpperCase()]++;
    } else {
      childDistribution.NO_EVALUADO++;
    }
  });

  // ============================================================================
  // 4. ETIOLOGÍAS
  // ============================================================================

  const etiologyCount = {};
  transplantCases.forEach(c => {
    const preop = c.preops?.[0];
    if (preop?.etiology1) {
      etiologyCount[preop.etiology1] = (etiologyCount[preop.etiology1] || 0) + 1;
    }
    if (preop?.etiology2) {
      etiologyCount[preop.etiology2] = (etiologyCount[preop.etiology2] || 0) + 1;
    }
  });

  // Top 10 etiologías
  const topEtiologies = Object.entries(etiologyCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count, percentage: ((count / totalTransplants) * 100).toFixed(1) }));

  // ============================================================================
  // 5. LISTA DE ESPERA (último año)
  // ============================================================================

  // Fecha hace 1 año
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  // Pacientes ingresados a lista en el último año
  const patientsAddedLastYear = await prisma.patient.count({
    where: {
      admissionDate: {
        gte: oneYearAgo
      }
    }
  });

  // Pacientes trasplantados en el último año
  const patientsTransplantedLastYear = await prisma.patient.count({
    where: {
      transplanted: true,
      cases: {
        some: {
          startAt: {
            gte: oneYearAgo
          }
        }
      }
    }
  });

  // Total de pacientes trasplantados (histórico)
  const totalPatientsTransplanted = await prisma.patient.count({
    where: { transplanted: true }
  });

  // Pacientes en lista de espera (ingresaron en el último año y no se trasplantaron aún)
  const patientsInList = await prisma.patient.count({
    where: {
      transplanted: false,
      admissionDate: { gte: oneYearAgo }
    }
  });

  // Tiempo promedio en lista para pacientes trasplantados EN EL ÚLTIMO AÑO
  const waitingTimeData = await prisma.patient.findMany({
    where: {
      transplanted: true,
      admissionDate: { not: null },
      cases: {
        some: {
          startAt: { gte: oneYearAgo }
        }
      }
    },
    select: {
      admissionDate: true,
      cases: {
        where: { startAt: { gte: oneYearAgo } },
        orderBy: { startAt: 'asc' },
        take: 1,
        select: { startAt: true }
      }
    }
  });

  const waitingDays = waitingTimeData
    .filter(p => p.admissionDate && p.cases?.[0]?.startAt)
    .map(p => {
      const admission = new Date(p.admissionDate);
      const txDate = new Date(p.cases[0].startAt);
      return Math.floor((txDate - admission) / (1000 * 60 * 60 * 24));
    })
    .filter(d => d >= 0);

  // ============================================================================
  // 6. TENDENCIA POR AÑO
  // ============================================================================

  const yearlyTrend = {};
  transplantCases.forEach(c => {
    if (!c.startAt) return;
    const yr = new Date(c.startAt).getFullYear();
    if (!yearlyTrend[yr]) {
      yearlyTrend[yr] = {
        year: yr,
        total: 0,
        retransplants: 0,
        hepatoRenal: 0,
        meldSum: 0,
        meldCount: 0,
      };
    }
    yearlyTrend[yr].total++;
    if (c.isRetransplant) yearlyTrend[yr].retransplants++;
    if (c.isHepatoRenal) yearlyTrend[yr].hepatoRenal++;
    if (c.preops?.[0]?.meld) {
      yearlyTrend[yr].meldSum += c.preops[0].meld;
      yearlyTrend[yr].meldCount++;
    }
  });

  // Calcular promedios y porcentajes
  const yearlyData = Object.values(yearlyTrend)
    .sort((a, b) => a.year - b.year)
    .map(y => ({
      year: y.year,
      total: y.total,
      retransplants: y.retransplants,
      retransplantRate: y.total > 0 ? ((y.retransplants / y.total) * 100).toFixed(1) : 0,
      hepatoRenal: y.hepatoRenal,
      hepatoRenalRate: y.total > 0 ? ((y.hepatoRenal / y.total) * 100).toFixed(1) : 0,
      avgMeld: y.meldCount > 0 ? (y.meldSum / y.meldCount).toFixed(1) : null,
    }));

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const calcAverage = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const calcMedian = (arr) => {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  const calcMin = (arr) => arr.length > 0 ? Math.min(...arr) : null;
  const calcMax = (arr) => arr.length > 0 ? Math.max(...arr) : null;

  // ============================================================================
  // RESPONSE
  // ============================================================================

  res.json({
    summary: {
      totalTransplants,
      totalPatientsTransplanted,
      patientsInList,
      patientsAddedLastYear,
      patientsTransplantedLastYear,
      dateRange: {
        start: transplantCases[0]?.startAt || null,
        end: transplantCases[transplantCases.length - 1]?.startAt || null,
      },
    },
    transplantMetrics: {
      retransplants: {
        count: retransplants,
        rate: totalTransplants > 0 ? ((retransplants / totalTransplants) * 100).toFixed(1) : 0,
      },
      hepatoRenal: {
        count: hepatoRenal,
        rate: totalTransplants > 0 ? ((hepatoRenal / totalTransplants) * 100).toFixed(1) : 0,
      },
      duration: {
        avg: durationValues.length > 0 ? calcAverage(durationValues).toFixed(0) : null,
        median: durationValues.length > 0 ? calcMedian(durationValues).toFixed(0) : null,
        min: calcMin(durationValues),
        max: calcMax(durationValues),
        count: durationValues.length,
        // En horas para mejor visualización
        avgHours: durationValues.length > 0 ? (calcAverage(durationValues) / 60).toFixed(1) : null,
      },
      coldIschemia: {
        avg: coldIschemiaValues.length > 0 ? calcAverage(coldIschemiaValues).toFixed(0) : null,
        median: coldIschemiaValues.length > 0 ? calcMedian(coldIschemiaValues).toFixed(0) : null,
        min: calcMin(coldIschemiaValues),
        max: calcMax(coldIschemiaValues),
        count: coldIschemiaValues.length,
        // En horas
        avgHours: coldIschemiaValues.length > 0 ? (calcAverage(coldIschemiaValues) / 60).toFixed(1) : null,
      },
      warmIschemia: {
        avg: warmIschemiaValues.length > 0 ? calcAverage(warmIschemiaValues).toFixed(0) : null,
        median: warmIschemiaValues.length > 0 ? calcMedian(warmIschemiaValues).toFixed(0) : null,
        min: calcMin(warmIschemiaValues),
        max: calcMax(warmIschemiaValues),
        count: warmIschemiaValues.length,
      },
    },
    demographics: {
      age: {
        avg: agesAtTransplant.length > 0 ? calcAverage(agesAtTransplant).toFixed(1) : null,
        median: agesAtTransplant.length > 0 ? calcMedian(agesAtTransplant).toFixed(0) : null,
        min: calcMin(agesAtTransplant),
        max: calcMax(agesAtTransplant),
        count: agesAtTransplant.length,
      },
      sex: {
        M: sexDistribution.M || 0,
        F: sexDistribution.F || 0,
        O: sexDistribution.O || 0,
        noData: sexDistribution.NO_ESPECIFICADO || 0,
      },
      bloodGroup: bloodGroupDistribution,
    },
    severity: {
      meld: {
        avg: meldValues.length > 0 ? calcAverage(meldValues).toFixed(1) : null,
        median: meldValues.length > 0 ? calcMedian(meldValues).toFixed(0) : null,
        min: calcMin(meldValues),
        max: calcMax(meldValues),
        count: meldValues.length,
      },
      meldNa: {
        avg: meldNaValues.length > 0 ? calcAverage(meldNaValues).toFixed(1) : null,
        median: meldNaValues.length > 0 ? calcMedian(meldNaValues).toFixed(0) : null,
        min: calcMin(meldNaValues),
        max: calcMax(meldNaValues),
        count: meldNaValues.length,
      },
      childPugh: childDistribution,
    },
    etiologies: topEtiologies,
    waitingList: {
      // KPIs del último año (ventana móvil de 12 meses)
      addedLastYear: patientsAddedLastYear,
      transplantedLastYear: patientsTransplantedLastYear,
      // Tiempo en lista (para pacientes trasplantados)
      avgWaitingDays: waitingDays.length > 0 ? calcAverage(waitingDays).toFixed(0) : null,
      medianWaitingDays: waitingDays.length > 0 ? calcMedian(waitingDays).toFixed(0) : null,
      minWaitingDays: calcMin(waitingDays),
      maxWaitingDays: calcMax(waitingDays),
      dataCount: waitingDays.length,
      note: 'Datos de lista de espera del último año (ventana móvil). No incluye salidas por fallecimiento u otras causas.',
    },
    yearlyTrend: yearlyData,
  });
}));

// GET /api/analytics/kpis/years - Obtener años disponibles para filtro
router.get('/kpis/years', authenticate, asyncHandler(async (req, res) => {
  // Años con datos en la base de datos
  const dbYears = await prisma.$queryRaw`
    SELECT DISTINCT EXTRACT(YEAR FROM "startAt") as year
    FROM procedures
    WHERE "procedureType" IN ('TRASPLANTE_HEPATICO', 'RETRASPLANTE_HEPATICO')
      AND "startAt" IS NOT NULL
    ORDER BY year DESC
  `;

  const systemYears = dbYears.map(y => parseInt(y.year));

  // Combinar con años históricos
  const historicalYears = Object.keys(HISTORICAL_DATA.yearly).map(Number);
  const allYears = [...new Set([...historicalYears, ...systemYears])].sort((a, b) => b - a);

  res.json({
    years: allYears,
    historicalYears,
    systemYears,
    systemProductionDate: SYSTEM_PRODUCTION_DATE,
  });
}));

module.exports = router;
