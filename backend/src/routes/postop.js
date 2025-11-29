// src/routes/postop.js - Rutas de resultados postoperatorios
const express = require('express');
const router = express.Router();
const { authenticate, authorize, ROLES } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');
const prisma = require('../lib/prisma');
const caseService = require('../services/caseService');

// GET /api/postop/:caseId - Obtener resultado postop de un caso
router.get('/:caseId', authenticate, asyncHandler(async (req, res) => {
  const postop = await prisma.postOpOutcome.findUnique({
    where: { caseId: req.params.caseId },
    include: { case: { select: { patient: { select: { name: true } } } } },
  });
  if (!postop) return res.status(404).json({ error: 'No encontrado' });
  res.json(postop);
}));

// POST /api/postop - Crear resultado postop
router.post('/', authenticate, authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Verificar permisos
    if (userRole !== 'ADMIN') {
      // Solo admin o anestesiólogos asignados al equipo pueden crear
      if (userRole !== 'ANESTESIOLOGO') {
        return res.status(403).json({
          error: 'No tienes permiso para crear resultados postoperatorios. Solo los anestesiólogos asignados pueden hacerlo.'
        });
      }

      // Verificar si el anestesiólogo está en el equipo
      const team = await caseService.getCaseTeam(req.body.caseId);
      const isInTeam = team.some(member => member.clinicianId === userId);

      if (!isInTeam) {
        return res.status(403).json({
          error: 'No tienes permiso para crear resultados postoperatorios en este caso. Solo los anestesiólogos asignados a este equipo pueden hacerlo.'
        });
      }
    }

    const postop = await prisma.postOpOutcome.create({ data: req.body });
    res.status(201).json(postop);
  })
);

// PUT /api/postop/:caseId - Actualizar resultado postop
router.put('/:caseId', authenticate, authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    const caseId = req.params.caseId;

    // Verificar permisos
    if (userRole !== 'ADMIN') {
      // Solo admin o anestesiólogos asignados al equipo pueden editar
      if (userRole !== 'ANESTESIOLOGO') {
        return res.status(403).json({
          error: 'No tienes permiso para editar resultados postoperatorios. Solo los anestesiólogos asignados pueden hacerlo.'
        });
      }

      // Verificar si el anestesiólogo está en el equipo
      const team = await caseService.getCaseTeam(caseId);
      const isInTeam = team.some(member => member.clinicianId === userId);

      if (!isInTeam) {
        return res.status(403).json({
          error: 'No tienes permiso para editar resultados postoperatorios en este caso. Solo los anestesiólogos asignados a este equipo pueden hacerlo.'
        });
      }
    }

    const postop = await prisma.postOpOutcome.update({
      where: { caseId },
      data: req.body,
    });
    res.json(postop);
  })
);

module.exports = router;
