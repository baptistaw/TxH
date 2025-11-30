// src/services/signatureService.js - Servicio de firma digital de actos médicos
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const { NotFoundError, ValidationError, UnauthorizedError } = require('../middlewares/errorHandler');
const auditService = require('./auditService');

/**
 * Verifica la contraseña del usuario con Clerk
 * Dado que usamos Clerk para autenticación, la verificación de contraseña
 * se hace a través de la sesión activa del usuario.
 *
 * Para firma digital, el usuario debe re-autenticarse con su contraseña.
 * Clerk no expone directamente la verificación de contraseña via API,
 * por lo que usamos un enfoque basado en el token de sesión actual.
 *
 * NOTA: En producción, considerar implementar un flujo de re-autenticación
 * con Clerk usando su SDK de verificación de identidad.
 */

/**
 * Genera el hash de firma
 * @param {object} params
 * @param {string} params.documentType - Tipo de documento
 * @param {string} params.documentId - ID del documento
 * @param {number} params.userId - ID del usuario firmante
 * @param {Date} params.timestamp - Momento de la firma
 * @param {string} params.contentHash - Hash del contenido del documento
 */
function generateSignatureHash({ documentType, documentId, userId, timestamp, contentHash }) {
  const dataToHash = [
    documentType,
    documentId,
    String(userId),
    timestamp.toISOString(),
    contentHash,
  ].join('|');

  return crypto.createHash('sha256').update(dataToHash).digest('hex');
}

/**
 * Genera el hash del contenido de un documento
 * @param {object} document - El documento a hashear
 */
function generateContentHash(document) {
  // Excluir campos que cambian con el tiempo (updatedAt, etc.)
  const { updatedAt, createdAt, ...contentToHash } = document;
  return crypto.createHash('sha256').update(JSON.stringify(contentToHash)).digest('hex');
}

/**
 * Obtiene el documento a firmar según su tipo
 * @param {string} documentType - TRANSPLANT_CASE, PROCEDURE, PREOP_EVALUATION
 * @param {string} documentId - ID del documento
 * @param {string} organizationId - ID de la organización
 */
async function getDocumentToSign(documentType, documentId, organizationId) {
  let document = null;
  let tableName = '';

  switch (documentType) {
    case 'TRANSPLANT_CASE':
      tableName = 'transplant_cases';
      document = await prisma.transplantCase.findFirst({
        where: { id: documentId, organizationId, deletedAt: null },
        include: {
          patient: { select: { id: true, name: true } },
          team: { include: { clinician: { select: { id: true, name: true } } } },
        },
      });
      break;

    case 'PROCEDURE':
      tableName = 'procedures';
      document = await prisma.procedure.findFirst({
        where: { id: documentId, organizationId, deletedAt: null },
        include: {
          patient: { select: { id: true, name: true } },
          clinician: { select: { id: true, name: true } },
        },
      });
      break;

    case 'PREOP_EVALUATION':
      tableName = 'preop_evaluations';
      document = await prisma.preopEvaluation.findFirst({
        where: { id: documentId, organizationId },
        include: {
          patient: { select: { id: true, name: true } },
          clinician: { select: { id: true, name: true } },
        },
      });
      break;

    default:
      throw new ValidationError(`Tipo de documento no válido: ${documentType}`);
  }

  if (!document) {
    throw new NotFoundError('Documento');
  }

  return { document, tableName };
}

/**
 * Firma digitalmente un documento médico
 *
 * @param {object} params
 * @param {string} params.documentType - Tipo de documento (TRANSPLANT_CASE, PROCEDURE, PREOP_EVALUATION)
 * @param {string} params.documentId - ID del documento a firmar
 * @param {string} params.organizationId - ID de la organización
 * @param {object} params.signer - Usuario firmante {id, email, name}
 * @param {object} params.req - Request de Express (para IP, User-Agent)
 */
async function signDocument({ documentType, documentId, organizationId, signer, req }) {
  // 1. Verificar que el documento existe y pertenece a la organización
  const { document, tableName } = await getDocumentToSign(documentType, documentId, organizationId);

  // 2. Verificar que no existe ya una firma válida
  const existingSignature = await prisma.digitalSignature.findUnique({
    where: {
      documentType_documentId: {
        documentType,
        documentId,
      },
    },
  });

  if (existingSignature && existingSignature.isValid) {
    throw new ValidationError('Este documento ya fue firmado');
  }

  // 3. Generar el hash del contenido del documento
  const contentHash = generateContentHash(document);

  // 4. Generar la firma
  const timestamp = new Date();
  const signatureHash = generateSignatureHash({
    documentType,
    documentId,
    userId: signer.id,
    timestamp,
    contentHash,
  });

  // 5. Extraer metadatos de la request
  const ipAddress = req?.ip || req?.connection?.remoteAddress || null;
  const userAgent = req?.get?.('User-Agent') || null;

  // 6. Crear el registro de firma en una transacción con audit log
  const signature = await prisma.$transaction(async (tx) => {
    // Crear la firma digital
    const newSignature = await tx.digitalSignature.create({
      data: {
        organizationId,
        documentType,
        documentId,
        signedById: signer.id,
        signedByEmail: signer.email,
        signedByName: signer.name,
        signedAt: timestamp,
        signatureHash,
        ipAddress,
        userAgent,
      },
    });

    // Crear el audit log
    const auditLog = await tx.auditLog.create({
      data: {
        organizationId,
        tableName: 'digital_signatures',
        recordId: newSignature.id,
        action: 'CREATE',
        userId: signer.id,
        userEmail: signer.email,
        newValues: {
          documentType,
          documentId,
          signedById: signer.id,
          signedByEmail: signer.email,
          signedByName: signer.name,
          signatureHash,
        },
        ipAddress,
        userAgent,
      },
    });

    // Actualizar la firma con el ID del audit log
    await tx.digitalSignature.update({
      where: { id: newSignature.id },
      data: { auditLogId: auditLog.id },
    });

    return newSignature;
  });

  logger.info('Document signed successfully', {
    documentType,
    documentId,
    signedById: signer.id,
    signatureId: signature.id,
  });

  return {
    signature,
    document,
  };
}

