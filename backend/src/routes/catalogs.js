// src/routes/catalogs.js - Rutas públicas de catálogos
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middlewares/errorHandler');
const prisma = require('../lib/prisma');
const { authenticate, authorize, ROLES } = require('../middlewares/auth');

/**
 * GET /api/catalogs
 * Obtener lista de todos los catálogos disponibles (público)
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const catalogs = await prisma.catalog.findMany({
      where: { active: true },
      include: {
        items: {
          where: { active: true },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            code: true,
            label: true,
            description: true,
            order: true,
            active: true,
          },
        },
      },
      orderBy: { label: 'asc' },
    });

    res.json({ data: catalogs });
  })
);

// Enums de Prisma como catálogos estáticos
const STATIC_ENUMS = {
  Sex: [
    { code: 'M', label: 'Masculino' },
    { code: 'F', label: 'Femenino' },
    { code: 'O', label: 'Otro' },
  ],
  Provider: [
    { code: 'ASSE', label: 'ASSE' },
    { code: 'ASOC_ESPANOLA', label: 'Asociación Española' },
    { code: 'CASMU', label: 'CASMU' },
    { code: 'COSEM', label: 'COSEM' },
    { code: 'MUCAM', label: 'MUCAM' },
    { code: 'SMI', label: 'SMI' },
    { code: 'MEDICA_URUGUAYA', label: 'Médica Uruguaya' },
    { code: 'OTRO', label: 'Otro' },
  ],
  ASA: [
    { code: 'I', label: 'ASA I' },
    { code: 'II', label: 'ASA II' },
    { code: 'III', label: 'ASA III' },
    { code: 'IV', label: 'ASA IV' },
    { code: 'V', label: 'ASA V' },
    { code: 'VI', label: 'ASA VI' },
  ],
  Specialty: [
    { code: 'ANESTESIOLOGO', label: 'Anestesiólogo' },
    { code: 'CIRUJANO', label: 'Cirujano' },
    { code: 'INTENSIVISTA', label: 'Intensivista' },
    { code: 'HEPATOLOGO', label: 'Hepatólogo' },
    { code: 'COORDINADORA', label: 'Coordinadora' },
    { code: 'OTRO', label: 'Otro' },
  ],
  UserRole: [
    { code: 'ADMIN', label: 'Administrador' },
    { code: 'ANESTESIOLOGO', label: 'Anestesiólogo' },
    { code: 'VIEWER', label: 'Visor' },
  ],
  ProcedureType: [
    // Biopsias hepáticas
    { code: 'BIOPSIA_HEPATICA_PERCUTANEA', label: 'Biopsia hepática percutánea' },
    { code: 'BIOPSIA_HEPATICA_TRANSYUGULAR', label: 'Biopsia hepática transyugular' },
    { code: 'BIOPSIA_HEPATICA_PROTOCOLO', label: 'Biopsia de protocolo post-trasplante' },
    // Endoscopías digestivas
    { code: 'FGC_DIAGNOSTICA', label: 'Fibrogastroscopía diagnóstica' },
    { code: 'FGC_TERAPEUTICA', label: 'Fibrogastroscopía terapéutica' },
    { code: 'FGC_LIGADURA_VARICES', label: 'Ligadura de várices esofágicas' },
    { code: 'FGC_ESCLEROTERAPIA', label: 'Escleroterapia de várices' },
    { code: 'FBC_DIAGNOSTICA', label: 'Fibrocolonoscopía diagnóstica' },
    { code: 'FBC_BIOPSIA', label: 'Fibrocolonoscopía con biopsia' },
    // CPRE y vía biliar
    { code: 'CPRE_DIAGNOSTICA', label: 'CPRE diagnóstica' },
    { code: 'CPRE_ESFINTEROTOMIA', label: 'CPRE con esfinterotomía' },
    { code: 'CPRE_PROTESIS_BILIAR', label: 'CPRE con colocación de prótesis biliar' },
    { code: 'CPRE_DILATACION_ESTENOSIS', label: 'CPRE con dilatación de estenosis' },
    { code: 'COLANGIOGRAFIA_TRANSPARIETOHEPATICA', label: 'Colangiografía transparietohepática' },
    // Procedimientos intervencionistas
    { code: 'TIPS', label: 'TIPS (Shunt portosistémico intrahepático transyugular)' },
    { code: 'PARACENTESIS_DIAGNOSTICA', label: 'Paracentesis diagnóstica' },
    { code: 'PARACENTESIS_EVACUADORA', label: 'Paracentesis evacuadora' },
    { code: 'TORACENTESIS', label: 'Toracentesis' },
    { code: 'ARTERIOGRAFIA_HEPATICA', label: 'Arteriografía hepática' },
    { code: 'EMBOLIZACION_ARTERIAL', label: 'Embolización arterial' },
    { code: 'QUIMIOEMBOLIZACION_TACE', label: 'Quimioembolización transarterial (TACE)' },
    { code: 'RADIOFRECUENCIA_HEPATICA', label: 'Ablación por radiofrecuencia hepática' },
    // Accesos vasculares y diálisis
    { code: 'COLOCACION_CVC', label: 'Colocación de catéter venoso central' },
    { code: 'COLOCACION_CATETER_DIALISIS', label: 'Colocación de catéter de diálisis' },
    { code: 'HEMODIALISIS', label: 'Sesión de hemodiálisis' },
    { code: 'DIALISIS_PERITONEAL', label: 'Diálisis peritoneal' },
    // Cirugías abdominales
    { code: 'LAPAROTOMIA_EXPLORADORA', label: 'Laparotomía exploradora' },
    { code: 'DRENAJE_ABSCESO', label: 'Drenaje de absceso' },
    { code: 'HERNIOPLASTIA', label: 'Reparación de hernia' },
    { code: 'COLECISTECTOMIA', label: 'Colecistectomía' },
    { code: 'ESPLENECTOMIA', label: 'Esplenectomía' },
    { code: 'NEFRECTOMIA', label: 'Nefrectomía' },
    // Cirugías torácicas
    { code: 'TORACOTOMIA', label: 'Toracotomía' },
    { code: 'VIDEOTORACOSCOPIA', label: 'Videotoracoscopía (VATS)' },
    { code: 'DRENAJE_PLEURAL', label: 'Drenaje pleural' },
    // Procedimientos cardíacos
    { code: 'CORONARIOGRAFIA', label: 'Coronariografía' },
    { code: 'ANGIOPLASTIA', label: 'Angioplastia coronaria' },
    { code: 'ECOCARDIOGRAMA_TE', label: 'Ecocardiograma transesofágico' },
    // Procedimientos urológicos
    { code: 'CISTOSCOPIA', label: 'Cistoscopía' },
    { code: 'NEFROSTOMIA_PERCUTANEA', label: 'Nefrostomía percutánea' },
    // Otros procedimientos quirúrgicos
    { code: 'TRAQUEOSTOMIA', label: 'Traqueostomía' },
    { code: 'GASTROSTOMIA_PERCUTANEA', label: 'Gastrostomía percutánea (PEG)' },
    { code: 'CIRUGIA_ORTOPEDICA', label: 'Cirugía ortopédica' },
    { code: 'CIRUGIA_VASCULAR', label: 'Cirugía vascular' },
    { code: 'CIRUGIA_NEUROLOGICA', label: 'Cirugía neurológica' },
    { code: 'PROCEDIMIENTO_DENTAL', label: 'Procedimiento odontológico' },
    // Trasplante
    { code: 'TRASPLANTE_HEPATICO', label: 'Trasplante hepático' },
    { code: 'RETRASPLANTE_HEPATICO', label: 'Retrasplante hepático' },
    { code: 'TRASPLANTE_RENAL', label: 'Trasplante renal' },
    // Otros
    { code: 'CER', label: 'CER' },
    { code: 'OTRO', label: 'Otro procedimiento' },
  ],
  ProcedureLocation: [
    { code: 'BLOCK_QUIRURGICO', label: 'Block Quirúrgico' },
    { code: 'CTI', label: 'CTI' },
    { code: 'HEMODINAMIA', label: 'Hemodinamia' },
    { code: 'ENDOSCOPIA', label: 'Sala de Endoscopía' },
    { code: 'IMAGENES', label: 'Imagenología' },
    { code: 'INTERNACION', label: 'Sala de Internación' },
    { code: 'EMERGENCIA', label: 'Emergencia' },
    { code: 'OTRO', label: 'Otro' },
  ],
};

/**
 * GET /api/catalogs/:name
 * Obtener items de un catálogo específico por nombre (público)
 * Soporta tanto catálogos de BD como enums estáticos
 * Query params:
 *   - includeInactive: 'true' para incluir items inactivos (solo admin)
 */
