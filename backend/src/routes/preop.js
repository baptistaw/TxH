// src/routes/preop.js - Rutas de evaluación preoperatoria
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { authenticate, authorize, ROLES } = require('../middlewares/auth');
const { tenantMiddleware } = require('../middlewares/tenant');
const { asyncHandler } = require('../middlewares/errorHandler');
const prisma = require('../lib/prisma');
const googleDriveService = require('../services/googleDrive');
const logger = require('../lib/logger');

// Configuración de multer para uploads
const uploadDir = path.join(__dirname, '../../uploads/preop-attachments');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `preop-${req.params.id}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG) o documentos (PDF, DOC, DOCX)'));
  }
});

// GET /api/preop - Listar evaluaciones
router.get('/', authenticate, tenantMiddleware, asyncHandler(async (req, res) => {
  const {
    patientId,
    caseId,
    q: search,
    inList,
    child,
    meldMin,
    meldMax,
    evaluationDateFrom,
    evaluationDateTo,
    myEvaluations,
    clinicianId,
    transplanted,
    page = 1,
    limit = 20
  } = req.query;
  const userId = req.user.id;
  const userRole = req.user.role;
  const { organizationId } = req; // Multi-tenancy

  // Construir filtros - SIEMPRE incluir organizationId
  const where = {
    organizationId, // Multi-tenancy filter
    ...(search && {
      OR: [
        { patientId: { contains: search } },
        { patient: { name: { contains: search, mode: 'insensitive' } } },
      ],
    }),
    ...(patientId && { patientId }),
    ...(caseId && { caseId }),
    ...(inList !== undefined && { inList: inList === 'true' }),
    ...(child && { child }),
    ...((meldMin || meldMax) && {
      meld: {
        ...(meldMin && { gte: parseInt(meldMin) }),
        ...(meldMax && { lte: parseInt(meldMax) }),
      },
    }),
    ...((evaluationDateFrom || evaluationDateTo) && {
      evaluationDate: {
        ...(evaluationDateFrom && { gte: new Date(evaluationDateFrom) }),
        ...(evaluationDateTo && { lte: new Date(evaluationDateTo) }),
      },
    }),
    // Filtro por paciente trasplantado
    ...(transplanted !== undefined && {
      patient: { transplanted: transplanted === 'true' }
    }),
    // Nuevo sistema de permisos: todos ven todos por defecto
    // Si myEvaluations=true, solo muestra evaluaciones asignadas
    // Si clinicianId está especificado, tiene prioridad sobre myEvaluations
    ...(myEvaluations === 'true' && !clinicianId && { clinicianId: userId }),
    // Filtro por clínico específico
    ...(clinicianId && { clinicianId: parseInt(clinicianId) }),
  };

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [preops, total] = await Promise.all([
    prisma.preopEvaluation.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, sex: true, birthDate: true } },
        clinician: { select: { id: true, name: true, specialty: true } },
        labs: true
      },
      orderBy: { evaluationDate: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.preopEvaluation.count({ where }),
  ]);

  res.json({
    data: preops,
    total,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    }
  });
}));

// GET /api/preop/:id - Obtener evaluación
router.get('/:id', authenticate, tenantMiddleware, asyncHandler(async (req, res) => {
  const { organizationId } = req; // Multi-tenancy
  const preop = await prisma.preopEvaluation.findFirst({
    where: {
      id: req.params.id,
      organizationId, // Multi-tenancy filter
    },
    include: { patient: true, labs: true },
  });
  if (!preop) return res.status(404).json({ error: 'No encontrado' });
  res.json(preop);
}));

// POST /api/preop - Crear evaluación
router.post('/', authenticate, tenantMiddleware, authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { organizationId } = req; // Multi-tenancy
    const preop = await prisma.preopEvaluation.create({
      data: {
        ...req.body,
        organizationId, // Multi-tenancy
        clinicianId: req.body.clinicianId || userId, // Usar el ID del usuario logueado si no se especifica
      }
    });
    res.status(201).json(preop);
  })
);

// PUT /api/preop/:id - Actualizar evaluación
router.put('/:id', authenticate, tenantMiddleware, authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { organizationId } = req; // Multi-tenancy

    // Verificar que existe la evaluación y pertenece a la organización
    const existingPreop = await prisma.preopEvaluation.findFirst({
      where: {
        id: req.params.id,
        organizationId, // Multi-tenancy filter
      },
      select: { clinicianId: true },
    });

    if (!existingPreop) {
      return res.status(404).json({ error: 'Evaluación no encontrada' });
    }

    // Solo admin o el clínico asignado puede editar
    if (userRole !== 'ADMIN' && existingPreop.clinicianId !== userId) {
      return res.status(403).json({
        error: 'No tienes permiso para editar esta evaluación. Solo el anestesiólogo asignado puede editarla.'
      });
    }

    const preop = await prisma.preopEvaluation.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(preop);
  })
);

// POST /api/preop/:id/labs - Crear laboratorio para evaluación
router.post('/:id/labs', authenticate, tenantMiddleware, authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { organizationId } = req; // Multi-tenancy

    // Verificar que existe la evaluación y pertenece a la organización
    const existingPreop = await prisma.preopEvaluation.findFirst({
      where: {
        id: req.params.id,
        organizationId, // Multi-tenancy filter
      },
      select: { clinicianId: true },
    });

    if (!existingPreop) {
      return res.status(404).json({ error: 'Evaluación no encontrada' });
    }

    // Solo admin o el clínico asignado pueden agregar labs
    if (userRole !== 'ADMIN' && existingPreop.clinicianId !== userId) {
      return res.status(403).json({
        error: 'No tienes permiso para agregar laboratorios a esta evaluación.'
      });
    }

    const lab = await prisma.preopLabs.create({
      data: {
        preopId: req.params.id,
        ...req.body,
      },
    });
    res.status(201).json(lab);
  })
);

// PUT /api/preop/:id/labs/:labId - Actualizar laboratorio
router.put('/:id/labs/:labId', authenticate, authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Verificar que existe la evaluación
    const existingPreop = await prisma.preopEvaluation.findUnique({
      where: { id: req.params.id },
      select: { clinicianId: true },
    });

    if (!existingPreop) {
      return res.status(404).json({ error: 'Evaluación no encontrada' });
    }

    // Solo admin o el clínico asignado pueden editar labs
    if (userRole !== 'ADMIN' && existingPreop.clinicianId !== userId) {
      return res.status(403).json({
        error: 'No tienes permiso para editar laboratorios de esta evaluación.'
      });
    }

    const lab = await prisma.preopLabs.update({
      where: { id: req.params.labId },
      data: req.body,
    });
    res.json(lab);
  })
);

// DELETE /api/preop/:id/labs/:labId - Eliminar laboratorio
router.delete('/:id/labs/:labId', authenticate, authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Verificar que existe la evaluación
    const existingPreop = await prisma.preopEvaluation.findUnique({
      where: { id: req.params.id },
      select: { clinicianId: true },
    });

    if (!existingPreop) {
      return res.status(404).json({ error: 'Evaluación no encontrada' });
    }

    // Solo admin o el clínico asignado pueden eliminar labs
    if (userRole !== 'ADMIN' && existingPreop.clinicianId !== userId) {
      return res.status(403).json({
        error: 'No tienes permiso para eliminar laboratorios de esta evaluación.'
      });
    }

    await prisma.preopLabs.delete({
      where: { id: req.params.labId },
    });
    res.status(204).send();
  })
);

// ============================================================================
// ARCHIVOS ADJUNTOS
// ============================================================================

// GET /api/preop/:id/attachments - Listar archivos adjuntos
router.get('/:id/attachments', authenticate, asyncHandler(async (req, res) => {
  const attachments = await prisma.preopAttachment.findMany({
    where: { preopId: req.params.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: attachments });
}));

// POST /api/preop/:id/attachments - Subir archivo adjunto
router.post('/:id/attachments',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó archivo' });
    }

    // Verificar que existe la evaluación
    const existingPreop = await prisma.preopEvaluation.findUnique({
      where: { id: req.params.id },
      select: { clinicianId: true },
    });

    if (!existingPreop) {
      // Eliminar archivo ya subido si la evaluación no existe
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Evaluación no encontrada' });
    }

    // Solo admin o el clínico asignado pueden subir archivos
    if (userRole !== 'ADMIN' && existingPreop.clinicianId !== userId) {
      // Eliminar archivo ya subido si no tiene permisos
      fs.unlinkSync(req.file.path);
      return res.status(403).json({
        error: 'No tienes permiso para subir archivos a esta evaluación.'
      });
    }

    // Calcular hash del archivo
    const fileBuffer = fs.readFileSync(req.file.path);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Crear registro en BD
    const attachment = await prisma.preopAttachment.create({
      data: {
        preopId: req.params.id,
        type: req.body.type || 'Otro',
        url: `/uploads/preop-attachments/${req.file.filename}`,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        fileHash: hash,
        description: req.body.description || null,
        studyDate: req.body.studyDate ? new Date(req.body.studyDate) : null,
        uploadedBy: req.user.id,
      },
    });

    res.status(201).json(attachment);
  })
);

// GET /api/preop/:id/attachments/:attachmentId/download - Descargar archivo
router.get('/:id/attachments/:attachmentId/download',
  authenticate,
  asyncHandler(async (req, res) => {
    const attachment = await prisma.preopAttachment.findUnique({
      where: { id: req.params.attachmentId },
      include: {
        preop: {
          include: {
            patient: { select: { id: true, name: true, ciRaw: true } }
          }
        }
      }
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    // Check if it's a Google Drive file
    if (attachment.url && attachment.url.startsWith('gdrive://')) {
      logger.info(`Serving preop file from Google Drive: ${attachment.id}`, {
        user: req.user.id,
        patient: attachment.preop.patient.ciRaw,
        fileName: attachment.fileName,
        type: attachment.type
      });

      // Extract fileId from URL
      const fileId = googleDriveService.extractFileId(attachment.url);

      if (!fileId) {
        logger.error(`Invalid Drive URL for attachment ${attachment.id}: ${attachment.url}`);
        return res.status(400).json({ error: 'Archivo no disponible en Drive' });
      }

      // Get metadata and stream file
      const metadata = await googleDriveService.getFileMetadata(fileId);

      res.setHeader('Content-Type', metadata.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.fileName.split('/').pop())}"`);

      if (metadata.size) {
        res.setHeader('Content-Length', metadata.size);
      }

      const fileStream = await googleDriveService.getFileStream(fileId);

      fileStream.on('error', (error) => {
        logger.error(`Error streaming preop file ${attachment.id}:`, error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error downloading file' });
        }
      });

      fileStream.pipe(res);
    } else {
      // Local file - serve from filesystem
      const filePath = path.join(__dirname, '../..', attachment.url);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Archivo físico no encontrado' });
      }

      res.download(filePath, attachment.fileName);
    }
  })
);

// DELETE /api/preop/:id/attachments/:attachmentId - Eliminar archivo adjunto
router.delete('/:id/attachments/:attachmentId',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;

    const attachment = await prisma.preopAttachment.findUnique({
      where: { id: req.params.attachmentId },
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    // Verificar que existe la evaluación
    const existingPreop = await prisma.preopEvaluation.findUnique({
      where: { id: req.params.id },
      select: { clinicianId: true },
    });

    if (!existingPreop) {
      return res.status(404).json({ error: 'Evaluación no encontrada' });
    }

    // Solo admin o el clínico asignado pueden eliminar archivos
    if (userRole !== 'ADMIN' && existingPreop.clinicianId !== userId) {
      return res.status(403).json({
        error: 'No tienes permiso para eliminar archivos de esta evaluación.'
      });
    }

    // Eliminar archivo físico
    const filePath = path.join(__dirname, '../..', attachment.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Eliminar registro de BD
    await prisma.preopAttachment.delete({
      where: { id: req.params.attachmentId },
    });

    res.status(204).send();
  })
);

module.exports = router;
