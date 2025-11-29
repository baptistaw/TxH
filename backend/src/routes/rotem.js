/**
 * Rutas para el Sistema de Asistencia ROTEM
 * POST /api/rotem/recommendations - Obtener recomendaciones del algoritmo
 * GET /api/rotem/thresholds - Obtener umbrales del algoritmo
 * GET /api/rotem/history/:caseId - Historial de registros ROTEM
 * GET /api/rotem/latest/:caseId - Último registro ROTEM con labs
 * GET /api/rotem/trend/:caseId - Tendencia de parámetros
 */

const express = require('express');
const router = express.Router();
const rotemController = require('../controllers/rotemController');
const { authenticate, authorize, ROLES } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { z } = require('zod');

// Schema de validación para solicitud de recomendaciones
const recommendationsSchema = z.object({
  // Datos ROTEM - todos opcionales porque pueden venir parciales
  rotemCtExtem: z.number().int().min(0).max(3600).optional().nullable(),
  rotemCftExtem: z.number().int().min(0).max(3600).optional().nullable(),
  rotemA5Extem: z.number().int().min(0).max(120).optional().nullable(),
  rotemA10Extem: z.number().int().min(0).max(120).optional().nullable(),
  rotemMcfExtem: z.number().int().min(0).max(120).optional().nullable(),
  rotemCli30: z.number().int().min(0).max(100).optional().nullable(),
  rotemCli60: z.number().int().min(0).max(100).optional().nullable(),
  rotemMl: z.number().int().min(0).max(100).optional().nullable(),
  rotemCtFibtem: z.number().int().min(0).max(3600).optional().nullable(),
  rotemA5Fibtem: z.number().int().min(0).max(120).optional().nullable(),
  rotemA10Fibtem: z.number().int().min(0).max(120).optional().nullable(),
  rotemMcfFibtem: z.number().int().min(0).max(120).optional().nullable(),
  rotemCtIntem: z.number().int().min(0).max(3600).optional().nullable(),
  rotemCtHeptem: z.number().int().min(0).max(3600).optional().nullable(),
  rotemA5Aptem: z.number().int().min(0).max(120).optional().nullable(),

  // Fase quirúrgica - requerida
  phase: z.enum([
    'ESTADO_BASAL',
    'INDUCCION',
    'DISECCION',
    'ANHEPATICA',
    'PRE_REPERFUSION',
    'POST_REPERFUSION',
    'VIA_BILIAR',
    'CIERRE',
    'SALIDA_BQ',
  ]),

  // Contexto clínico
  clinicalContext: z.object({
    // Peso del paciente
    weight: z.number().min(30).max(300).optional(),

    // Estado clínico
    hasActiveBleeeding: z.boolean().optional(),
    anticipatedBleeding: z.boolean().optional(),
    refractoryBleeding: z.boolean().optional(),
    suspectedPlateletDysfunction: z.boolean().optional(),

    // Condiciones previas (laboratorios recientes)
    pH: z.number().min(6.8).max(8).optional().nullable(),
    temperature: z.number().min(30).max(42).optional().nullable(),
    ionicCalcium: z.number().min(0.5).max(3).optional().nullable(),
    hemoglobin: z.number().min(0).max(25).optional().nullable(),

    // Contraindicaciones para antifibrinolíticos
    contraindications: z.object({
      previousThrombosis: z.boolean().optional(),
      hepaticMalignancy: z.boolean().optional(),
      chronicBiliaryInflammation: z.boolean().optional(),
    }).optional(),

    // Disponibilidad de recursos
    ccpAvailable: z.boolean().optional(),
  }).optional(),
});

// POST /api/rotem/recommendations
// Obtiene recomendaciones basadas en el algoritmo ROTEM
router.post(
  '/recommendations',
  authenticate,
  validate(recommendationsSchema),
  rotemController.getRecommendations
);

// GET /api/rotem/thresholds
// Obtiene los umbrales y constantes del algoritmo
router.get(
  '/thresholds',
  authenticate,
  rotemController.getThresholds
);

// GET /api/rotem/history/:caseId
// Obtiene historial de registros ROTEM para un caso
router.get(
  '/history/:caseId',
  authenticate,
  rotemController.getRotemHistory
);

// GET /api/rotem/latest/:caseId
// Obtiene el último registro ROTEM con datos de laboratorio
router.get(
  '/latest/:caseId',
  authenticate,
  rotemController.getLatestRotemWithLabs
);

// GET /api/rotem/trend/:caseId?parameter=a5Extem
// Obtiene tendencia de un parámetro específico
router.get(
  '/trend/:caseId',
  authenticate,
  rotemController.getRotemTrend
);

module.exports = router;
