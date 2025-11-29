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

/**
 * GET /api/catalogs/:name
 * Obtener items de un catálogo específico por nombre (público)
 * Query params:
 *   - includeInactive: 'true' para incluir items inactivos (solo admin)
 */
router.get(
  '/:name',
  asyncHandler(async (req, res) => {
    const { name } = req.params;
    const { includeInactive } = req.query;

    // Determinar si incluir items inactivos
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
