// src/routes/procedures.js - Rutas de procedimientos quirúrgicos
const express = require('express');
const router = express.Router();
const { authenticate, authorize, ROLES } = require('../middlewares/auth');
const { tenantMiddleware } = require('../middlewares/tenant');
const { asyncHandler } = require('../middlewares/errorHandler');
const prisma = require('../lib/prisma');

// GET /api/procedures - Listar procedimientos
router.get('/', authenticate, tenantMiddleware, asyncHandler(async (req, res) => {
  const {
    patientId,
    q: search,
    procedureType,
    location,
    asa,
    startDate,
    endDate,
    myProcedures,
    clinicianId,
    transplanted,
    dataSource,
    page = 1,
    limit = 20
  } = req.query;
  const userId = req.user.id;
  const userRole = req.user.role;
  const { organizationId } = req; // Multi-tenancy

  // Construir filtros - SIEMPRE incluir organizationId
  const where = {
    organizationId, // Multi-tenancy filter
    AND: [
      // Filtros básicos
      ...(patientId ? [{ patientId }] : []),
      ...(procedureType ? [{ procedureType }] : []),
      ...(location ? [{ location: { contains: location, mode: 'insensitive' } }] : []),
      ...(asa ? [{ asa }] : []),
      ...(dataSource ? [{ dataSource }] : []),
      ...((startDate || endDate) ? [{
        startAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      }] : []),

      // Filtro de búsqueda (OR interno)
      ...(search ? [{
        OR: [
          { patientId: { contains: search } },
          { patient: { name: { contains: search, mode: 'insensitive' } } },
          { procedureTypeDetail: { contains: search, mode: 'insensitive' } },
        ]
      }] : []),

      // Filtro por paciente trasplantado
      ...(transplanted !== undefined ? [{
        patient: { transplanted: transplanted === 'true' }
      }] : []),

      // Filtro "Mis Procedimientos"
      // Solo muestra procedimientos asignados al usuario
      ...(myProcedures === 'true' ? [{ clinicianId: userId }] : []),

      // Filtro por clínico específico
      ...(clinicianId ? [{ clinicianId: parseInt(clinicianId) }] : []),
    ].filter(Boolean), // Remover elementos vacíos
  };

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [procedures, total] = await Promise.all([
    prisma.procedure.findMany({
      where,
      include: {
        patient: {
          select: { id: true, name: true, sex: true, birthDate: true }
        },
        clinician: {
          select: { id: true, name: true, specialty: true }
        }
      },
      orderBy: { startAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.procedure.count({ where }),
  ]);

  res.json({
    data: procedures,
    total,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    }
  });
}));

// GET /api/procedures/:id - Obtener procedimiento
router.get('/:id', authenticate, tenantMiddleware, asyncHandler(async (req, res) => {
  const { organizationId } = req; // Multi-tenancy
  const procedure = await prisma.procedure.findFirst({
    where: {
      id: req.params.id,
      organizationId, // Multi-tenancy filter
    },
    include: {
      patient: true,
      clinician: { select: { id: true, name: true, specialty: true, email: true } },
      intraopRecordsProcedure: {
        orderBy: { timestamp: 'asc' }
      }
    },
  });
  if (!procedure) return res.status(404).json({ error: 'Procedimiento no encontrado' });
  res.json(procedure);
}));

// POST /api/procedures - Crear procedimiento
router.post('/', authenticate, tenantMiddleware, authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { organizationId } = req; // Multi-tenancy
    const procedure = await prisma.procedure.create({
      data: {
        ...req.body,
        organizationId, // Multi-tenancy
        clinicianId: req.body.clinicianId || userId, // Usar el ID del usuario logueado si no se especifica
      },
      include: {
        patient: true,
        clinician: { select: { id: true, name: true, specialty: true } }
      }
    });
    res.status(201).json(procedure);
  })
);

// PUT /api/procedures/:id - Actualizar procedimiento
router.put('/:id', authenticate, tenantMiddleware, authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { organizationId } = req; // Multi-tenancy

    // Verificar que existe el procedimiento y pertenece a la organización
    const existingProcedure = await prisma.procedure.findFirst({
      where: {
        id: req.params.id,
        organizationId, // Multi-tenancy filter
      },
      select: { clinicianId: true },
    });

    if (!existingProcedure) {
      return res.status(404).json({ error: 'Procedimiento no encontrado' });
    }

    // Solo admin o el clínico asignado puede editar
    if (userRole !== 'ADMIN' && existingProcedure.clinicianId !== userId) {
      return res.status(403).json({
        error: 'No tienes permiso para editar este procedimiento. Solo el anestesiólogo asignado puede editarlo.'
      });
    }

    const procedure = await prisma.procedure.update({
      where: { id: req.params.id },
      data: req.body,
      include: { patient: true }
    });
    res.json(procedure);
  })
);

