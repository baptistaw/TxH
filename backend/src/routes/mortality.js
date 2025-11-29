// src/routes/mortality.js - Rutas de mortalidad y seguimiento
const express = require('express');
const router = express.Router();
const { authenticate, authorize, ROLES } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');
const prisma = require('../lib/prisma');
const caseService = require('../services/caseService');

// GET /api/mortality/patient/:patientId - Obtener datos de mortalidad de un paciente
router.get('/patient/:patientId', authenticate, asyncHandler(async (req, res) => {
  const mortality = await prisma.mortality.findUnique({
    where: { patientId: req.params.patientId },
    include: { patient: { select: { name: true } } },
  });
  if (!mortality) return res.status(404).json({ error: 'No encontrado' });
  res.json(mortality);
}));

// POST /api/mortality - Crear registro de mortalidad
router.post('/', authenticate, authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  asyncHandler(async (req, res) => {
    const userRole = req.user.role;

    // Solo ADMIN puede crear registros de mortalidad (son datos de seguimiento global)
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        error: 'No tienes permiso para crear registros de mortalidad. Solo los administradores pueden hacerlo.'
      });
    }

    const mortality = await prisma.mortality.create({ data: req.body });
    res.status(201).json(mortality);
  })
);

// PUT /api/mortality/patient/:patientId - Actualizar registro de mortalidad
router.put('/patient/:patientId', authenticate, authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  asyncHandler(async (req, res) => {
    const userRole = req.user.role;
    const patientId = req.params.patientId;

    // Solo ADMIN puede editar registros de mortalidad (son datos de seguimiento global)
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        error: 'No tienes permiso para editar registros de mortalidad. Solo los administradores pueden hacerlo.'
      });
    }

    const mortality = await prisma.mortality.update({
      where: { patientId },
      data: req.body,
    });
    res.json(mortality);
  })
);

module.exports = router;
