// src/routes/admin.js - Rutas del panel de administración
const express = require('express');
const router = express.Router();
const { authenticate, authorize, ROLES } = require('../middlewares/auth');
const { tenantMiddleware } = require('../middlewares/tenant');
const { asyncHandler } = require('../middlewares/errorHandler');
const prisma = require('../lib/prisma');

// Todas las rutas de admin requieren autenticación, autorización ADMIN, y organización
router.use(authenticate);
router.use(authorize(ROLES.ADMIN));
router.use(tenantMiddleware);

// ==============================================================================
// GESTIÓN DE USUARIOS (Clinicians)
// ==============================================================================

// GET /api/admin/users - Listar todos los usuarios de la organización
router.get('/users',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, search, role, active } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      organizationId: req.organizationId, // Multi-tenancy: solo usuarios de esta org
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(role && { userRole: role }),
      ...(active !== undefined && { isActive: active === 'true' }),
    };

    const [users, total] = await Promise.all([
      prisma.clinician.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              teamAssignments: true,
              procedures: true,
              preopEvaluations: true,
            },
          },
        },
      }),
      prisma.clinician.count({ where }),
    ]);

    res.json({
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  })
);

// GET /api/admin/users/:id - Obtener usuario por ID
router.get('/users/:id',
  asyncHandler(async (req, res) => {
    const user = await prisma.clinician.findFirst({
      where: {
        id: parseInt(req.params.id),
        organizationId: req.organizationId, // Multi-tenancy
      },
      include: {
        _count: {
          select: {
            teamAssignments: true,
            procedures: true,
            preopEvaluations: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(user);
  })
);

// POST /api/admin/users - Crear usuario en la organización
router.post('/users',
  asyncHandler(async (req, res) => {
    const bcrypt = require('bcrypt');
    const { name, email, specialty, phone, userRole, password } = req.body;

    // Validar campos requeridos
    if (!name || !email) {
      return res.status(400).json({ error: 'Nombre y email son requeridos' });
    }

    // Validar email único globalmente
    const existing = await prisma.clinician.findUnique({
      where: { email },
    });

    if (existing) {
      return res.status(400).json({ error: 'El email ya está en uso' });
    }

    // Generar ID único
    const maxId = await prisma.clinician.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    const newId = (maxId?.id || 0) + 1;

    // Hashear contraseña si se proporciona (legacy - ahora se usa Clerk)
    const SALT_ROUNDS = 10;
    const hashedPassword = password
      ? await bcrypt.hash(password, SALT_ROUNDS)
      : null;

    const user = await prisma.clinician.create({
      data: {
        id: newId,
        name,
        email,
        specialty,
        phone,
        userRole: userRole || 'VIEWER',
        password: hashedPassword,
        organizationId: req.organizationId, // Multi-tenancy: asignar a esta org
      },
    });

    res.status(201).json(user);
  })
);

// PUT /api/admin/users/:id - Actualizar usuario de la organización
router.put('/users/:id',
  asyncHandler(async (req, res) => {
    const bcrypt = require('bcrypt');
    const { name, email, specialty, phone, userRole, password, isActive } = req.body;
    const userId = parseInt(req.params.id);

    // Verificar que el usuario pertenece a esta organización
    const existingUser = await prisma.clinician.findFirst({
      where: {
        id: userId,
        organizationId: req.organizationId, // Multi-tenancy
      },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Validar email único (excluyendo al usuario actual)
    if (email) {
      const existing = await prisma.clinician.findUnique({
        where: { email },
      });

      if (existing && existing.id !== userId) {
        return res.status(400).json({ error: 'El email ya está en uso' });
      }
    }

    const updateData = {
      ...(name && { name }),
      ...(email && { email }),
      ...(specialty && { specialty }),
      ...(phone !== undefined && { phone }),
      ...(userRole && { userRole }),
      ...(isActive !== undefined && { isActive }),
    };

    // Si se proporciona nueva contraseña, hashearla
    if (password) {
      const SALT_ROUNDS = 10;
      updateData.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    const user = await prisma.clinician.update({
      where: { id: userId },
      data: updateData,
    });

    res.json(user);
  })
);

// DELETE /api/admin/users/:id - Eliminar usuario
router.delete('/users/:id',
  asyncHandler(async (req, res) => {
    const userId = parseInt(req.params.id);

    // Verificar que el usuario pertenece a esta organización
    const user = await prisma.clinician.findFirst({
      where: {
        id: userId,
        organizationId: req.organizationId, // Multi-tenancy
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.userRole === 'ADMIN') {
      return res.status(403).json({
        error: 'No se puede eliminar un usuario administrador',
      });
    }

    await prisma.clinician.delete({
      where: { id: userId },
    });

    res.status(204).send();
  })
);

// ==============================================================================
// GESTIÓN DE PACIENTES
// ==============================================================================

// GET /api/admin/patients - Listar pacientes con filtros avanzados
router.get('/patients',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, search, provider, transplanted } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      organizationId: req.organizationId, // Multi-tenancy
      deletedAt: null, // Solo activos
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { id: { contains: search } },
        ],
      }),
      ...(provider && { provider }),
      ...(transplanted !== undefined && { transplanted: transplanted === 'true' }),
    };

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              cases: true,
              procedures: true,
              preops: true,
            },
          },
        },
      }),
      prisma.patient.count({ where }),
    ]);

    res.json({
      data: patients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  })
);