router.get(
  '/:name',
  asyncHandler(async (req, res) => {
    const { name } = req.params;
    const { includeInactive } = req.query;

    // Verificar si es un enum estático
    if (STATIC_ENUMS[name]) {
      return res.json({
        name,
        label: name,
        items: STATIC_ENUMS[name].map((item, index) => ({
          id: item.code,
          code: item.code,
          label: item.label,
          order: index,
          active: true,
        })),
      });
    }

    // Buscar en catálogos de BD
    const showInactive = includeInactive === 'true';

    const catalog = await prisma.catalog.findUnique({
      where: { name, active: true },
      include: {
        items: {
          where: showInactive ? {} : { active: true },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            code: true,
            label: true,
            description: true,
            order: true,
            active: true,
          },
        },
      },
    });

    if (!catalog) {
      return res.status(404).json({ error: `Catálogo '${name}' no encontrado` });
    }

    res.json(catalog);
  })
);

// ============================================================================
// RUTAS DE ADMINISTRACIÓN (requieren autenticación y rol admin)
// ============================================================================

/**
 * PUT /api/catalogs/admin/:catalogId
 * Actualizar un catálogo (solo admin)
 */
router.put(
  '/admin/:catalogId',
  authenticate,
  authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const { catalogId } = req.params;
    const { label, description, active } = req.body;

    const catalog = await prisma.catalog.update({
      where: { id: catalogId },
      data: { label, description, active },
    });

    res.json(catalog);
  })
);

