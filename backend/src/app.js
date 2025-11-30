// src/app.js - Aplicación Express principal
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const config = require('../config');
const logger = require('./lib/logger');
const prisma = require('./lib/prisma');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

// Importar rutas
const authRouter = require('./routes/auth');
const patientsRouter = require('./routes/patients');
const casesRouter = require('./routes/cases');
const preopRouter = require('./routes/preop');
const intraopRouter = require('./routes/intraop');
const fluidsRouter = require('./routes/fluids');
const postopRouter = require('./routes/postop');
const mortalityRouter = require('./routes/mortality');
const teamRouter = require('./routes/team');
const filesRouter = require('./routes/files');
const exportsRouter = require('./routes/exports');
const proceduresRouter = require('./routes/procedures');
const adminRouter = require('./routes/admin');
const catalogsRouter = require('./routes/catalogs');
const cliniciansRouter = require('./routes/clinicians');
const analyticsRouter = require('./routes/analytics');
const searchRouter = require('./routes/search');
const rotemRouter = require('./routes/rotem');
const ocrRouter = require('./routes/ocr');
const contactRouter = require('./routes/contact.routes');

// Crear app
const app = express();

// ==============================================================================
// MIDDLEWARES GLOBALES
// ==============================================================================

// Helmet - Seguridad de headers HTTP
app.use(helmet());

// CORS - Configurar orígenes permitidos
app.use(cors(config.cors));

// Compression - Comprimir responses
app.use(compression());

// Body parser - JSON y URL-encoded
// Limite aumentado a 50MB para soportar batch OCR con múltiples imágenes base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Morgan - Logging de HTTP requests (solo en desarrollo)
if (config.isDevelopment) {
  app.use(morgan('dev', { stream: logger.stream }));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Servir archivos estáticos (uploads)
app.use('/uploads', express.static('uploads'));

// ==============================================================================
// RUTAS
// ==============================================================================

// Ruta raíz - Redirigir a /api
app.get('/', (req, res) => {
  res.redirect('/api');
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Verificar conexión a base de datos
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'ok',
      db: true,
      timestamp: new Date().toISOString(),
      environment: config.env,
      version: '1.0.0',
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });

    res.status(503).json({
      status: 'error',
      db: false,
      timestamp: new Date().toISOString(),
      error: config.isDevelopment ? error.message : 'Database unavailable',
    });
  }
});

// Ruta raíz
app.get('/api', (req, res) => {
  res.json({
    message: 'API Sistema Registro Anestesiológico TxH',
    version: '1.0.0',
    docs: '/api/docs',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      patients: '/api/patients',
      cases: '/api/cases',
      preop: '/api/preop',
      intraop: '/api/intraop',
      fluids: '/api/fluids',
      postop: '/api/postop',
      team: '/api/team',
      files: '/api/files',
      exports: '/api/exports',
      procedures: '/api/procedures',
      admin: '/api/admin',
      catalogs: '/api/catalogs',
      clinicians: '/api/clinicians',
      analytics: '/api/analytics',
      search: '/api/search',
      rotem: '/api/rotem',
      ocr: '/api/ocr',
    },
  });
});

// Montar routers
app.use('/api/auth', authRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/cases', casesRouter);
app.use('/api/preop', preopRouter);
app.use('/api/intraop', intraopRouter);
app.use('/api/fluids', fluidsRouter);
app.use('/api/postop', postopRouter);
app.use('/api/mortality', mortalityRouter);
app.use('/api/team', teamRouter);
app.use('/api/files', filesRouter);
app.use('/api/exports', exportsRouter);
app.use('/api/procedures', proceduresRouter);
app.use('/api/admin', adminRouter);
app.use('/api/catalogs', catalogsRouter);
app.use('/api/clinicians', cliniciansRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/search', searchRouter);
app.use('/api/rotem', rotemRouter);
app.use('/api/ocr', ocrRouter);
app.use('/api/contact', contactRouter);

// ==============================================================================
// MANEJO DE ERRORES
// ==============================================================================

// 404 - Ruta no encontrada
app.use(notFoundHandler);

// Error handler global
app.use(errorHandler);

module.exports = app;