// GET /api/admin/patients/:id - Obtener paciente completo
router.get('/patients/:id',
  asyncHandler(async (req, res) => {
    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.organizationId, // Multi-tenancy
        deletedAt: null,
      },
      include: {
        cases: {
          where: { deletedAt: null },
          orderBy: { startAt: 'desc' },
          include: {
            team: {
              include: { clinician: { select: { id: true, name: true } } },
            },
          },
        },
        procedures: {
          orderBy: { startAt: 'desc' },
        },
        preops: {
          orderBy: { evaluationDate: 'desc' },
          include: {
            etiologies: {
              include: { etiology: true },
            },
          },
        },
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }

    res.json(patient);
  })
);

// ==============================================================================
// GESTIÓN DE CATÁLOGOS
// ==============================================================================

// ---------- ETIOLOGÍAS ----------
// GET endpoint accessible to all authenticated users (for dropdowns/filters)
router.get('/catalogs/etiologies', authenticate,
  asyncHandler(async (req, res) => {
    const { category, active } = req.query;

    const etiologies = await prisma.etiology.findMany({
      where: {
        ...(category && { category }),
        ...(active !== undefined && { active: active === 'true' }),
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { preopEtiologies: true } },
      },
    });

    res.json({ data: etiologies });
  })
);

router.post('/catalogs/etiologies', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const etiology = await prisma.etiology.create({
      data: req.body,
    });
    res.status(201).json(etiology);
  })
);

router.put('/catalogs/etiologies/:id', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const etiology = await prisma.etiology.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(etiology);
  })
);

router.delete('/catalogs/etiologies/:id', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.etiology.update({
      where: { id: req.params.id },
      data: { active: false },
    });
    res.status(204).send();
  })
);

// ---------- ANTIBIÓTICOS ----------
router.get('/catalogs/antibiotics', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const antibiotics = await prisma.antibiotic.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    res.json({ data: antibiotics });
  })
);

router.post('/catalogs/antibiotics', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const antibiotic = await prisma.antibiotic.create({
      data: req.body,
    });
    res.status(201).json(antibiotic);
  })
);

router.put('/catalogs/antibiotics/:id', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const antibiotic = await prisma.antibiotic.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(antibiotic);
  })
);

// ---------- POSICIONES ----------
router.get('/catalogs/positions', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const positions = await prisma.position.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    res.json({ data: positions });
  })
);

