// src/controllers/signatureController.js - Controlador de firmas digitales
const signatureService = require('../services/signatureService');
const logger = require('../lib/logger');

/**
 * Firmar un documento médico
 * POST /api/signatures
 * Body: { documentType, documentId }
 *
 * NOTA: La autenticación ya fue verificada por el middleware de Clerk.
 * El usuario debe estar autenticado para firmar.
 */
async function signDocument(req, res, next) {
  try {
    const { documentType, documentId } = req.body;
    const { organizationId } = req;

    // Validar campos requeridos
    if (!documentType || !documentId) {
      return res.status(400).json({
        error: 'Campos requeridos faltantes',
        message: 'Se requiere documentType y documentId',
      });
    }

    // Validar tipo de documento
    const validTypes = ['TRANSPLANT_CASE', 'PROCEDURE', 'PREOP_EVALUATION'];
    if (!validTypes.includes(documentType)) {
      return res.status(400).json({
        error: 'Tipo de documento inválido',
        message: `Tipos válidos: ${validTypes.join(', ')}`,
      });
    }

    // Obtener datos del firmante desde req.user (inyectado por auth middleware)
    const signer = {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
    };

    const result = await signatureService.signDocument({
      documentType,
      documentId,
      organizationId,
      signer,
      req,
    });

    res.status(201).json({
      message: 'Documento firmado exitosamente',
      signature: {
        id: result.signature.id,
        documentType: result.signature.documentType,
        documentId: result.signature.documentId,
        signedBy: result.signature.signedByName,
        signedAt: result.signature.signedAt,
      },
    });
  } catch (error) {
    logger.error('Sign document error', { error: error.message });
    next(error);
  }
}

/**
 * Verificar la validez de una firma
 * GET /api/signatures/:id/verify
 */
async function verifySignature(req, res, next) {
  try {
    const { id } = req.params;

    const result = await signatureService.verifySignature(id);

    res.json({
      signatureId: id,
      isValid: result.isValid,
      ...(result.reason && { reason: result.reason }),
      ...(result.signature && {
        signature: {
          documentType: result.signature.documentType,
          documentId: result.signature.documentId,
          signedBy: result.signature.signedByName,
          signedAt: result.signature.signedAt,
        },
      }),
    });
  } catch (error) {
    logger.error('Verify signature error', { error: error.message });
    next(error);
  }
}

/**
 * Obtener la firma de un documento
 * GET /api/signatures/document/:documentType/:documentId
 */
async function getDocumentSignature(req, res, next) {
  try {
    const { documentType, documentId } = req.params;

    const signature = await signatureService.getDocumentSignature(documentType, documentId);

    if (!signature) {
      return res.json({
        signed: false,
        message: 'Este documento no ha sido firmado',
      });
    }

    res.json({
      signed: true,
      signature: {
        id: signature.id,
        documentType: signature.documentType,
        documentId: signature.documentId,
        signedBy: signature.signedByName,
        signedByEmail: signature.signedByEmail,
        signedAt: signature.signedAt,
        isValid: signature.isValid,
        ...(signature.invalidatedAt && {
          invalidatedAt: signature.invalidatedAt,
          invalidatedReason: signature.invalidatedReason,
        }),
      },
    });
  } catch (error) {
    logger.error('Get document signature error', { error: error.message });
    next(error);
  }
}

/**
 * Invalidar una firma (solo admin)
 * POST /api/signatures/:id/invalidate
 * Body: { reason }
 */
async function invalidateSignature(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { organizationId } = req;

    if (!reason) {
      return res.status(400).json({
        error: 'Razón requerida',
        message: 'Debe proporcionar una razón para invalidar la firma',
      });
    }

    // Verificar que el usuario es admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'Solo los administradores pueden invalidar firmas',
      });
    }

    const invalidated = await signatureService.invalidateSignature(id, reason, {
      userId: req.user.id,
      userEmail: req.user.email,
      organizationId,
      req,
    });

    res.json({
      message: 'Firma invalidada exitosamente',
      signature: {
        id: invalidated.id,
        isValid: invalidated.isValid,
        invalidatedAt: invalidated.invalidatedAt,
        invalidatedReason: invalidated.invalidatedReason,
      },
    });
  } catch (error) {
    logger.error('Invalidate signature error', { error: error.message });
    next(error);
  }
}

/**
 * Obtener mis firmas
 * GET /api/signatures/my-signatures
 */
async function getMySignatures(req, res, next) {
  try {
    const { organizationId } = req;
    const { page = 1, limit = 20 } = req.query;

    const result = await signatureService.getUserSignatures(req.user.id, organizationId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json(result);
  } catch (error) {
    logger.error('Get my signatures error', { error: error.message });
    next(error);
  }
}

/**
 * Obtener todas las firmas de la organización (solo admin)
 * GET /api/signatures
 */
async function getOrganizationSignatures(req, res, next) {
  try {
    const { organizationId } = req;
    const { page = 1, limit = 20, documentType, signedById } = req.query;

    // Verificar que el usuario es admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'Solo los administradores pueden ver todas las firmas',
      });
    }

    const result = await signatureService.getOrganizationSignatures(organizationId, {
      page: parseInt(page),
      limit: parseInt(limit),
      documentType,
      signedById: signedById ? parseInt(signedById) : undefined,
    });

    res.json(result);
  } catch (error) {
    logger.error('Get organization signatures error', { error: error.message });
    next(error);
  }
}

/**
 * Firmar registros históricos (solo admin)
 * POST /api/signatures/sign-historical
 * Body: { documentType } (opcional - si no se especifica, firma todos)
 */
async function signHistoricalRecords(req, res, next) {
  try {
    const { organizationId } = req;
    const { documentType } = req.body;

    // Verificar que el usuario es admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'Solo los administradores pueden firmar registros históricos',
      });
    }

    logger.info('Starting historical records signing', {
      organizationId,
      documentType,
      initiatedBy: req.user.id,
    });

    const result = await signatureService.signAllHistoricalRecords(organizationId, documentType);

    res.json({
      message: 'Proceso de firma de registros históricos completado',
      summary: {
        signed: result.signed.length,
        skipped: result.skipped.length,
        errors: result.errors.length,
      },
      details: result,
    });
  } catch (error) {
    logger.error('Sign historical records error', { error: error.message });
    next(error);
  }
}

module.exports = {
  signDocument,
  verifySignature,
  getDocumentSignature,
  invalidateSignature,
  getMySignatures,
  getOrganizationSignatures,
  signHistoricalRecords,
};
