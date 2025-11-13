// tools/etl/startCron.js - Script para iniciar el scheduler de ETL
require('dotenv').config();
const { setupETLCron } = require('./cronScheduler');
const logger = require('../../src/lib/logger');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  ETL Cron Scheduler - Sistema Registro TxH               ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// Configuración desde variables de entorno
const schedule = process.env.ETL_CRON_SCHEDULE || '0 */12 * * *'; // Cada 12h
const runOnStart = process.env.ETL_RUN_ON_START === 'true';
const timezone = process.env.TZ || 'America/Montevideo';

console.log('Configuración:');
console.log(`  Schedule: ${schedule}`);
console.log(`  Zona horaria: ${timezone}`);
console.log(`  Ejecutar al inicio: ${runOnStart}\n`);

// Explicar schedule
const scheduleExplanations = {
  '0 */6 * * *': 'Cada 6 horas (00:00, 06:00, 12:00, 18:00)',
  '0 */12 * * *': 'Cada 12 horas (00:00, 12:00)',
  '0 0 * * *': 'Diariamente a medianoche',
  '0 2 * * *': 'Diariamente a las 2:00 AM',
  '*/30 * * * *': 'Cada 30 minutos',
};

const explanation = scheduleExplanations[schedule] || 'Schedule personalizado';
console.log(`  Frecuencia: ${explanation}\n`);

// Iniciar scheduler
const task = setupETLCron({ schedule, runOnStart, timezone });

// Manejo de señales de terminación
process.on('SIGTERM', () => {
  logger.info('SIGTERM recibido, deteniendo scheduler...');
  task.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT recibido, deteniendo scheduler...');
  task.stop();
  process.exit(0);
});

console.log('✓ Scheduler iniciado. Presiona Ctrl+C para detener.\n');
console.log('📋 Próximas ejecuciones:');

// Simular próximas ejecuciones (solo informativo)
const cronParser = require('cron-parser');
try {
  const interval = cronParser.parseExpression(schedule, { tz: timezone });
  for (let i = 0; i < 5; i++) {
    const next = interval.next().toDate();
    console.log(`  ${i + 1}. ${next.toLocaleString('es-UY', { timeZone: timezone })}`);
  }
} catch (error) {
  console.log('  (No se pudo calcular próximas ejecuciones)');
}

console.log('\n');

// Mantener proceso vivo
process.stdin.resume();
