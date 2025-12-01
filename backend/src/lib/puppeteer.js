// src/lib/puppeteer.js - Configuración de Puppeteer para diferentes entornos
// En producción usa @sparticuz/chromium que funciona en Render/serverless
// En desarrollo usa puppeteer con Chrome bundled

/**
 * Lanzar navegador con configuración optimizada según el entorno
 */
async function launchBrowser() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // En producción, usar puppeteer-core con @sparticuz/chromium
    const puppeteer = require('puppeteer-core');
    const chromium = require('@sparticuz/chromium');

    // Configurar chromium para menor uso de memoria
    chromium.setHeadlessMode = true;
    chromium.setGraphicsMode = false;

    return await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  } else {
    // En desarrollo, usar puppeteer normal con Chrome bundled
    const puppeteer = require('puppeteer');

    return await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
      ],
    });
  }
}

/**
 * Obtener opciones de lanzamiento (legacy - para compatibilidad)
 * @deprecated Usar launchBrowser() directamente
 */
function getLaunchOptions() {
  return {
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
}

module.exports = {
  getLaunchOptions,
  launchBrowser,
};
