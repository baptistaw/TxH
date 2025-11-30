// src/middlewares/tenant.js - Multi-tenancy middleware
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Middleware de tenant (multi-tenancy)
 *
 * Verifica que el usuario pertenezca a una organización válida
 * e inyecta el organizationId en req para uso en controladores.
 *
 * También puede crear la organización automáticamente si no existe
 * (útil para el bootstrap inicial).
 */
const tenantMiddleware = async (req, res, next) => {
  try {
    // El middleware de auth ya debe haber corrido y agregado req.user
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Usuario no autenticado',
      });
    }

    const { orgId, orgSlug } = req.user;

    // Sin organización activa en Clerk, denegar acceso
    if (!orgId) {
      logger.warn('User without organization tried to access', {
        email: req.user.email,
        clerkId: req.user.clerkId,
      });

      return res.status(403).json({
        error: 'No organization',
        message: 'Debes seleccionar una organización para acceder al sistema. Usa el selector de organización en la barra de navegación.',
      });
    }

    // Buscar o crear la organización en nuestra BD
    let organization = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    // Si la organización no existe, crearla (sincronización con Clerk)
    if (!organization) {
      // Obtener datos de la organización desde el token de Clerk
      // (el nombre y logo vendrán del frontend en el primer request)
      organization = await prisma.organization.create({
        data: {
          id: orgId,
          name: orgSlug || 'Nueva Organización', // Se actualiza después
          slug: orgSlug,
        },
      });

      logger.info('Organization created from Clerk', {
        orgId,
        orgSlug,
      });
    }

    // Verificar que la organización esté activa
    if (!organization.isActive) {
      logger.warn('Inactive organization access attempt', {
        orgId,
        email: req.user.email,
      });

      return res.status(403).json({
        error: 'Organization inactive',
        message: 'Tu organización está desactivada. Contacta al administrador.',
      });
    }

    // Inyectar organizationId en req para uso en controladores
    req.organizationId = orgId;
    req.organization = organization;

    next();
  } catch (error) {
    logger.error('Tenant middleware error', { error: error.message });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error al verificar organización',
    });
  }
};

/**
 * Middleware estricto para operaciones de escritura
 * REQUIERE organización para crear/modificar/eliminar datos
 */
const requireOrganization = (req, res, next) => {
  if (!req.organizationId) {
    return res.status(403).json({
      error: 'No organization',
      message: 'Debes pertenecer a una organización para realizar esta operación.',
    });
  }
  next();
};

/**
 * Middleware opcional de tenant
 * No falla si no hay organización, pero la inyecta si existe
 */
const optionalTenant = async (req, res, next) => {
  if (!req.user || !req.user.orgId) {
    return next();
  }

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: req.user.orgId },
    });

    if (organization && organization.isActive) {
      req.organizationId = req.user.orgId;
      req.organization = organization;
    }
  } catch (error) {
    logger.debug('Optional tenant check failed', { error: error.message });
  }

  next();
};

/**
 * Helper para agregar filtro de organización a queries de Prisma
 *
 * Uso:
 * const patients = await prisma.patient.findMany({
 *   where: withOrg(req, { name: { contains: 'Juan' } }),
 * });
 */
function withOrg(req, where = {}) {
  if (!req.organizationId) {
    throw new Error('organizationId not set. Did you forget to use tenantMiddleware?');
  }

  return {
    ...where,
    organizationId: req.organizationId,
  };
}

/**
 * Helper para agregar organizationId a datos de creación
 *
 * Uso:
 * const patient = await prisma.patient.create({
 *   data: withOrgData(req, { name: 'Juan', ... }),
 * });
 */
function withOrgData(req, data = {}) {
  if (!req.organizationId) {
    throw new Error('organizationId not set. Did you forget to use tenantMiddleware?');
  }

  return {
    ...data,
    organizationId: req.organizationId,
  };
}

module.exports = {
  tenantMiddleware,
  requireOrganization,
  optionalTenant,
  withOrg,
  withOrgData,
};