router.post('/catalogs/positions', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const position = await prisma.position.create({
      data: req.body,
    });
    res.status(201).json(position);
  })
);

router.put('/catalogs/positions/:id', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const position = await prisma.position.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(position);
  })
);

// ---------- LOCACIONES ----------
router.get('/catalogs/locations', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const { type } = req.query;

    const locations = await prisma.location.findMany({
      where: {
        active: true,
        ...(type && { type }),
      },
      orderBy: { name: 'asc' },
    });
    res.json({ data: locations });
  })
);

router.post('/catalogs/locations', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const location = await prisma.location.create({
      data: req.body,
    });
    res.status(201).json(location);
  })
);

router.put('/catalogs/locations/:id', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const location = await prisma.location.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(location);
  })
);

// ==============================================================================
// ESTADÍSTICAS DEL SISTEMA
// ==============================================================================

router.get('/stats',
  asyncHandler(async (req, res) => {
    const orgId = req.organizationId;

    const [
      totalUsers,
      totalPatients,
      totalCases,
      totalProcedures,
      totalPreops,
      usersByRole,
      casesByMonthRaw,
    ] = await Promise.all([
      prisma.clinician.count({ where: { organizationId: orgId } }),
      prisma.patient.count({ where: { organizationId: orgId, deletedAt: null } }),
      prisma.transplantCase.count({ where: { organizationId: orgId, deletedAt: null } }),
      prisma.procedure.count({ where: { organizationId: orgId } }),
      prisma.preopEvaluation.count({ where: { organizationId: orgId } }),
      prisma.clinician.groupBy({
        by: ['userRole'],
        where: { organizationId: orgId },
        _count: true,
      }),
      prisma.$queryRaw`
        SELECT
          DATE_TRUNC('month', "startAt") as month,
          COUNT(*) as count
        FROM transplant_cases
        WHERE "startAt" IS NOT NULL
          AND "organizationId" = ${orgId}
          AND "deletedAt" IS NULL
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12
      `,
    ]);

    // Convertir BigInt a Number para serialización JSON
    const casesByMonth = casesByMonthRaw.map(row => ({
      month: row.month,
      count: Number(row.count),
    }));

    res.json({
      users: {
        total: totalUsers,
        byRole: usersByRole.reduce((acc, { userRole, _count }) => {
          acc[userRole.toLowerCase()] = _count;
          return acc;
        }, {}),
      },
      patients: totalPatients,
      cases: totalCases,
      procedures: totalProcedures,
      preops: totalPreops,
      casesByMonth,
    });
  })
);

// ==============================================================================
// GESTIÓN DE PROTOCOLOS DE ANTIBIÓTICOS
// ==============================================================================