/**
 * POST /api/catalogs/admin/:catalogId/items
 * Crear un nuevo item en un catálogo (solo admin)
 */
router.post(
  '/admin/:catalogId/items',
  authenticate,
  authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const { catalogId } = req.params;
    const { code, label, description, order } = req.body;

    const item = await prisma.catalogItem.create({
      data: {
        catalogId,
        code,
        label,
        description,
        order: order || 0,
      },
    });

    res.status(201).json(item);
  })
);

/**
 * PUT /api/catalogs/admin/items/:itemId
 * Actualizar un item de catálogo (solo admin)
 */
router.put(
  '/admin/items/:itemId',
  authenticate,
  authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    const { code, label, description, order, active } = req.body;

    const item = await prisma.catalogItem.update({
      where: { id: itemId },
      data: { code, label, description, order, active },
    });

    res.json(item);
  })
);

/**
 * DELETE /api/catalogs/admin/items/:itemId
 * Eliminar un item de catálogo (solo admin) - soft delete
 */
router.delete(
  '/admin/items/:itemId',
  authenticate,
  authorize(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    const { itemId } = req.params;

    // Soft delete - solo marca como inactivo
    await prisma.catalogItem.update({
      where: { id: itemId },
      data: { active: false },
    });

    res.status(204).send();
  })
);

module.exports = router;
