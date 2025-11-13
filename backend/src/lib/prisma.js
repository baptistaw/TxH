// src/lib/prisma.js - Cliente Prisma singleton
const { PrismaClient } = require('@prisma/client');
const config = require('../../config');
const logger = require('./logger');

// Opciones de logging según entorno
const logOptions = config.isDevelopment
  ? ['query', 'info', 'warn', 'error']
  : ['error'];

// Crear instancia única de Prisma
const prisma = new PrismaClient({
  log: logOptions.map((level) => ({
    emit: 'event',
    level,
  })),
});

// Conectar eventos de log a Winston
prisma.$on('query', (e) => {
  logger.debug('Prisma Query', {
    query: e.query,
    params: e.params,
    duration: `${e.duration}ms`,
  });
});

prisma.$on('info', (e) => {
  logger.info('Prisma Info', { message: e.message });
});

prisma.$on('warn', (e) => {
  logger.warn('Prisma Warning', { message: e.message });
});

prisma.$on('error', (e) => {
  logger.error('Prisma Error', { message: e.message });
});

// Verificar conexión al iniciar (solo si no es test)
if (process.env.NODE_ENV !== 'test') {
  prisma.$connect()
    .then(() => {
      logger.info('✓ Database connected successfully');
    })
    .catch((error) => {
      logger.error('✗ Database connection failed', { error: error.message });
      process.exit(1);
    });
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('Database disconnected');
});

module.exports = prisma;
