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
const patientsRouter = require('./routes/patients');
const casesRouter = require('./routes/cases');
const preopRouter = require('./routes/preop');
const intraopRouter = require('./routes/intraop');
const postopRouter = require('./routes/postop');
const teamRouter = require('./routes/team');
const filesRouter = require('./routes/files');
const exportsRouter = require('./routes/exports');

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Morgan - Logging de HTTP requests (solo en desarrollo)
if (config.isDevelopment) {
  app.use(morgan('dev', { stream: logger.stream }));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// ==============================================================================
// RUTAS
// ==============================================================================

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
      patients: '/api/patients',
      cases: '/api/cases',
      preop: '/api/preop',
      intraop: '/api/intraop',
      postop: '/api/postop',
      team: '/api/team',
      files: '/api/files',
      exports: '/api/exports',
    },
  });
});

// Montar routers
app.use('/api/patients', patientsRouter);
app.use('/api/cases', casesRouter);
app.use('/api/preop', preopRouter);
app.use('/api/intraop', intraopRouter);
app.use('/api/postop', postopRouter);
app.use('/api/team', teamRouter);
app.use('/api/files', filesRouter);
app.use('/api/exports', exportsRouter);

// ==============================================================================
// MANEJO DE ERRORES
// ==============================================================================

// 404 - Ruta no encontrada
app.use(notFoundHandler);

// Error handler global
app.use(errorHandler);

module.exports = app;
