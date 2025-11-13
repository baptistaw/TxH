// src/middlewares/validate.js - Validación con Zod
const { z } = require('zod');
const logger = require('../lib/logger');

/**
 * Middleware de validación con Zod
 * @param {z.ZodSchema} schema - Schema de Zod
 * @param {string} source - 'body' | 'query' | 'params'
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      // Obtener datos según source
      const data = req[source];

      // Validar con Zod
      const validated = schema.parse(data);

      // Reemplazar con datos validados
      req[source] = validated;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Validation error', {
          source,
          errors: error.errors,
        });

        return res.status(400).json({
          error: 'Validation Error',
          message: 'Los datos proporcionados no son válidos',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
          })),
        });
      }

      // Error inesperado
      logger.error('Unexpected validation error', { error: error.message });
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Error al validar los datos',
      });
    }
  };
};

/**
 * Schemas de validación comunes
 */

// ID de Prisma (cuid)
const cuidSchema = z.string().cuid();

// CI uruguaya (6-8 dígitos)
const ciSchema = z.string().regex(/^\d{6,8}$/, 'CI debe tener 6-8 dígitos');

// Paginación
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

// Ordenamiento
const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Rango de fechas
const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// Búsqueda
const searchSchema = z.object({
  q: z.string().optional(),
});

module.exports = {
  validate,
  schemas: {
    cuid: cuidSchema,
    ci: ciSchema,
    pagination: paginationSchema,
    sort: sortSchema,
    dateRange: dateRangeSchema,
    search: searchSchema,
  },
};