// ---------- PROTOCOLOS ----------
// GET /api/admin/protocols - Listar protocolos
router.get('/protocols', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const { type, active } = req.query;

    const protocols = await prisma.antibioticProtocol.findMany({
      where: {
        ...(type && { type }),
        ...(active !== undefined && { active: active === 'true' }),
      },
      include: {
        phases: {
          include: {
            antibiotics: true,
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: [{ isStandard: 'desc' }, { name: 'asc' }],
    });

    res.json({ data: protocols });
  })
);

// GET /api/admin/protocols/:id - Obtener protocolo específico
router.get('/protocols/:id', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const protocol = await prisma.antibioticProtocol.findUnique({
      where: { id: req.params.id },
      include: {
        phases: {
          include: {
            antibiotics: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!protocol) {
      return res.status(404).json({ error: 'Protocolo no encontrado' });
    }

    res.json(protocol);
  })
);

// POST /api/admin/protocols - Crear protocolo
router.post('/protocols', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const { phases, ...protocolData } = req.body;

    const protocol = await prisma.antibioticProtocol.create({
      data: protocolData,
      include: {
        phases: {
          include: { antibiotics: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    res.status(201).json(protocol);
  })
);

// PUT /api/admin/protocols/:id - Actualizar protocolo
router.put('/protocols/:id', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const { phases, ...protocolData } = req.body;

    const protocol = await prisma.antibioticProtocol.update({
      where: { id: req.params.id },
      data: protocolData,
      include: {
        phases: {
          include: { antibiotics: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    res.json(protocol);
  })
);

// DELETE /api/admin/protocols/:id - Desactivar protocolo
router.delete('/protocols/:id', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.antibioticProtocol.update({
      where: { id: req.params.id },
      data: { active: false },
    });

    res.status(204).send();
  })
);

// ---------- FASES DE PROTOCOLO ----------
// POST /api/admin/protocols/:protocolId/phases - Crear fase
router.post('/protocols/:protocolId/phases', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const { antibiotics, ...phaseData } = req.body;

    const phase = await prisma.protocolPhase.create({
      data: {
        ...phaseData,
        protocolId: req.params.protocolId,
      },
      include: {
        antibiotics: {
          orderBy: { order: 'asc' },
        },
      },
    });

    res.status(201).json(phase);
  })
);

// PUT /api/admin/protocols/:protocolId/phases/:phaseId - Actualizar fase
router.put('/protocols/:protocolId/phases/:phaseId', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const { antibiotics, ...phaseData } = req.body;

    const phase = await prisma.protocolPhase.update({
      where: { id: req.params.phaseId },
      data: phaseData,
      include: {
        antibiotics: {
          orderBy: { order: 'asc' },
        },
      },
    });

    res.json(phase);
  })
);

// DELETE /api/admin/protocols/:protocolId/phases/:phaseId - Eliminar fase
router.delete('/protocols/:protocolId/phases/:phaseId', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.protocolPhase.delete({
      where: { id: req.params.phaseId },
    });

    res.status(204).send();
  })
);

// ---------- ANTIBIÓTICOS DE FASE ----------
// POST /api/admin/protocols/:protocolId/phases/:phaseId/antibiotics - Agregar antibiótico a fase
router.post('/protocols/:protocolId/phases/:phaseId/antibiotics', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const antibiotic = await prisma.protocolAntibiotic.create({
      data: {
        ...req.body,
        phaseId: req.params.phaseId,
      },
    });

    res.status(201).json(antibiotic);
  })
);

// PUT /api/admin/protocols/:protocolId/phases/:phaseId/antibiotics/:antibioticId - Actualizar antibiótico
router.put('/protocols/:protocolId/phases/:phaseId/antibiotics/:antibioticId', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const antibiotic = await prisma.protocolAntibiotic.update({
      where: { id: req.params.antibioticId },
      data: req.body,
    });

    res.json(antibiotic);
  })
);

// DELETE /api/admin/protocols/:protocolId/phases/:phaseId/antibiotics/:antibioticId - Eliminar antibiótico
router.delete('/protocols/:protocolId/phases/:phaseId/antibiotics/:antibioticId', authenticate, authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.protocolAntibiotic.delete({
      where: { id: req.params.antibioticId },
    });

    res.status(204).send();
  })
);

// ==============================================================================
// EXPORTACIÓN PARA INVESTIGACIÓN (Research Export)
// ==============================================================================

const researchExportService = require('../services/researchExportService');

/**
 * GET /api/admin/research-export/preview
 * Obtiene vista previa de la exportación (conteos sin generar datos)
 */
router.get('/research-export/preview',
  asyncHandler(async (req, res) => {
    const {
      fromDate,
      toDate,
      year,
      dataSources,
      includeRetransplants,
      includeHepatoRenal,
    } = req.query;

    const filters = {
      organizationId: req.organizationId,
      ...(fromDate && { fromDate }),
      ...(toDate && { toDate }),
      ...(year && { year: parseInt(year) }),
      ...(dataSources && { dataSources: dataSources.split(',') }),
      ...(includeRetransplants !== undefined && { includeRetransplants: includeRetransplants === 'true' }),
      ...(includeHepatoRenal !== undefined && { includeHepatoRenal: includeHepatoRenal === 'true' }),
    };

    const preview = await researchExportService.getExportPreview(filters);

    res.json(preview);
  })
);

