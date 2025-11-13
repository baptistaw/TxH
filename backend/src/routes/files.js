// src/routes/files.js - Rutas de archivos adjuntos
const express = require('express');
const router = express.Router();
const { authenticate, authorize, ROLES } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

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

module.exports = router;
