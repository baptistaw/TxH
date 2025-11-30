// src/middlewares/auth.js - Autenticación Clerk y RBAC
const { verifyToken } = require('@clerk/backend');
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Roles del sistema (permisos)
 * - ADMIN: Permisos absolutos
 * - ANESTESIOLOGO: Crear y editar pacientes, trasplantes y procedimientos
 * - VIEWER: Solo visualización
 *
 * IMPORTANTE: Los valores deben coincidir EXACTAMENTE con los valores en la BD (MAYÚSCULAS)
 */
const ROLES = {
  ADMIN: 'ADMIN',
  ANESTESIOLOGO: 'ANESTESIOLOGO',
  VIEWER: 'VIEWER',
};

/**
 * Middleware de autenticación Clerk
 * Verifica el token de Clerk y agrega user a req
 */
const authenticate = async (req, res, next) => {
  try {
    // Obtener token del header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token de autenticación no proporcionado',
      });
    }

    const token = authHeader.substring(7); // Remover 'Bearer '

    // Verificar token con Clerk
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      logger.error('CLERK_SECRET_KEY not configured');
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Error de configuración del servidor',
      });
    }

    let verifiedToken;
    try {
      verifiedToken = await verifyToken(token, {
        secretKey,
      });
    } catch (clerkError) {
      logger.warn('Clerk token verification failed', { error: clerkError.message });
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token inválido o expirado',
      });
    }

    // Obtener el clerkId del token verificado
    const clerkId = verifiedToken.sub;

    // Obtener información de la organización de Clerk
    const orgId = verifiedToken.org_id || null;
    const orgRole = verifiedToken.org_role || null;
    const orgSlug = verifiedToken.org_slug || null;

    // Buscar el usuario en nuestra BD por clerkId
    const clinician = await prisma.clinician.findFirst({
      where: { clerkId },
      select: {
        id: true,
        email: true,
        name: true,
        specialty: true,
        userRole: true,
      },
    });

    if (!clinician) {
      // Usuario autenticado en Clerk pero no existe en nuestra BD
      // Esto puede pasar con usuarios nuevos - permitir acceso básico
      logger.info('Clerk user not found in database', { clerkId, email: verifiedToken.email });

      req.user = {
        clerkId,
        email: verifiedToken.email,
        role: 'VIEWER', // Rol por defecto para usuarios no registrados
        isNewUser: true,
        // Información de organización de Clerk
        orgId,
        orgRole,
        orgSlug,
      };
    } else {
      // Usuario encontrado en BD
      req.user = {
        id: clinician.id,
        clerkId,
        email: clinician.email,
        name: clinician.name,
        specialty: clinician.specialty,
        role: clinician.userRole,
        // Información de organización de Clerk
        orgId,
        orgRole,
        orgSlug,
      };
    }

    next();
  } catch (error) {
    logger.error('Authentication error', { error: error.message });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error al verificar autenticación',
    });
  }
};

/**
 * Middleware de autorización por roles (RBAC)
 * @param {string[]} allowedRoles - Roles permitidos
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Usuario no autenticado',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed', {
        userId: req.user.id,
        role: req.user.role,
        requiredRoles: allowedRoles,
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'No tienes permisos para acceder a este recurso',
      });
    }

    next();
  };
};

/**
 * Middleware opcional de autenticación
 * No falla si no hay token, pero lo verifica si existe
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    return next();
  }

  try {
    const verifiedToken = await verifyToken(token, { secretKey });
    const clerkId = verifiedToken.sub;

    const clinician = await prisma.clinician.findFirst({
      where: { clerkId },
      select: {
        id: true,
        email: true,
        name: true,
        specialty: true,
        userRole: true,
      },
    });

    if (clinician) {
      req.user = {
        id: clinician.id,
        clerkId,
        email: clinician.email,
        name: clinician.name,
        specialty: clinician.specialty,
        role: clinician.userRole,
      };
    } else {
      req.user = {
        clerkId,
        email: verifiedToken.email,
        role: 'VIEWER',
        isNewUser: true,
      };
    }
  } catch (error) {
    // Token inválido pero no falla, solo no agrega user
    logger.debug('Optional auth failed', { error: error.message });
  }

  next();
};

module.exports = {
  ROLES,
  authenticate,
  authorize,
  optionalAuth,
};
