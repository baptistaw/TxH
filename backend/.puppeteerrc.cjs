/**
 * Configuración de Puppeteer
 * En producción (Render), skip download y usar Chrome del sistema
 */
const { join } = require('path');

module.exports = {
  // Skip download en CI/producción
  skipDownload: process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === 'true' ||
                process.env.NODE_ENV === 'production' ||
                process.env.CI === 'true',

  // Cache directory para desarrollo local
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
