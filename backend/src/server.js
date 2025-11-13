// src/server.js - Entry point del servidor
const app = require('./app');
const config = require('../config');
const logger = require('./lib/logger');
const prisma = require('./lib/prisma');

const PORT = config.port;

// Función para cerrar gracefully
async function shutdown(signal) {
  logger.info(`${signal} signal received: closing server gracefully`);

  // Cerrar servidor HTTP
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Desconectar Prisma
  await prisma.$disconnect();
  logger.info('Database disconnected');

  process.exit(0);
}

// Iniciar servidor
const server = app.listen(PORT, () => {
  logger.info(
    `
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🏥  Sistema Registro Anestesiológico TxH - API REST            ║
║                                                                   ║
║   🚀  Servidor corriendo en: http://localhost:${PORT}              ║
║   🌍  Entorno: ${config.env.padEnd(46)}║
║   📡  Health check: http://localhost:${PORT}/api/health            ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
    `
  );
});

// Manejo de errores del servidor
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Puerto ${PORT} ya está en uso`);
  } else {
    logger.error('Error del servidor:', error);
  }
  process.exit(1);
});

// Escuchar señales de terminación
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Manejo de excepciones no capturadas
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('unhandledRejection');
});
