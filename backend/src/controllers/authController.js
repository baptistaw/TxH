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
 * NOTA: Los roles se gestionan SOLO desde la BD, no se sincronizan desde Clerk
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
      // Solo actualizar clerkId si no tiene (vincular cuenta)
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

        logger.info('ClerkId linked to existing user', {
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

/**
 * Bootstrap - Crear primer ADMIN de la organización
 * POST /api/auth/bootstrap
 *
 * REQUISITOS:
 * 1. No debe existir ningún ADMIN en la BD
 * 2. El usuario debe tener rol org:admin en Clerk
 *
 * Esto garantiza que Clerk tiene control absoluto sobre quién
 * puede convertirse en el primer administrador del sistema.
 */
async function bootstrap(req, res, next) {
  try {
    const { clerkId, email, orgRole, orgId } = req.user;
    const { name, specialty } = req.body;

    // 1. Verificar que el usuario sea org:admin en Clerk
    if (orgRole !== 'org:admin') {
      logger.warn('Bootstrap attempt without org:admin role', {
        email,
        clerkId,
        orgRole,
      });

      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'Solo los administradores de la organización en Clerk pueden realizar el bootstrap.',
        requiredRole: 'org:admin',
        currentRole: orgRole || 'ninguno',
      });
    }

    // 2. Verificar que no existan ADMINs en la BD
    const existingAdmin = await prisma.clinician.findFirst({
      where: { userRole: 'ADMIN' },
      select: { id: true, email: true },
    });

    if (existingAdmin) {
      logger.warn('Bootstrap attempt with existing admin', {
        email,
        existingAdminEmail: existingAdmin.email,
      });

      return res.status(409).json({
        error: 'Bootstrap no disponible',
        message: 'Ya existe un administrador en el sistema. Contacta al admin existente para crear tu cuenta.',
      });
    }

    // 3. Verificar que el usuario no exista ya en la BD
    const existingUser = await prisma.clinician.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Usuario existe pero no es admin - actualizar a ADMIN
      const updatedUser = await prisma.clinician.update({
        where: { id: existingUser.id },
        data: {
          userRole: 'ADMIN',
          clerkId,
          name: name || existingUser.name,
          specialty: specialty || existingUser.specialty,
        },
        select: {
          id: true,
          name: true,
          email: true,
          specialty: true,
          userRole: true,
          clerkId: true,
        },
      });

      logger.info('Existing user promoted to ADMIN via bootstrap', {
        userId: updatedUser.id,
        email,
        orgId,
      });

      return res.status(200).json({
        message: 'Usuario promovido a ADMIN exitosamente',
        user: {
          ...updatedUser,
          role: updatedUser.userRole,
        },
      });
    }

    // 4. Crear nuevo usuario como ADMIN
    if (!name) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Debes proporcionar tu nombre para crear la cuenta.',
      });
    }

    const newAdmin = await prisma.clinician.create({
      data: {
        clerkId,
        email,
        name,
        specialty: specialty || 'OTRO',
        userRole: 'ADMIN',
      },
      select: {
        id: true,
        name: true,
        email: true,
        specialty: true,
        userRole: true,
        clerkId: true,
      },
    });

    logger.info('First ADMIN created via bootstrap', {
      userId: newAdmin.id,
      email,
      orgId,
    });

    return res.status(201).json({
      message: 'Primer administrador creado exitosamente',
      user: {
        ...newAdmin,
        role: newAdmin.userRole,
      },
    });
  } catch (error) {
    logger.error('Bootstrap error', { error: error.message });
    next(error);
  }
}

/**
 * Check bootstrap status
 * GET /api/auth/bootstrap/status
 * Verifica si el bootstrap está disponible (no hay ADMINs)
 */
async function getBootstrapStatus(req, res, next) {
  try {
    const { orgRole } = req.user;

    // Contar ADMINs existentes
    const adminCount = await prisma.clinician.count({
      where: { userRole: 'ADMIN' },
    });

    const isAvailable = adminCount === 0;
    const isEligible = orgRole === 'org:admin';

    res.json({
      bootstrapAvailable: isAvailable,
      isEligible,
      message: isAvailable
        ? isEligible
          ? 'Puedes crear el primer administrador del sistema.'
          : 'El bootstrap está disponible pero necesitas ser org:admin en Clerk.'
        : 'Ya existe un administrador en el sistema.',
    });
  } catch (error) {
    logger.error('Bootstrap status error', { error: error.message });
    next(error);
  }
}

module.exports = {
  getCurrentUser,
  syncUser,
  updateProfile,
  bootstrap,
  getBootstrapStatus,
};