/**
 * Verifica la validez de una firma
 * @param {string} signatureId - ID de la firma a verificar
 */
async function verifySignature(signatureId) {
  const signature = await prisma.digitalSignature.findUnique({
    where: { id: signatureId },
  });

  if (!signature) {
    throw new NotFoundError('Firma');
  }

  if (!signature.isValid) {
    return {
      isValid: false,
      reason: signature.invalidatedReason || 'Firma invalidada',
      invalidatedAt: signature.invalidatedAt,
    };
  }

  // Obtener el documento actual
  try {
    const { document } = await getDocumentToSign(
      signature.documentType,
      signature.documentId,
      signature.organizationId
    );

    // Recalcular el hash del contenido
    const currentContentHash = generateContentHash(document);

    // Recalcular el hash de firma esperado
    const expectedSignatureHash = generateSignatureHash({
      documentType: signature.documentType,
      documentId: signature.documentId,
      userId: signature.signedById,
      timestamp: signature.signedAt,
      contentHash: currentContentHash,
    });

    // Verificar si coinciden
    const hashMatches = signature.signatureHash === expectedSignatureHash;

    if (!hashMatches) {
      // El documento fue modificado después de la firma
      return {
        isValid: false,
        reason: 'El documento fue modificado después de la firma',
        signature,
      };
    }

    return {
      isValid: true,
      signature,
      document,
    };
  } catch (error) {
    // El documento fue eliminado
    return {
      isValid: false,
      reason: 'El documento firmado ya no existe',
      signature,
    };
  }
}

/**
 * Obtiene la firma de un documento
 * @param {string} documentType - Tipo de documento
 * @param {string} documentId - ID del documento
 */
async function getDocumentSignature(documentType, documentId) {
  const signature = await prisma.digitalSignature.findUnique({
    where: {
      documentType_documentId: {
        documentType,
        documentId,
      },
    },
  });

  return signature;
}

/**
 * Invalida una firma (por ejemplo, si se detecta fraude o error)
 * Solo administradores pueden invalidar firmas
 */
async function invalidateSignature(signatureId, reason, { userId, userEmail, organizationId, req }) {
  const signature = await prisma.digitalSignature.findUnique({
    where: { id: signatureId },
  });

  if (!signature) {
    throw new NotFoundError('Firma');
  }

  if (signature.organizationId !== organizationId) {
    throw new UnauthorizedError('No tienes permiso para invalidar esta firma');
  }

  const invalidated = await prisma.digitalSignature.update({
    where: { id: signatureId },
    data: {
      isValid: false,
      invalidatedAt: new Date(),
      invalidatedReason: reason,
    },
  });

  // Audit log
  await auditService.logUpdate({
    organizationId,
    tableName: 'digital_signatures',
    recordId: signatureId,
    oldValues: signature,
    newValues: invalidated,
    userId,
    userEmail,
    req,
  });

  logger.warn('Signature invalidated', {
    signatureId,
    reason,
    invalidatedBy: userId,
  });

  return invalidated;
}

/**
 * Obtiene el historial de firmas de un usuario
 */