/**
 * GET /api/admin/research-export/options
 * Obtiene opciones disponibles (años, fuentes de datos)
 */
router.get('/research-export/options',
  asyncHandler(async (req, res) => {
    const [dataSources, years] = await Promise.all([
      researchExportService.getAvailableDataSources(),
      researchExportService.getAvailableYears(),
    ]);

    const availableTables = [
      { id: 'patients', name: 'Pacientes', description: 'Datos demográficos y seguimiento' },
      { id: 'cases', name: 'Casos', description: 'Datos del trasplante' },
      { id: 'preop', name: 'Preoperatorio', description: 'Scores y comorbilidades' },
      { id: 'preop_labs', name: 'Labs Preop', description: 'Laboratorios preoperatorios' },
      { id: 'intraop', name: 'Intraoperatorio', description: 'Constantes vitales, labs, ROTEM, ETE' },
      { id: 'fluids_blood', name: 'Fluidos/Hemoderivados', description: 'Balance por fase' },
      { id: 'drugs', name: 'Fármacos', description: 'Fármacos administrados' },
      { id: 'lines_monitoring', name: 'Líneas/Monitoreo', description: 'Accesos y equipamiento' },
      { id: 'postop', name: 'Postoperatorio', description: 'Complicaciones y estancia' },
      { id: 'mortality', name: 'Mortalidad', description: 'Supervivencia y reingresos' },
      { id: 'team', name: 'Equipo', description: 'Equipo quirúrgico' },
    ];

    res.json({
      dataSources,
      years,
      tables: availableTables,
    });
  })
);

/**
 * POST /api/admin/research-export/generate
 * Genera y descarga la exportación para investigación
 */
router.post('/research-export/generate',
  asyncHandler(async (req, res) => {
    const {
      filters = {},
      options = {},
    } = req.body;

    // Agregar organizationId del tenant
    filters.organizationId = req.organizationId;

    // Logging
    console.log(`[Research Export] Admin ${req.user?.email} generating export`, {
      filters,
      options,
    });

    // Generar exportación
    const { files, stats } = await researchExportService.generateResearchExport(filters, options);

    if (files.length === 0) {
      return res.status(404).json({
        error: 'No data',
        message: 'No se encontraron datos que coincidan con los filtros especificados',
      });
    }

    // Crear ZIP
    const zipBuffer = await researchExportService.createZipArchive(files);

    // Nombre del archivo
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `txh-research-export-${timestamp}.zip`;

    // Enviar archivo
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', zipBuffer.length);

    res.send(zipBuffer);

    console.log(`[Research Export] Successfully generated: ${stats.cases} cases, ${stats.intraopRecords} intraop records`);
  })
);

/**
 * GET /api/admin/research-export/dictionary
 * Descarga solo el diccionario de datos
 */
router.get('/research-export/dictionary',
  asyncHandler(async (req, res) => {
    const dictionary = researchExportService.RESEARCH_DATA_DICTIONARY;

    // Convertir a formato CSV
    const rows = [];
    Object.entries(dictionary).forEach(([tableName, fields]) => {
      Object.entries(fields).forEach(([fieldName, def]) => {
        rows.push({
          table: tableName,
          field: fieldName,
          description: def.description || '',
          type: def.type || '',
          unit: def.unit || '',
          values: def.values || '',
          range: def.range || '',
          normal: def.normal || '',
          example: def.example || '',
        });
      });
    });

    // Generar CSV
    const { Parser } = require('json2csv');
    const parser = new Parser({
      fields: ['table', 'field', 'description', 'type', 'unit', 'values', 'range', 'normal', 'example'],
    });
    const csv = parser.parse(rows);

    const timestamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="txh-data-dictionary-${timestamp}.csv"`);
    res.send('\ufeff' + csv);
  })
);

module.exports = router;
