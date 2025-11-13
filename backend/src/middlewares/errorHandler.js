// src/middlewares/errorHandler.js - Manejo centralizado de errores
const logger = require('../lib/logger');
const config = require('../../config');

/**
 * Clase de error personalizado para la aplicación
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Errores específicos
 */
class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} no encontrado`, 404);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Datos inválidos') {
    super(message, 400);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado') {
    super(message, 403);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflicto con el estado actual') {
    super(message, 409);
  }
}

/**
 * Manejo de errores de Prisma
 */
const handlePrismaError = (error) => {
  logger.error('Prisma error', {
    code: error.code,
    meta: error.meta,
  });

  // P2002: Unique constraint violation
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'campo';
    return new ConflictError(`Ya existe un registro con ese ${field}`);
  }

  // P2025: Record not found
  if (error.code === 'P2025') {
    return new NotFoundError();
  }

  // P2003: Foreign key constraint failed
  if (error.code === 'P2003') {
    return new ValidationError('Referencia inválida a otro registro');
  }

  // P2014: Invalid relation
  if (error.code === 'P2014') {
    return new ValidationError('Relación inválida entre registros');
  }

  // Error genérico de Prisma
  return new AppError('Error en la base de datos', 500, false);
};

/**
 * Middleware de manejo de errores
 * Debe ir al final de todos los middlewares y rutas
 */
const errorHandler = (err, req, res, next) => {
  // Si ya se envió una respuesta, delegar a Express
  if (res.headersSent) {
    return next(err);
  }

  let error = err;

  // Convertir errores de Prisma
  if (err.name === 'PrismaClientKnownRequestError') {
    error = handlePrismaError(err);
  }

  // Convertir errores de validación de Prisma
  if (err.name === 'PrismaClientValidationError') {
    error = new ValidationError('Datos inválidos para la operación');
  }

  // Si no es un error operacional, loguearlo como crítico
  if (!error.isOperational) {
    logger.error('Non-operational error', {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
    });
  }

  // Status code
  const statusCode = error.statusCode || 500;

  // Respuesta de error
  const response = {
    error: error.name || 'Error',
    message: error.message || 'Ha ocurrido un error',
  };

  // En desarrollo, agregar stack trace
  if (config.isDevelopment) {
    response.stack = error.stack;
    response.url = req.originalUrl;
    response.method = req.method;
  }

  res.status(statusCode).json(response);
};

/**
 * Middleware para rutas no encontradas (404)
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Ruta ${req.method} ${req.originalUrl} no encontrada`,
  });
};

/**
 * Wrapper async para evitar try-catch en cada controlador
 * @param {Function} fn - Función async del controlador
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
