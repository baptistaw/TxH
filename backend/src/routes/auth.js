// src/routes/auth.js - Autenticación con Clerk
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');

/**
 * @route   GET /api/auth/me
 * @desc    Obtener usuario actual (datos de Clerk + BD local)
 * @access  Private (requiere token Clerk)
 */
router.get('/me', authenticate, authController.getCurrentUser);

/**
 * @route   POST /api/auth/sync
 * @desc    Sincronizar usuario de Clerk con BD local
 * @access  Private (requiere token Clerk)
 */
router.post('/sync', authenticate, authController.syncUser);

/**
 * @route   PUT /api/auth/profile
 * @desc    Actualizar perfil del usuario en BD local
 * @access  Private
 */
router.put('/profile', authenticate, authController.updateProfile);

/**
 * @route   GET /api/auth/bootstrap/status
 * @desc    Verificar si el bootstrap está disponible
 * @access  Private (requiere token Clerk)
 */
router.get('/bootstrap/status', authenticate, authController.getBootstrapStatus);

/**
 * @route   POST /api/auth/bootstrap
 * @desc    Crear primer ADMIN (solo si no existe ninguno y usuario es org:admin en Clerk)
 * @access  Private (requiere token Clerk + org:admin en Clerk)
 */
router.post('/bootstrap', authenticate, authController.bootstrap);

module.exports = router;