async function getUserSignatures(userId, organizationId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;

  const where = {
    organizationId,
    signedById: userId,
  };

  const [signatures, total] = await Promise.all([
    prisma.digitalSignature.findMany({
      where,
      skip,
      take: limit,
      orderBy: { signedAt: 'desc' },
    }),
    prisma.digitalSignature.count({ where }),
  ]);

  return {
    data: signatures,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Obtiene todas las firmas de la organización (para admin)
 */
async function getOrganizationSignatures(
  organizationId,
  { page = 1, limit = 20, documentType, signedById } = {}
) {
  const skip = (page - 1) * limit;

  const where = {
    organizationId,
    ...(documentType && { documentType }),
    ...(signedById && { signedById }),
  };

  const [signatures, total] = await Promise.all([
    prisma.digitalSignature.findMany({
      where,
      skip,
      take: limit,
      orderBy: { signedAt: 'desc' },
    }),
    prisma.digitalSignature.count({ where }),
  ]);

  return {
    data: signatures,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Firma registros históricos automáticamente
 * Asigna la firma al primer anestesiólogo del equipo del caso
 *
 * @param {string} documentType - Tipo de documento
 * @param {string} documentId - ID del documento
 * @param {string} organizationId - ID de la organización
 */
async function signHistoricalRecord(documentType, documentId, organizationId) {
  // Obtener el documento
  const { document, tableName } = await getDocumentToSign(documentType, documentId, organizationId);

  // Verificar que no existe ya una firma
  const existingSignature = await prisma.digitalSignature.findUnique({
    where: {
      documentType_documentId: {
        documentType,
        documentId,
      },
    },
  });

  if (existingSignature) {
    return { skipped: true, reason: 'Ya existe una firma', signature: existingSignature };
  }

  // Buscar el primer anestesiólogo según el tipo de documento
  let signer = null;

  switch (documentType) {
    case 'TRANSPLANT_CASE':
      // Buscar en el equipo del caso
      const teamMember = await prisma.teamAssignment.findFirst({
        where: {
          caseId: documentId,
          role: 'ANESTESIOLOGO',
        },
        include: {
          clinician: {
            select: { id: true, email: true, name: true },
          },
        },
        orderBy: { createdAt: 'asc' }, // Primer anestesiólogo registrado
      });
      if (teamMember) {
        signer = teamMember.clinician;
      }
      break;

    case 'PROCEDURE':
      // Usar el clínico asignado al procedimiento
      if (document.clinician) {
        signer = document.clinician;
      }
      break;

    case 'PREOP_EVALUATION':
      // Usar el clínico que realizó la evaluación
      if (document.clinician) {
        signer = document.clinician;
      }
      break;
  }

  if (!signer) {
    return {
      skipped: true,
      reason: 'No se encontró anestesiólogo para firmar',
      documentId,
    };
  }

  // Generar la firma
  const contentHash = generateContentHash(document);
  const timestamp = new Date();
  const signatureHash = generateSignatureHash({
    documentType,
    documentId,
    userId: signer.id,
    timestamp,
    contentHash,
  });

  // Crear la firma con marca de registro histórico
  const signature = await prisma.digitalSignature.create({
    data: {
      organizationId,
      documentType,
      documentId,
      signedById: signer.id,
      signedByEmail: signer.email,
      signedByName: signer.name,
      signedAt: timestamp,
      signatureHash,
      ipAddress: 'HISTORICAL_IMPORT', // Marca especial para registros históricos
      userAgent: 'System - Historical Record Signature',
    },
  });

  logger.info('Historical record signed', {
    documentType,
    documentId,
    signedById: signer.id,
    signatureId: signature.id,
  });

  return { signature, signer };
}

/**
 * Firma masiva de registros históricos de una organización
 *
 * @param {string} organizationId - ID de la organización
 * @param {string} documentType - Tipo de documentos a firmar (opcional, firma todos si no se especifica)
 */
async function signAllHistoricalRecords(organizationId, documentType = null) {
  const results = {
    signed: [],
    skipped: [],
    errors: [],
  };

  // Determinar qué tipos de documentos firmar
  const typesToSign = documentType
    ? [documentType]
    : ['TRANSPLANT_CASE', 'PROCEDURE', 'PREOP_EVALUATION'];

  for (const type of typesToSign) {
    let documents = [];

    switch (type) {
      case 'TRANSPLANT_CASE':
        documents = await prisma.transplantCase.findMany({
          where: { organizationId, deletedAt: null },
          select: { id: true },
        });
        break;

      case 'PROCEDURE':
        documents = await prisma.procedure.findMany({
          where: { organizationId, deletedAt: null },
          select: { id: true },
        });
        break;

      case 'PREOP_EVALUATION':
        documents = await prisma.preopEvaluation.findMany({
          where: { organizationId },
          select: { id: true },
        });
        break;
    }

    for (const doc of documents) {
      try {
        const result = await signHistoricalRecord(type, doc.id, organizationId);

        if (result.skipped) {
          results.skipped.push({
            documentType: type,
            documentId: doc.id,
            reason: result.reason,
          });
        } else {
          results.signed.push({
            documentType: type,
            documentId: doc.id,
            signatureId: result.signature.id,
            signedBy: result.signer.name,
          });
        }
      } catch (error) {
        results.errors.push({
          documentType: type,
          documentId: doc.id,
          error: error.message,
        });
        logger.error('Error signing historical record', {
          documentType: type,
          documentId: doc.id,
          error: error.message,
        });
      }
    }
  }

  logger.info('Historical records signing completed', {
    organizationId,
    signed: results.signed.length,
    skipped: results.skipped.length,
    errors: results.errors.length,
  });

  return results;
}

module.exports = {
  signDocument,
  verifySignature,
  getDocumentSignature,
  invalidateSignature,
  getUserSignatures,
  getOrganizationSignatures,
  generateContentHash,
  generateSignatureHash,
  signHistoricalRecord,
  signAllHistoricalRecords,
};
