// src/lib/puppeteer.js - Configuración de Puppeteer para diferentes entornos
const puppeteer = require('puppeteer');

/**
 * Obtener opciones de lanzamiento de Puppeteer según el entorno
 * En Render/producción usa Chrome del sistema, en desarrollo usa el bundled
 */
function getLaunchOptions() {
  const options = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
    ],
  };

  // En producción (Render), intentar usar Chrome del sistema
  if (process.env.NODE_ENV === 'production') {
    // Render tiene Chrome instalado en estas rutas
    const possiblePaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
    ];

    const fs = require('fs');
    for (const chromePath of possiblePaths) {
      if (fs.existsSync(chromePath)) {
        options.executablePath = chromePath;
        break;
      }
    }
  }

  return options;
}

/**
 * Lanzar navegador con configuración optimizada
 */
async function launchBrowser() {
  return await puppeteer.launch(getLaunchOptions());
}

module.exports = {
  getLaunchOptions,
  launchBrowser,
};
