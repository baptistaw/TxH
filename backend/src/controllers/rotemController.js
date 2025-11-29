/**
 * Controlador para el Sistema de Asistencia ROTEM
 */

const rotemAlgorithmService = require('../services/rotemAlgorithmService');
const prisma = require('../lib/prisma');

/**
 * Obtiene recomendaciones basadas en datos ROTEM y contexto clínico
 * POST /api/rotem/recommendations
 */
async function getRecommendations(req, res, next) {
  try {
    const {
      // Datos ROTEM
      rotemCtExtem,
      rotemCftExtem,
      rotemA5Extem,
      rotemA10Extem,
      rotemMcfExtem,
      rotemCli30,
      rotemCli60,
      rotemMl,
      rotemCtFibtem,
      rotemA5Fibtem,
      rotemA10Fibtem,
      rotemMcfFibtem,
      rotemCtIntem,
      rotemCtHeptem,
      rotemA5Aptem,

      // Fase quirúrgica
      phase,

      // Contexto clínico requerido para el algoritmo
      clinicalContext,
    } = req.body;

    // Validar que se proporcionen datos mínimos
    if (!phase) {
      return res.status(400).json({
        error: 'Se requiere especificar la fase quirúrgica',
      });
    }

    // Construir objeto de datos ROTEM
    const rotemData = {
      rotemCtExtem: rotemCtExtem ?? null,
      rotemCftExtem: rotemCftExtem ?? null,
      rotemA5Extem: rotemA5Extem ?? null,
      rotemA10Extem: rotemA10Extem ?? null,
      rotemMcfExtem: rotemMcfExtem ?? null,
      rotemCli30: rotemCli30 ?? null,
      rotemCli60: rotemCli60 ?? null,
      rotemMl: rotemMl ?? null,
      rotemCtFibtem: rotemCtFibtem ?? null,
      rotemA5Fibtem: rotemA5Fibtem ?? null,
      rotemA10Fibtem: rotemA10Fibtem ?? null,
      rotemMcfFibtem: rotemMcfFibtem ?? null,
      rotemCtIntem: rotemCtIntem ?? null,
      rotemCtHeptem: rotemCtHeptem ?? null,
      rotemA5Aptem: rotemA5Aptem ?? null,
      phase,
    };

    // Valores por defecto para contexto clínico
    const context = {
      // Datos del paciente
      weight: clinicalContext?.weight || 70,

      // Estado clínico
      hasActiveBleeeding: clinicalContext?.hasActiveBleeeding ?? false,
      anticipatedBleeding: clinicalContext?.anticipatedBleeding ?? false,
      refractoryBleeding: clinicalContext?.refractoryBleeding ?? false,
      suspectedPlateletDysfunction: clinicalContext?.suspectedPlateletDysfunction ?? false,

      // Condiciones previas (de laboratorio)
      pH: clinicalContext?.pH ?? null,
      temperature: clinicalContext?.temperature ?? null,
      ionicCalcium: clinicalContext?.ionicCalcium ?? null,
      hemoglobin: clinicalContext?.hemoglobin ?? null,

      // Contraindicaciones para antifibrinolíticos
      contraindications: {
        previousThrombosis: clinicalContext?.contraindications?.previousThrombosis ?? false,
        hepaticMalignancy: clinicalContext?.contraindications?.hepaticMalignancy ?? false,
        chronicBiliaryInflammation: clinicalContext?.contraindications?.chronicBiliaryInflammation ?? false,
      },

      // Disponibilidad de recursos
      ccpAvailable: clinicalContext?.ccpAvailable ?? true,
    };

    // Ejecutar el algoritmo
    const evaluation = rotemAlgorithmService.runRotemAlgorithm(rotemData, context);

    res.json({
      success: true,
      evaluation,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtiene los umbrales y constantes del algoritmo
 * GET /api/rotem/thresholds
 */
async function getThresholds(req, res, next) {
  try {
    res.json({
      success: true,
      thresholds: rotemAlgorithmService.THRESHOLDS,
      phases: rotemAlgorithmService.SURGICAL_PHASES,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtiene historial de registros ROTEM para un caso
 * GET /api/rotem/history/:caseId
 */
async function getRotemHistory(req, res, next) {
  try {
    const { caseId } = req.params;
    const { phase } = req.query;

    const where = {
      caseId,
      // Solo registros que tengan al menos un dato ROTEM
      OR: [
        { rotemCtExtem: { not: null } },
        { rotemA5Extem: { not: null } },
        { rotemA5Fibtem: { not: null } },
        { rotemCtIntem: { not: null } },
      ],
    };

    if (phase) {
      where.phase = phase;
    }

    const records = await prisma.intraopRecord.findMany({
      where,
      select: {
        id: true,
        phase: true,
        timestamp: true,
        // EXTEM
        rotemCtExtem: true,
        rotemCftExtem: true,
        rotemA5Extem: true,
        rotemA10Extem: true,
        rotemMcfExtem: true,
        rotemCli30: true,
        rotemCli60: true,
        rotemMl: true,
        // FIBTEM
        rotemCtFibtem: true,
        rotemA5Fibtem: true,
        rotemA10Fibtem: true,
        rotemMcfFibtem: true,
        // INTEM/HEPTEM
        rotemCtIntem: true,
        rotemCtHeptem: true,
        // APTEM
        rotemA5Aptem: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    res.json({
      success: true,
      records,
      count: records.length,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtiene el último registro ROTEM con datos de laboratorio relevantes
 * GET /api/rotem/latest/:caseId
 */
async function getLatestRotemWithLabs(req, res, next) {
  try {
    const { caseId } = req.params;

    // Obtener el último registro ROTEM
    const latestRotem = await prisma.intraopRecord.findFirst({
      where: {
        caseId,
        OR: [
          { rotemCtExtem: { not: null } },
          { rotemA5Extem: { not: null } },
          { rotemA5Fibtem: { not: null } },
        ],
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // Obtener el último registro con datos de laboratorio relevantes
    const latestLabs = await prisma.intraopRecord.findFirst({
      where: {
        caseId,
        OR: [
          { pH: { not: null } },
          { ionicCalcium: { not: null } },
          { hb: { not: null } },
          { temp: { not: null } },
        ],
      },
      select: {
        pH: true,
        ionicCalcium: true,
        hb: true,
        temp: true,
        timestamp: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // Obtener datos del caso para el peso del paciente
    const caseData = await prisma.transplantCase.findUnique({
      where: { id: caseId },
      include: {
        patient: {
          select: {
            weight: true,
          },
        },
      },
    });

    res.json({
      success: true,
      latestRotem,
      latestLabs,
      patientWeight: caseData?.patient?.weight || null,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Analiza tendencia de parámetros ROTEM
 * GET /api/rotem/trend/:caseId
 */
async function getRotemTrend(req, res, next) {
  try {
    const { caseId } = req.params;
    const { parameter } = req.query; // ej: 'a5Extem', 'a5Fibtem', 'cli30'

    const records = await prisma.intraopRecord.findMany({
      where: {
        caseId,
        [`rotem${parameter.charAt(0).toUpperCase() + parameter.slice(1)}`]: { not: null },
      },
      select: {
        timestamp: true,
        phase: true,
        [`rotem${parameter.charAt(0).toUpperCase() + parameter.slice(1)}`]: true,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    // Calcular tendencia
    let trend = 'stable';
    if (records.length >= 2) {
      const values = records.map(r => r[`rotem${parameter.charAt(0).toUpperCase() + parameter.slice(1)}`]);
      const lastValue = values[values.length - 1];
      const previousValue = values[values.length - 2];
      const change = ((lastValue - previousValue) / previousValue) * 100;

      if (change > 10) trend = 'improving';
      else if (change < -10) trend = 'worsening';
    }

    res.json({
      success: true,
      parameter,
      records,
      trend,
      count: records.length,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getRecommendations,
  getThresholds,
  getRotemHistory,
  getLatestRotemWithLabs,
  getRotemTrend,
};
