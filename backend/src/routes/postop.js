// src/routes/postop.js - Rutas de resultados postoperatorios
const express = require('express');
const router = express.Router();
const { authenticate, authorize, ROLES } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');
const prisma = require('../lib/prisma');

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
    const postop = await prisma.postOpOutcome.create({ data: req.body });
    res.status(201).json(postop);
  })
);

// PUT /api/postop/:caseId - Actualizar resultado postop
router.put('/:caseId', authenticate, authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  asyncHandler(async (req, res) => {
    const postop = await prisma.postOpOutcome.update({
      where: { caseId: req.params.caseId },
      data: req.body,
    });
    res.json(postop);
  })
);

module.exports = router;
