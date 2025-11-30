// src/routes/clinicians.js - Rutas de clínicos
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { tenantMiddleware } = require('../middlewares/tenant');
const { asyncHandler } = require('../middlewares/errorHandler');
const prisma = require('../lib/prisma');

// GET /api/clinicians - Listar todos los clínicos de la organización
router.get('/', authenticate, tenantMiddleware, asyncHandler(async (req, res) => {
  const { organizationId } = req; // Multi-tenancy

  const clinicians = await prisma.clinician.findMany({
    where: { organizationId }, // Filtrar por organización
    select: {
      id: true,
      name: true,
      specialty: true,
    },
    orderBy: { name: 'asc' },
  });

  res.json({ data: clinicians });
}));

module.exports = router;
