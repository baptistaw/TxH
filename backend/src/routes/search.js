// src/routes/search.js - Rutas de búsqueda avanzada y timeline
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { tenantMiddleware } = require('../middlewares/tenant');
const { asyncHandler } = require('../middlewares/errorHandler');
const { validate } = require('../middlewares/validate');
const { z } = require('zod');
const prisma = require('../lib/prisma');

// ============================================================================
// SCHEMAS DE VALIDACIÓN
// ============================================================================

// Schema para búsqueda global unificada
const globalSearchSchema = z.object({
  q: z.string().min(2, 'La búsqueda debe tener al menos 2 caracteres'),
  type: z.enum(['all', 'patients', 'procedures', 'preops']).optional().default('all'),
  limit: z.coerce.number().int().positive().max(50).optional().default(10),
});

// Schema para búsqueda avanzada de pacientes
const advancedPatientSearchSchema = z.object({
  // Búsqueda de texto
  q: z.string().optional(),
  // Filtros demográficos
  sex: z.enum(['M', 'F', 'O']).optional(),
  ageMin: z.coerce.number().int().min(0).optional(),
  ageMax: z.coerce.number().int().max(120).optional(),
  bloodGroup: z.string().optional(),
  provider: z.enum(['ASSE', 'FEMI', 'CASMU', 'MP', 'OTRA']).optional(),
  // Filtros de estado
  transplanted: z.enum(['true', 'false', 'all']).optional(),
  hasPreop: z.enum(['true', 'false']).optional(),
  // Filtros de fecha
  admissionDateFrom: z.string().optional(),
  admissionDateTo: z.string().optional(),
  transplantDateFrom: z.string().optional(),
  transplantDateTo: z.string().optional(),
  // Paginación
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  // Ordenamiento
  sortBy: z.enum(['name', 'admissionDate', 'transplantDate', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Schema para búsqueda avanzada de procedimientos
const advancedProcedureSearchSchema = z.object({
  // Búsqueda de texto
  q: z.string().optional(),
  // Filtros de tipo
  procedureType: z.string().optional(),
  location: z.string().optional(),
  asa: z.enum(['I', 'II', 'III', 'IV', 'V', 'VI']).optional(),
  // Filtros de protocolo (KPIs)
  bloodReplacementProtocol: z.enum(['true', 'false', 'null']).optional(),
  antibioticProphylaxisProtocol: z.enum(['true', 'false', 'null']).optional(),
  fastTrackProtocol: z.enum(['true', 'false', 'null']).optional(),
  // Filtros de fecha
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  // Filtros de paciente
  patientId: z.string().optional(),
  patientName: z.string().optional(),
  // Filtros de clínico
  clinicianId: z.coerce.number().optional(),
  // Paginación
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  // Ordenamiento
  sortBy: z.enum(['startAt', 'endAt', 'createdAt', 'patientName']).optional().default('startAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ============================================================================
// BÚSQUEDA GLOBAL UNIFICADA
// ============================================================================

/**
 * GET /api/search/global
 * Búsqueda unificada que busca en pacientes, procedimientos y preops
 */
router.get('/global', authenticate, tenantMiddleware, validate(globalSearchSchema, 'query'), asyncHandler(async (req, res) => {
  const { q, type, limit } = req.query;
  const { organizationId } = req; // Multi-tenancy
  const searchTerm = q.toLowerCase();

  const results = {
    patients: [],
    procedures: [],
    preops: [],
    totalResults: 0,
  };

  // Búsqueda en Pacientes
  if (type === 'all' || type === 'patients') {
    const patients = await prisma.patient.findMany({
      where: {
        organizationId, // Multi-tenancy filter
        OR: [
          { id: { contains: searchTerm } },
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { fnr: { contains: searchTerm } },
          { bloodGroup: { contains: searchTerm, mode: 'insensitive' } },
          { observations: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        fnr: true,
        sex: true,
        birthDate: true,
        provider: true,
        transplanted: true,
        bloodGroup: true,
        _count: { select: { procedures: true, preops: true } },
      },
    });

    results.patients = patients.map(p => ({
      ...p,
      type: 'patient',
      matchField: getMatchField(p, searchTerm),
    }));
  }

  // Búsqueda en Procedimientos
  if (type === 'all' || type === 'procedures') {
    const procedures = await prisma.procedure.findMany({
      where: {
        organizationId, // Multi-tenancy filter
        OR: [
          { patientId: { contains: searchTerm } },
          { patient: { name: { contains: searchTerm, mode: 'insensitive' } } },
          { procedureTypeDetail: { contains: searchTerm, mode: 'insensitive' } },
          { observations: { contains: searchTerm, mode: 'insensitive' } },
          { complications: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { startAt: 'desc' },
      select: {
        id: true,
        patientId: true,
        procedureType: true,
        procedureTypeDetail: true,
        location: true,
        startAt: true,
        endAt: true,
        patient: {
          select: { name: true },
        },
        clinician: {
          select: { name: true },
        },
      },
    });

    results.procedures = procedures.map(p => ({
      ...p,
      type: 'procedure',
    }));
  }

  // Búsqueda en Evaluaciones Preoperatorias
  if (type === 'all' || type === 'preops') {
    const preops = await prisma.preopEvaluation.findMany({
      where: {
        organizationId, // Multi-tenancy filter
        OR: [
          { patientId: { contains: searchTerm } },
          { patient: { name: { contains: searchTerm, mode: 'insensitive' } } },
          { etiology1: { contains: searchTerm, mode: 'insensitive' } },
          { etiology2: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { evaluationDate: 'desc' },
      select: {
        id: true,
        patientId: true,
        evaluationDate: true,
        meld: true,
        child: true,
        etiology1: true,
        patient: {
          select: { name: true },
        },
        clinician: {
          select: { name: true },
        },
      },
    });

    results.preops = preops.map(p => ({
      ...p,
      type: 'preop',
    }));
  }

  results.totalResults = results.patients.length + results.procedures.length + results.preops.length;

  res.json(results);
}));

// ============================================================================
// BÚSQUEDA AVANZADA DE PACIENTES
// ============================================================================

/**
 * GET /api/search/patients/advanced
 * Búsqueda avanzada de pacientes con múltiples filtros
 */
router.get('/patients/advanced', authenticate, tenantMiddleware, validate(advancedPatientSearchSchema, 'query'), asyncHandler(async (req, res) => {
  const {
    q,
    sex,
    ageMin,
    ageMax,
    bloodGroup,
    provider,
    transplanted,
    hasPreop,
    admissionDateFrom,
    admissionDateTo,
    transplantDateFrom,
    transplantDateTo,
    page,
    limit,
    sortBy,
    sortOrder,
  } = req.query;
  const { organizationId } = req; // Multi-tenancy

  const skip = (page - 1) * limit;

  // Construir filtro de edad basado en fecha de nacimiento
  const today = new Date();
  let birthDateFilter = {};
  if (ageMin !== undefined || ageMax !== undefined) {
    if (ageMax !== undefined) {
      const minBirthDate = new Date(today.getFullYear() - ageMax - 1, today.getMonth(), today.getDate());
      birthDateFilter.gte = minBirthDate;
    }
    if (ageMin !== undefined) {
      const maxBirthDate = new Date(today.getFullYear() - ageMin, today.getMonth(), today.getDate());
      birthDateFilter.lte = maxBirthDate;
    }
  }

  // Construir where clause - SIEMPRE incluir organizationId
  const where = {
    organizationId, // Multi-tenancy filter
    // Búsqueda de texto
    ...(q && {
      OR: [
        { id: { contains: q } },
        { name: { contains: q, mode: 'insensitive' } },
        { fnr: { contains: q } },
      ],
    }),
    // Filtros demográficos
    ...(sex && { sex }),
    ...(Object.keys(birthDateFilter).length > 0 && { birthDate: birthDateFilter }),
    ...(bloodGroup && { bloodGroup: { contains: bloodGroup, mode: 'insensitive' } }),
    ...(provider && { provider }),
    // Estado de trasplante
    ...(transplanted && transplanted !== 'all' && { transplanted: transplanted === 'true' }),
    // Tiene evaluación preop
    ...(hasPreop && {
      preops: hasPreop === 'true' ? { some: {} } : { none: {} },
    }),
    // Filtros de fecha de admisión
    ...((admissionDateFrom || admissionDateTo) && {
      admissionDate: {
        ...(admissionDateFrom && { gte: new Date(admissionDateFrom) }),
        ...(admissionDateTo && { lte: new Date(admissionDateTo) }),
      },
    }),
    // Filtros de fecha de trasplante (a través de procedures)
    ...((transplantDateFrom || transplantDateTo) && {
      procedures: {
        some: {
          procedureType: { in: ['TRASPLANTE_HEPATICO', 'RETRASPLANTE_HEPATICO'] },
          startAt: {
            ...(transplantDateFrom && { gte: new Date(transplantDateFrom) }),
            ...(transplantDateTo && { lte: new Date(transplantDateTo) }),
          },
        },
      },
    }),
  };

  // Construir orderBy
  let orderBy = {};
  switch (sortBy) {
    case 'name':
      orderBy = { name: sortOrder };
      break;
    case 'admissionDate':
      orderBy = { admissionDate: sortOrder };
      break;
    case 'transplantDate':
      // Ordenar por fecha de procedimiento más reciente
      orderBy = { procedures: { _count: sortOrder } }; // Fallback
      break;
    default:
      orderBy = { createdAt: sortOrder };
  }

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        _count: { select: { procedures: true, preops: true } },
        procedures: {
          where: { procedureType: { in: ['TRASPLANTE_HEPATICO', 'RETRASPLANTE_HEPATICO'] } },
          orderBy: { startAt: 'desc' },
          take: 1,
          select: { startAt: true, procedureType: true },
        },
        preops: {
          orderBy: { evaluationDate: 'desc' },
          take: 1,
          select: { evaluationDate: true, meld: true, child: true },
        },
      },
    }),
    prisma.patient.count({ where }),
  ]);

  // Enriquecer datos
  const enrichedPatients = patients.map(p => ({
    ...p,
    age: p.birthDate ? calculateAge(p.birthDate) : null,
    lastTransplant: p.procedures[0] || null,
    lastPreop: p.preops[0] || null,
  }));

  res.json({
    data: enrichedPatients,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    filters: {
      applied: Object.keys(req.query).filter(k => !['page', 'limit', 'sortBy', 'sortOrder'].includes(k)).length,
    },
  });
}));

// ============================================================================
// BÚSQUEDA AVANZADA DE PROCEDIMIENTOS
// ============================================================================

/**
 * GET /api/search/procedures/advanced
 * Búsqueda avanzada de procedimientos con múltiples filtros
 */
router.get('/procedures/advanced', authenticate, tenantMiddleware, validate(advancedProcedureSearchSchema, 'query'), asyncHandler(async (req, res) => {
  const {
    q,
    procedureType,
    location,
    asa,
    bloodReplacementProtocol,
    antibioticProphylaxisProtocol,
    fastTrackProtocol,
    dateFrom,
    dateTo,
    patientId,
    patientName,
    clinicianId,
    page,
    limit,
    sortBy,
    sortOrder,
  } = req.query;
  const { organizationId } = req; // Multi-tenancy

  const skip = (page - 1) * limit;

  // Convertir valores de protocolo
  const parseProtocolValue = (val) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (val === 'null') return null;
    return undefined;
  };

  // SIEMPRE incluir organizationId
  const where = {
    organizationId, // Multi-tenancy filter
    // Búsqueda de texto
    ...(q && {
      OR: [
        { patientId: { contains: q } },
        { patient: { name: { contains: q, mode: 'insensitive' } } },
        { procedureTypeDetail: { contains: q, mode: 'insensitive' } },
        { observations: { contains: q, mode: 'insensitive' } },
      ],
    }),
    // Filtros de tipo
    ...(procedureType && { procedureType }),
    ...(location && { location }),
    ...(asa && { asa }),
    // Filtros de protocolo (KPIs)
    ...(bloodReplacementProtocol !== undefined && {
      bloodReplacementProtocol: parseProtocolValue(bloodReplacementProtocol),
    }),
    ...(antibioticProphylaxisProtocol !== undefined && {
      antibioticProphylaxisProtocol: parseProtocolValue(antibioticProphylaxisProtocol),
    }),
    ...(fastTrackProtocol !== undefined && {
      fastTrackProtocol: parseProtocolValue(fastTrackProtocol),
    }),
    // Filtros de fecha
    ...((dateFrom || dateTo) && {
      startAt: {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      },
    }),
    // Filtros de paciente
    ...(patientId && { patientId }),
    ...(patientName && { patient: { name: { contains: patientName, mode: 'insensitive' } } }),
    // Filtros de clínico
    ...(clinicianId && { clinicianId }),
  };

  // Construir orderBy
  let orderBy = {};
  switch (sortBy) {
    case 'startAt':
      orderBy = { startAt: sortOrder };
      break;
    case 'endAt':
      orderBy = { endAt: sortOrder };
      break;
    case 'patientName':
      orderBy = { patient: { name: sortOrder } };
      break;
    default:
      orderBy = { createdAt: sortOrder };
  }

  const [procedures, total] = await Promise.all([
    prisma.procedure.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        patient: {
          select: { id: true, name: true, sex: true, birthDate: true },
        },
        clinician: {
          select: { id: true, name: true, specialty: true },
        },
        _count: { select: { intraopRecordsProcedure: true } },
      },
    }),
    prisma.procedure.count({ where }),
  ]);

  // Enriquecer con duración
  const enrichedProcedures = procedures.map(p => ({
    ...p,
    duration: p.startAt && p.endAt ? calculateDuration(p.startAt, p.endAt) : null,
    patientAge: p.patient?.birthDate ? calculateAge(p.patient.birthDate) : null,
  }));

  res.json({
    data: enrichedProcedures,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}));

// ============================================================================
// TIMELINE DEL PACIENTE
// ============================================================================

/**
 * GET /api/search/patients/:id/timeline
 * Obtener timeline completo del paciente con todos los eventos
 */
router.get('/patients/:id/timeline', authenticate, tenantMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { organizationId } = req; // Multi-tenancy

  // Obtener paciente con todas sus relaciones, verificando organización
  const patient = await prisma.patient.findFirst({
    where: {
      id,
      organizationId, // Multi-tenancy filter
    },
    include: {
      // Evaluaciones preoperatorias
      preops: {
        orderBy: { evaluationDate: 'desc' },
        include: {
          clinician: { select: { id: true, name: true } },
        },
      },
      // Procedimientos
      procedures: {
        orderBy: { startAt: 'desc' },
        include: {
          clinician: { select: { id: true, name: true } },
          _count: { select: { intraopRecordsProcedure: true } },
        },
      },
      // Casos antiguos (TransplantCase) si existen
      cases: {
        orderBy: { startAt: 'desc' },
        include: {
          team: {
            include: {
              clinician: { select: { id: true, name: true, specialty: true } },
            },
          },
        },
      },
    },
  });

  if (!patient) {
    return res.status(404).json({ error: 'Paciente no encontrado' });
  }

  // Construir timeline de eventos
  const events = [];

  // Evento: Admisión a lista de espera
  if (patient.admissionDate) {
    events.push({
      id: `admission-${patient.id}`,
      type: 'admission',
      title: 'Ingreso a Lista de Espera',
      description: 'Paciente ingresado a lista de espera de trasplante',
      date: patient.admissionDate,
      icon: '📋',
      color: 'blue',
      details: {
        provider: patient.provider,
      },
    });
  }

  // Eventos: Evaluaciones preoperatorias
  patient.preops.forEach(preop => {
    events.push({
      id: `preop-${preop.id}`,
      type: 'preop',
      title: 'Evaluación Pretrasplante',
      description: `MELD: ${preop.meld || 'N/A'}, Child: ${preop.child || 'N/A'}`,
      date: preop.evaluationDate,
      icon: '🩺',
      color: 'purple',
      linkTo: `/preop/${preop.id}`,
      details: {
        meld: preop.meld,
        child: preop.child,
        etiology: preop.etiology1,
        clinician: preop.clinician?.name,
      },
    });
  });

  // Eventos: Procedimientos
  patient.procedures.forEach(proc => {
    const isTransplant = ['TRASPLANTE_HEPATICO', 'RETRASPLANTE_HEPATICO'].includes(proc.procedureType);
    events.push({
      id: `procedure-${proc.id}`,
      type: isTransplant ? 'transplant' : 'procedure',
      title: formatProcedureType(proc.procedureType),
      description: proc.procedureTypeDetail || proc.location || '',
      date: proc.startAt,
      endDate: proc.endAt,
      icon: isTransplant ? '🫀' : '🏥',
      color: isTransplant ? 'red' : 'green',
      linkTo: `/procedures/${proc.id}`,
      details: {
        location: proc.location,
        duration: proc.startAt && proc.endAt ? calculateDuration(proc.startAt, proc.endAt) : null,
        asa: proc.asa,
        clinician: proc.clinician?.name,
        intraopRecords: proc._count?.intraopRecordsProcedure || 0,
        // KPIs si es trasplante
        ...(isTransplant && {
          bloodReplacementProtocol: proc.bloodReplacementProtocol,
          antibioticProphylaxisProtocol: proc.antibioticProphylaxisProtocol,
          fastTrackProtocol: proc.fastTrackProtocol,
        }),
      },
    });
  });

  // Eventos: Casos antiguos (TransplantCase)
  patient.cases.forEach(tcase => {
    // Solo agregar si no hay un procedure correspondiente
    const hasProcedure = patient.procedures.some(p =>
      p.startAt?.toISOString() === tcase.startAt?.toISOString()
    );

    if (!hasProcedure) {
      events.push({
        id: `case-${tcase.id}`,
        type: 'transplant',
        title: 'Trasplante Hepático (Registro histórico)',
        description: tcase.location || '',
        date: tcase.startAt,
        endDate: tcase.endAt,
        icon: '🫀',
        color: 'red',
        linkTo: `/cases/${tcase.id}`,
        details: {
          location: tcase.location,
          duration: tcase.startAt && tcase.endAt ? calculateDuration(tcase.startAt, tcase.endAt) : null,
          team: tcase.team?.map(t => ({
            role: t.role,
            name: t.clinician?.name,
          })),
        },
        legacy: true,
      });
    }
  });

  // Ordenar eventos por fecha (más reciente primero)
  events.sort((a, b) => {
    const dateA = new Date(a.date || 0);
    const dateB = new Date(b.date || 0);
    return dateB - dateA;
  });

  // Calcular estadísticas del timeline
  const stats = {
    totalEvents: events.length,
    preops: events.filter(e => e.type === 'preop').length,
    procedures: events.filter(e => e.type === 'procedure').length,
    transplants: events.filter(e => e.type === 'transplant').length,
    firstEvent: events[events.length - 1]?.date || null,
    lastEvent: events[0]?.date || null,
    daysSinceAdmission: patient.admissionDate
      ? Math.floor((new Date() - new Date(patient.admissionDate)) / (1000 * 60 * 60 * 24))
      : null,
  };

  res.json({
    patient: {
      id: patient.id,
      name: patient.name,
      sex: patient.sex,
      birthDate: patient.birthDate,
      age: patient.birthDate ? calculateAge(patient.birthDate) : null,
      bloodGroup: patient.bloodGroup,
      provider: patient.provider,
      transplanted: patient.transplanted,
      admissionDate: patient.admissionDate,
    },
    timeline: events,
    stats,
  });
}));

// ============================================================================
// HELPERS
// ============================================================================

function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function calculateDuration(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate - startDate;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes, totalMinutes: hours * 60 + minutes };
}

function getMatchField(patient, searchTerm) {
  if (patient.id?.toLowerCase().includes(searchTerm)) return 'CI';
  if (patient.name?.toLowerCase().includes(searchTerm)) return 'Nombre';
  if (patient.fnr?.toLowerCase().includes(searchTerm)) return 'FNR';
  if (patient.bloodGroup?.toLowerCase().includes(searchTerm)) return 'Grupo sanguíneo';
  return 'Otro';
}

function formatProcedureType(type) {
  const typeMap = {
    'TRASPLANTE_HEPATICO': 'Trasplante Hepático',
    'RETRASPLANTE_HEPATICO': 'Retrasplante Hepático',
    'BIOPSIA_HEPATICA': 'Biopsia Hepática',
    'ENDOSCOPIA': 'Endoscopía',
    'PARACENTESIS': 'Paracentesis',
    'COLANGIOGRAFIA': 'Colangiografía',
    'CPRE': 'CPRE',
    'TIPS': 'TIPS',
    'OTRO': 'Otro procedimiento',
  };
  return typeMap[type] || type;
}

module.exports = router;
