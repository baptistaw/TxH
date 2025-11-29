// src/controllers/authController.js - Autenticación con Clerk
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

/**
 * Get current user
 * GET /api/auth/me
 * Devuelve datos del usuario desde Clerk y BD local
 */
async function getCurrentUser(req, res, next) {
  try {
    // El middleware auth ya validó el token de Clerk y agregó req.user
    const { id, clerkId, email, name, specialty, role, isNewUser } = req.user;

    // Si es un usuario nuevo (no existe en BD), devolver datos básicos de Clerk
    if (isNewUser) {
      return res.json({
        user: {
          clerkId,
          email,
          role,
          isNewUser: true,
        },
      });
    }

    // Usuario existe en BD, obtener datos completos
    const clinician = await prisma.clinician.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        specialty: true,
        phone: true,
        userRole: true,
        clerkId: true,
      },
    });

    if (!clinician) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
      });
    }

    res.json({
      user: {
        ...clinician,
        role: clinician.userRole,
      },
    });
  } catch (error) {
    logger.error('Get current user error', { error: error.message });
    next(error);
  }
}

/**
 * Sync user - Sincronizar usuario de Clerk con BD local
 * POST /api/auth/sync
 * Vincula el clerkId con un usuario existente por email
 */
async function syncUser(req, res, next) {
  try {
    const { clerkId, email } = req.user;

    if (!clerkId || !email) {
      return res.status(400).json({
        error: 'Datos de Clerk incompletos',
      });
    }

    // Buscar usuario existente por email
    let clinician = await prisma.clinician.findUnique({
      where: { email },
    });

    if (clinician) {
      // Usuario existe, actualizar clerkId si no tiene
      if (!clinician.clerkId) {
        clinician = await prisma.clinician.update({
          where: { id: clinician.id },
          data: { clerkId },
          select: {
            id: true,
            name: true,
            email: true,
            specialty: true,
            phone: true,
            userRole: true,
            clerkId: true,
          },
        });

        logger.info('ClerkId synced to existing user', {
          userId: clinician.id,
          email,
          clerkId,
        });
      }

      return res.json({
        message: 'Usuario sincronizado',
        user: {
          ...clinician,
          role: clinician.userRole,
        },
      });
    }

    // Usuario no existe, devolver indicación de que necesita ser creado por admin
    logger.info('Clerk user not found in database', { email, clerkId });

    return res.status(404).json({
      error: 'Usuario no registrado',
      message:
        'Tu cuenta de Clerk no está vinculada a un usuario del sistema. Contacta al administrador.',
      clerkId,
      email,
    });
  } catch (error) {
    logger.error('Sync user error', { error: error.message });
    next(error);
  }
}

/**
 * Update profile
 * PUT /api/auth/profile
 * Actualiza datos del perfil en BD local (no afecta Clerk)
 */
async function updateProfile(req, res, next) {
  try {
    const { name, phone } = req.body;
    const userId = req.user.id;

    // Usuarios nuevos no pueden actualizar perfil
    if (req.user.isNewUser) {
      return res.status(403).json({
        error: 'Usuario no registrado en el sistema',
      });
    }

    // Validar que al menos un campo esté presente
    if (!name && !phone) {
      return res.status(400).json({
        error: 'Debe proporcionar al menos un campo para actualizar',
      });
    }

    // Preparar datos de actualización (email se maneja desde Clerk)
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;

    // Actualizar perfil
    const updatedClinician = await prisma.clinician.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        specialty: true,
        userRole: true,
      },
    });

    logger.info('Profile updated successfully', { userId });

    res.json({
      message: 'Perfil actualizado exitosamente',
      user: {
        ...updatedClinician,
        role: updatedClinician.userRole,
      },
    });
  } catch (error) {
    logger.error('Update profile error', { error: error.message });
    next(error);
  }
}

module.exports = {
  getCurrentUser,
  syncUser,
  updateProfile,
};
