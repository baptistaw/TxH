// tools/etl/cronScheduler.js - Scheduler para ETL incremental automático
const cron = require('node-cron');
const { runIncrementalETL } = require('./incrementalJob');
const logger = require('../../src/lib/logger');

/**
 * Configurar y ejecutar ETL incremental con cron
 */
function setupETLCron(options = {}) {
  const {
    schedule = '0 */12 * * *', // Cada 12 horas por defecto
    runOnStart = false,
    timezone = 'America/Montevideo',
  } = options;

  logger.info('ETL Cron configurado', { schedule, timezone });

  // Crear tarea cron
  const task = cron.schedule(
    schedule,
    async () => {
      logger.info('🔄 Iniciando ETL incremental automático');

      try {
        await runIncrementalETL();
        logger.info('✓ ETL incremental completado exitosamente');
      } catch (error) {
        logger.error('✗ Error en ETL incremental', { error: error.message });
      }
    },
    {
      scheduled: true,
      timezone,
    }
  );

  // Ejecutar inmediatamente si se solicita
  if (runOnStart) {
    logger.info('Ejecutando ETL incremental inicial...');
    runIncrementalETL().catch((error) => {
      logger.error('Error en ETL inicial', { error: error.message });
    });
  }

  logger.info('✓ Scheduler ETL activado');

  return task;
}

/**
 * Detener scheduler
 */
function stopETLCron(task) {
  if (task) {
    task.stop();
    logger.info('Scheduler ETL detenido');
  }
}

module.exports = {
  setupETLCron,
  stopETLCron,
};
