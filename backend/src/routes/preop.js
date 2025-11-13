// src/routes/preop.js - Rutas de evaluación preoperatoria
const express = require('express');
const router = express.Router();
const { authenticate, authorize, ROLES } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');
const prisma = require('../lib/prisma');

// GET /api/preop - Listar evaluaciones
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { patientId, caseId } = req.query;
  const preops = await prisma.preopEvaluation.findMany({
    where: { ...(patientId && { patientId }), ...(caseId && { caseId }) },
    include: { patient: { select: { id: true, name: true } }, labs: true },
    orderBy: { evaluationDate: 'desc' },
  });
  res.json({ data: preops });
}));

// GET /api/preop/:id - Obtener evaluación
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const preop = await prisma.preopEvaluation.findUnique({
    where: { id: req.params.id },
    include: { patient: true, labs: true },
  });
  if (!preop) return res.status(404).json({ error: 'No encontrado' });
  res.json(preop);
}));

// POST /api/preop - Crear evaluación
router.post('/', authenticate, authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  asyncHandler(async (req, res) => {
    const preop = await prisma.preopEvaluation.create({ data: req.body });
    res.status(201).json(preop);
  })
);

// PUT /api/preop/:id - Actualizar evaluación
router.put('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  asyncHandler(async (req, res) => {
    const preop = await prisma.preopEvaluation.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(preop);
  })
);

module.exports = router;