// DELETE /api/procedures/:id - Eliminar procedimiento
router.delete('/:id', authenticate, tenantMiddleware, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const { organizationId } = req; // Multi-tenancy

    // Verificar que existe y pertenece a la organización
    const existing = await prisma.procedure.findFirst({
      where: {
        id: req.params.id,
        organizationId,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Procedimiento no encontrado' });
    }

    await prisma.procedure.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  })
);

// POST /api/procedures/:id/intraop - Crear registro intraoperatorio
router.post('/:id/intraop', authenticate, tenantMiddleware, authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { organizationId } = req; // Multi-tenancy

    // Verificar que existe el procedimiento y pertenece a la organización
    const procedure = await prisma.procedure.findFirst({
      where: {
        id: req.params.id,
        organizationId, // Multi-tenancy filter
      },
      select: { clinicianId: true },
    });

    if (!procedure) {
      return res.status(404).json({ error: 'Procedimiento no encontrado' });
    }

    // Verificar que el procedimiento tenga clínico asignado
    if (!procedure.clinicianId) {
      return res.status(400).json({
        error: 'El procedimiento no tiene un clínico asignado. Contacte al administrador.'
      });
    }

    // Solo admin o el clínico asignado pueden agregar registros
    if (userRole !== 'ADMIN' && procedure.clinicianId !== userId) {
      return res.status(403).json({
        error: 'No tienes permiso para agregar registros a este procedimiento.'
      });
    }

    const record = await prisma.procedureIntraopRecord.create({
      data: {
        procedureId: req.params.id,
        ...req.body,
      },
    });
    res.status(201).json(record);
  })
);

// PUT /api/procedures/:id/intraop/:recordId - Actualizar registro intraoperatorio
router.put('/:id/intraop/:recordId', authenticate, tenantMiddleware, authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { organizationId } = req; // Multi-tenancy

    // Verificar que existe el procedimiento y pertenece a la organización
    const procedure = await prisma.procedure.findFirst({
      where: {
        id: req.params.id,
        organizationId, // Multi-tenancy filter
      },
      select: { clinicianId: true },
    });

    if (!procedure) {
      return res.status(404).json({ error: 'Procedimiento no encontrado' });
    }

    // Verificar que el procedimiento tenga clínico asignado
    if (!procedure.clinicianId) {
      return res.status(400).json({
        error: 'El procedimiento no tiene un clínico asignado. Contacte al administrador.'
      });
    }

    // Solo admin o el clínico asignado pueden editar registros
    if (userRole !== 'ADMIN' && procedure.clinicianId !== userId) {
      return res.status(403).json({
        error: 'No tienes permiso para editar registros de este procedimiento.'
      });
    }

    const record = await prisma.procedureIntraopRecord.update({
      where: { id: req.params.recordId },
      data: req.body,
    });
    res.json(record);
  })
);

// DELETE /api/procedures/:id/intraop/:recordId - Eliminar registro intraoperatorio
router.delete('/:id/intraop/:recordId', authenticate, tenantMiddleware, authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { organizationId } = req; // Multi-tenancy

    // Verificar que existe el procedimiento y pertenece a la organización
    const procedure = await prisma.procedure.findFirst({
      where: {
        id: req.params.id,
        organizationId, // Multi-tenancy filter
      },
      select: { clinicianId: true },
    });

    if (!procedure) {
      return res.status(404).json({ error: 'Procedimiento no encontrado' });
    }

    // Verificar que el procedimiento tenga clínico asignado
    if (!procedure.clinicianId) {
      return res.status(400).json({
        error: 'El procedimiento no tiene un clínico asignado. Contacte al administrador.'
      });
    }

    // Solo admin o el clínico asignado puede eliminar registros
    if (userRole !== 'ADMIN' && procedure.clinicianId !== userId) {
      return res.status(403).json({
        error: 'No tienes permiso para eliminar registros de este procedimiento.'
      });
    }

    await prisma.procedureIntraopRecord.delete({
      where: { id: req.params.recordId },
    });
    res.status(204).send();
  })
);

module.exports = router;
