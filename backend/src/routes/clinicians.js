// src/routes/clinicians.js - Rutas de clínicos
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');
const prisma = require('../lib/prisma');

// GET /api/clinicians - Listar todos los clínicos (para filtros y dropdowns)
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const clinicians = await prisma.clinician.findMany({
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
