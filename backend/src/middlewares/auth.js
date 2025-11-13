// src/middlewares/auth.js - Autenticación JWT y RBAC
const jwt = require('jsonwebtoken');
const config = require('../../config');
const logger = require('../lib/logger');

/**
 * Roles del sistema
 */
const ROLES = {
  ADMIN: 'admin',
  ANESTESIOLOGO: 'anestesiologo',
  DATA_ANALYST: 'data-analyst',
};

/**
 * Middleware de autenticación JWT
 * Verifica el token y agrega user a req
 */
const authenticate = (req, res, next) => {
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

    // Verificar token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Agregar usuario a request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    logger.warn('Authentication failed', { error: error.message });

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token inválido',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expirado',
      });
    }

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
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    // Token inválido pero no falla, solo no agrega user
    logger.debug('Optional auth failed', { error: error.message });
  }

  next();
};

/**
 * Generar token JWT (placeholder)
 * @param {object} payload - Datos del usuario
 */
const generateToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

/**
 * Generar refresh token (placeholder)
 * @param {object} payload - Datos del usuario
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
};

module.exports = {
  ROLES,
  authenticate,
  authorize,
  optionalAuth,
  generateToken,
  generateRefreshToken,
};
