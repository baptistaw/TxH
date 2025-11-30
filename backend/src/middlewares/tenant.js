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
 *
 * MODO TRANSICIÓN: Durante la migración de datos históricos, permite
 * acceso sin organización para usuarios autenticados.
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

    // MODO TRANSICIÓN: Permitir acceso sin organización durante migración
    // TODO: Cambiar a strict mode después de migrar todos los datos
    if (!orgId) {
      logger.debug('User without organization accessing system (transition mode)', {
        email: req.user.email,
        clerkId: req.user.clerkId,
      });

      // Permitir acceso sin organizationId (datos no filtrados por org)
      req.organizationId = null;
      req.organization = null;
      return next();
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
 * MODO TRANSICIÓN: Si no hay organizationId, no agrega filtro
 * (devuelve todos los datos sin filtrar por org)
 *
 * Uso:
 * const patients = await prisma.patient.findMany({
 *   where: withOrg(req, { name: { contains: 'Juan' } }),
 * });
 */
function withOrg(req, where = {}) {
  // Modo transición: sin organizationId, devolver query sin filtro de org
  if (!req.organizationId) {
    return where;
  }

  return {
    ...where,
    organizationId: req.organizationId,
  };
}

/**
 * Helper para agregar organizationId a datos de creación
 *
 * MODO TRANSICIÓN: Si no hay organizationId, no lo agrega
 *
 * Uso:
 * const patient = await prisma.patient.create({
 *   data: withOrgData(req, { name: 'Juan', ... }),
 * });
 */
function withOrgData(req, data = {}) {
  // Modo transición: sin organizationId, crear sin org
  if (!req.organizationId) {
    return data;
  }

  return {
    ...data,
    organizationId: req.organizationId,
  };
}

module.exports = {
  tenantMiddleware,
  optionalTenant,
  withOrg,
  withOrgData,
};
