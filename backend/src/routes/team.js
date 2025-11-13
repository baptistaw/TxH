// src/routes/team.js - Rutas de equipo quirúrgico
const express = require('express');
const router = express.Router();
const { authenticate, authorize, ROLES } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');
const prisma = require('../lib/prisma');

// GET /api/team - Listar clínicos
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { specialty } = req.query;
  const clinicians = await prisma.clinician.findMany({
    where: { ...(specialty && { specialty }) },
    orderBy: { name: 'asc' },
  });
  res.json({ data: clinicians });
}));

// GET /api/team/:id - Obtener clínico
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const clinician = await prisma.clinician.findUnique({
    where: { id: parseInt(req.params.id) },
    include: { teamAssignments: { include: { case: true } } },
  });
  if (!clinician) return res.status(404).json({ error: 'No encontrado' });
  res.json(clinician);
}));

// POST /api/team - Crear clínico (solo admin)
router.post('/', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const clinician = await prisma.clinician.create({ data: req.body });
    res.status(201).json(clinician);
  })
);

// PUT /api/team/:id - Actualizar clínico (solo admin)
router.put('/:id', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const clinician = await prisma.clinician.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(clinician);
  })
);

module.exports = router;
