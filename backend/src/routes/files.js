// src/routes/files.js - Rutas de archivos adjuntos
const express = require('express');
const router = express.Router();
const { authenticate, authorize, ROLES } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');
const googleDriveService = require('../services/googleDrive');

// GET /api/files - Listar archivos de un caso
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { caseId, type } = req.query;
  const attachments = await prisma.attachment.findMany({
    where: { ...(caseId && { caseId }), ...(type && { type }) },
    orderBy: { uploadedAt: 'desc' },
  });
  res.json({ data: attachments });
}));

// GET /api/files/:id - Obtener metadata de archivo
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const attachment = await prisma.attachment.findUnique({
    where: { id: req.params.id },
    include: { case: { select: { patient: { select: { name: true } } } } },
  });
  if (!attachment) return res.status(404).json({ error: 'Archivo no encontrado' });
  res.json(attachment);
}));

// POST /api/files - Subir archivo (placeholder - requiere S3)
router.post('/', authenticate, authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  asyncHandler(async (req, res) => {
    // TODO: Implementar upload a S3
    // Aquí iría multer + S3 client
    logger.warn('File upload not implemented yet');

    const { caseId, type, fileName, mimeType, sizeBytes } = req.body;

    const attachment = await prisma.attachment.create({
      data: {
        caseId,
        type,
        url: 'https://placeholder-url.com', // TODO: URL real de S3
        fileName,
        mimeType,
        sizeBytes,
        uploadedBy: req.user.id,
      },
    });

    res.status(201).json(attachment);
  })
);

// DELETE /api/files/:id - Eliminar archivo
router.delete('/:id', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    // TODO: Eliminar de S3 también
    await prisma.attachment.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

// ==============================================================================
// GOOGLE DRIVE - Archivos de Estudios Preoperatorios
// ==============================================================================

/**
 * GET /api/files/gdrive/:fileId - Descargar archivo desde Google Drive
 *
 * Sirve archivos de estudios preoperatorios almacenados en Google Drive
 * El archivo se descarga desde Drive y se envía al cliente
 *
 * @param {string} fileId - ID del archivo en Google Drive
 * @returns {Stream} Archivo
 */
router.get('/gdrive/:fileId', authenticate, asyncHandler(async (req, res) => {
  const { fileId } = req.params;

  logger.info(`Serving file from Google Drive: ${fileId}`, {
    user: req.user.id,
    userEmail: req.user.email
  });

  // 1. Obtener metadata del archivo
  const metadata = await googleDriveService.getFileMetadata(fileId);

  // 2. Configurar headers de respuesta
  res.setHeader('Content-Type', metadata.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(metadata.name)}"`);

  if (metadata.size) {
    res.setHeader('Content-Length', metadata.size);
  }

  // 3. Descargar y streamear el archivo
  const fileStream = await googleDriveService.getFileStream(fileId);

  fileStream.on('error', (error) => {
    logger.error(`Error streaming file ${fileId}:`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error downloading file' });
    }
  });

  fileStream.pipe(res);
}));

/**
 * GET /api/files/preop/:attachmentId - Obtener archivo de estudio preoperatorio
 *
 * Busca el archivo en la BD y lo sirve desde Google Drive
 *
 * @param {string} attachmentId - ID del PreopAttachment en la BD
 * @returns {Stream} Archivo
 */
router.get('/preop/:attachmentId', authenticate, asyncHandler(async (req, res) => {
  const { attachmentId } = req.params;

  // 1. Buscar el attachment en la BD
  const attachment = await prisma.preopAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      preop: {
        include: {
          patient: {
            select: { id: true, name: true, ciRaw: true }
          }
        }
      }
    }
  });

  if (!attachment) {
    return res.status(404).json({ error: 'Estudio no encontrado' });
  }

  // 2. Verificar que el usuario tiene acceso al paciente
  // TODO: Implementar lógica de permisos si es necesario
  // Por ahora, cualquier usuario autenticado puede ver

  logger.info(`Serving preop file: ${attachmentId}`, {
    user: req.user.id,
    patient: attachment.preop.patient.ciRaw,
    fileName: attachment.fileName,
    type: attachment.type
  });

  // 3. Extraer fileId de la URL
  const fileId = googleDriveService.extractFileId(attachment.url);

  if (!fileId) {
    logger.error(`Invalid Drive URL for attachment ${attachmentId}: ${attachment.url}`);
    return res.status(400).json({ error: 'Archivo no disponible en Drive' });
  }

  // 4. Obtener metadata y servir archivo
  const metadata = await googleDriveService.getFileMetadata(fileId);

  res.setHeader('Content-Type', metadata.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.fileName.split('/').pop())}"`);

  if (metadata.size) {
    res.setHeader('Content-Length', metadata.size);
  }

  const fileStream = await googleDriveService.getFileStream(fileId);

  fileStream.on('error', (error) => {
    logger.error(`Error streaming preop file ${attachmentId}:`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error downloading file' });
    }
  });

  fileStream.pipe(res);
}));

/**
 * GET /api/files/preop/:attachmentId/info - Obtener info de un estudio preop
 *
 * Retorna metadata del archivo sin descargarlo
 *
 * @param {string} attachmentId - ID del PreopAttachment
 * @returns {Object} Metadata del archivo
 */
router.get('/preop/:attachmentId/info', authenticate, asyncHandler(async (req, res) => {
  const { attachmentId } = req.params;

  const attachment = await prisma.preopAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      preop: {
        include: {
          patient: {
            select: { id: true, name: true, ciRaw: true }
          }
        }
      }
    }
  });

  if (!attachment) {
    return res.status(404).json({ error: 'Estudio no encontrado' });
  }

  const fileId = googleDriveService.extractFileId(attachment.url);

  let driveMetadata = null;
  if (fileId) {
    try {
      driveMetadata = await googleDriveService.getFileMetadata(fileId);
    } catch (error) {
      logger.warn(`Could not get Drive metadata for ${attachmentId}:`, error.message);
    }
  }

  res.json({
    id: attachment.id,
    type: attachment.type,
    fileName: attachment.fileName,
    description: attachment.description,
    uploadedAt: attachment.uploadedAt,
    patient: {
      name: attachment.preop.patient.name,
      ci: attachment.preop.patient.ciRaw
    },
    drive: driveMetadata ? {
      id: driveMetadata.id,
      name: driveMetadata.name,
      mimeType: driveMetadata.mimeType,
      size: driveMetadata.size,
      viewUrl: googleDriveService.getViewUrl(fileId),
      downloadUrl: `/api/files/preop/${attachmentId}`
    } : null
  });
}));

module.exports = router;
