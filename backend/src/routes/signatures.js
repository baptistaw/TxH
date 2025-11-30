// src/routes/signatures.js - Rutas de firma digital
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { tenantMiddleware } = require('../middlewares/tenant');
const signatureController = require('../controllers/signatureController');
const { asyncHandler } = require('../middlewares/errorHandler');

// Todas las rutas requieren autenticación y contexto de organización
router.use(authenticate);
router.use(tenantMiddleware);

/**
 * POST /api/signatures
 * Firmar un documento médico
 * Body: { documentType: 'TRANSPLANT_CASE'|'PROCEDURE'|'PREOP_EVALUATION', documentId: string }
 */
router.post('/', asyncHandler(signatureController.signDocument));

/**
 * GET /api/signatures
 * Obtener todas las firmas de la organización (solo admin)
 * Query: page, limit, documentType, signedById
 */
router.get('/', asyncHandler(signatureController.getOrganizationSignatures));

/**
 * GET /api/signatures/my-signatures
 * Obtener las firmas del usuario actual
 * Query: page, limit
 */
router.get('/my-signatures', asyncHandler(signatureController.getMySignatures));

/**
 * GET /api/signatures/document/:documentType/:documentId
 * Obtener la firma de un documento específico
 */
router.get(
  '/document/:documentType/:documentId',
  asyncHandler(signatureController.getDocumentSignature)
);

/**
 * GET /api/signatures/:id/verify
 * Verificar la validez de una firma
 */
router.get('/:id/verify', asyncHandler(signatureController.verifySignature));

/**
 * POST /api/signatures/:id/invalidate
 * Invalidar una firma (solo admin)
 * Body: { reason: string }
 */
router.post('/:id/invalidate', asyncHandler(signatureController.invalidateSignature));

/**
 * POST /api/signatures/sign-historical
 * Firmar registros históricos automáticamente (solo admin)
 * Body: { documentType?: string } - opcional, si no se especifica firma todos los tipos
 */
router.post('/sign-historical', asyncHandler(signatureController.signHistoricalRecords));

module.exports = router;
