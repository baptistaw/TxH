// src/routes/webhooks.js - Clerk Webhook handlers
// Sincroniza automáticamente organizaciones y usuarios desde Clerk

const express = require('express');
const { Webhook } = require('svix');
const prisma = require('../lib/prisma');
const logger = require('../lib/logger');

const router = express.Router();

/**
 * Verificar la firma del webhook de Clerk
 */
function verifyWebhook(req) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('CLERK_WEBHOOK_SECRET no configurado');
  }

  const svix_id = req.headers['svix-id'];
  const svix_timestamp = req.headers['svix-timestamp'];
  const svix_signature = req.headers['svix-signature'];

  if (!svix_id || !svix_timestamp || !svix_signature) {
    throw new Error('Headers de Svix faltantes');
  }

  const wh = new Webhook(WEBHOOK_SECRET);

  // El body debe ser el raw body como string
  const body = JSON.stringify(req.body);

  return wh.verify(body, {
    'svix-id': svix_id,
    'svix-timestamp': svix_timestamp,
    'svix-signature': svix_signature,
  });
}

/**
 * POST /api/webhooks/clerk
 * Endpoint principal para webhooks de Clerk
 */
router.post('/clerk', async (req, res) => {
  try {
    // Verificar firma del webhook
    let evt;
    try {
      evt = verifyWebhook(req);
    } catch (err) {
      logger.error('Webhook verification failed', { error: err.message });
      return res.status(400).json({ error: 'Webhook verification failed' });
    }

    const eventType = evt.type;
    const data = evt.data;

    logger.info('Clerk webhook received', { eventType, id: data.id });

    // Manejar diferentes tipos de eventos
    switch (eventType) {
      // ==================== ORGANIZACIONES ====================

      case 'organization.created':
        await handleOrganizationCreated(data);
        break;

      case 'organization.updated':
        await handleOrganizationUpdated(data);
        break;

      case 'organization.deleted':
        await handleOrganizationDeleted(data);
        break;

      // ==================== MEMBRESÍAS ====================

      case 'organizationMembership.created':
        await handleMembershipCreated(data);
        break;

      case 'organizationMembership.updated':
        await handleMembershipUpdated(data);
        break;

      case 'organizationMembership.deleted':
        await handleMembershipDeleted(data);
        break;

      // ==================== USUARIOS ====================

      case 'user.created':
        await handleUserCreated(data);
        break;

      case 'user.updated':
        await handleUserUpdated(data);
        break;

      case 'user.deleted':
        await handleUserDeleted(data);
        break;

      default:
        logger.info('Unhandled webhook event type', { eventType });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Webhook handler error', { error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== HANDLERS DE ORGANIZACIONES ====================

async function handleOrganizationCreated(data) {
  const { id, name, slug, image_url, created_at } = data;

  logger.info('Creating organization from Clerk webhook', { id, name, slug });

  try {
    await prisma.organization.upsert({
      where: { id },
      create: {
        id,
        name,
        slug,
        logoUrl: image_url || null,
        isActive: true,
      },
      update: {
        name,
        slug,
        logoUrl: image_url || null,
      },
    });

    logger.info('Organization created/updated successfully', { id, name });
  } catch (error) {
    logger.error('Error creating organization', { id, error: error.message });
    throw error;
  }
}

async function handleOrganizationUpdated(data) {
  const { id, name, slug, image_url } = data;

  logger.info('Updating organization from Clerk webhook', { id, name });

  try {
    await prisma.organization.update({
      where: { id },
      data: {
        name,
        slug,
        logoUrl: image_url || null,
      },
    });

    logger.info('Organization updated successfully', { id, name });
  } catch (error) {
    if (error.code === 'P2025') {
      // Organización no existe, crearla
      await handleOrganizationCreated(data);
    } else {
      logger.error('Error updating organization', { id, error: error.message });
      throw error;
    }
  }
}

async function handleOrganizationDeleted(data) {
  const { id } = data;

  logger.info('Deactivating organization from Clerk webhook', { id });

  try {
    // No eliminamos, solo desactivamos
    await prisma.organization.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info('Organization deactivated successfully', { id });
  } catch (error) {
    if (error.code !== 'P2025') {
      logger.error('Error deactivating organization', { id, error: error.message });
    }
  }
}

// ==================== HANDLERS DE MEMBRESÍAS ====================

async function handleMembershipCreated(data) {
  const { id, organization, public_user_data, role } = data;
  const orgId = organization.id;
  const userId = public_user_data.user_id;
  const userEmail = public_user_data.identifier; // email
  const userName = `${public_user_data.first_name || ''} ${public_user_data.last_name || ''}`.trim();

  logger.info('Creating membership from Clerk webhook', { orgId, userId, userEmail, role });

  try {
    // Primero, asegurar que la organización existe
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      logger.warn('Organization not found, creating it', { orgId });
      await prisma.organization.create({
        data: {
          id: orgId,
          name: organization.name || 'Nueva Organización',
          slug: organization.slug,
          isActive: true,
        },
      });
    }

    // Mapear rol de Clerk a nuestro sistema
    const userRole = mapClerkRoleToSystemRole(role);
    const specialty = getSpecialtyForClerkRole(role);

    // Buscar si el usuario ya existe por email
    let clinician = await prisma.clinician.findUnique({
      where: { email: userEmail },
    });

    if (clinician) {
      // Usuario existe - actualizar con clerkId y asignar a organización
      // Solo actualizar specialty si es admin (para no sobreescribir config existente)
      const updateData = {
        clerkId: userId,
        organizationId: orgId,
        userRole,
        name: userName || clinician.name,
      };

      // Si es admin, asegurar que sea ANESTESIOLOGO
      if (userRole === 'ADMIN') {
        updateData.specialty = 'ANESTESIOLOGO';
      }

      await prisma.clinician.update({
        where: { id: clinician.id },
        data: updateData,
      });

      logger.info('Existing clinician linked to Clerk user', {
        clinicianId: clinician.id,
        email: userEmail,
        orgId,
      });
    } else {
      // Usuario no existe - crear nuevo
      const maxIdResult = await prisma.clinician.aggregate({
        _max: { id: true },
      });
      const newId = Math.max((maxIdResult._max.id || 0) + 1, 99999);

      await prisma.clinician.create({
        data: {
          id: newId,
          clerkId: userId,
          email: userEmail,
          name: userName || userEmail.split('@')[0],
          specialty, // ANESTESIOLOGO para admin, OTRO para members
          userRole,
          organizationId: orgId,
        },
      });

      logger.info('New clinician created from Clerk membership', {
        id: newId,
        email: userEmail,
        orgId,
        role: userRole,
        specialty,
      });
    }
  } catch (error) {
    logger.error('Error handling membership created', {
      orgId,
      userId,
      error: error.message,
    });
    throw error;
  }
}

async function handleMembershipUpdated(data) {
  const { organization, public_user_data, role } = data;
  const orgId = organization.id;
  const userId = public_user_data.user_id;

  logger.info('Updating membership from Clerk webhook', { orgId, userId, role });

  try {
    const userRole = mapClerkRoleToSystemRole(role);

    const updateData = {
      userRole,
      organizationId: orgId,
    };

    // Si es admin, asegurar que sea ANESTESIOLOGO
    if (userRole === 'ADMIN') {
      updateData.specialty = 'ANESTESIOLOGO';
    }

    await prisma.clinician.updateMany({
      where: { clerkId: userId },
      data: updateData,
    });

    logger.info('Membership updated successfully', { userId, orgId, userRole });
  } catch (error) {
    logger.error('Error updating membership', { userId, error: error.message });
  }
}

async function handleMembershipDeleted(data) {
  const { organization, public_user_data } = data;
  const orgId = organization.id;
  const userId = public_user_data.user_id;

  logger.info('Handling membership deletion from Clerk webhook', { orgId, userId });

  try {
    // Cuando se elimina una membresía, quitamos la organización del usuario
    // pero no lo eliminamos (puede pertenecer a otra org)
    await prisma.clinician.updateMany({
      where: {
        clerkId: userId,
        organizationId: orgId,
      },
      data: {
        organizationId: null,
        userRole: 'VIEWER', // Degradar a viewer sin org
      },
    });

    logger.info('Membership removed successfully', { userId, orgId });
  } catch (error) {
    logger.error('Error removing membership', { userId, error: error.message });
  }
}

// ==================== HANDLERS DE USUARIOS ====================

async function handleUserCreated(data) {
  const { id, email_addresses, first_name, last_name } = data;
  const primaryEmail = email_addresses?.find(e => e.id === data.primary_email_address_id)?.email_address;

  if (!primaryEmail) {
    logger.warn('User created without email, skipping', { id });
    return;
  }

  const userName = `${first_name || ''} ${last_name || ''}`.trim();

  logger.info('User created in Clerk', { id, email: primaryEmail });

  // No creamos el usuario aquí - esperamos a que sea agregado a una organización
  // via organizationMembership.created
}

async function handleUserUpdated(data) {
  const { id, email_addresses, first_name, last_name } = data;
  const primaryEmail = email_addresses?.find(e => e.id === data.primary_email_address_id)?.email_address;
  const userName = `${first_name || ''} ${last_name || ''}`.trim();

  logger.info('User updated in Clerk', { id, email: primaryEmail });

  try {
    // Actualizar datos del usuario si existe
    if (primaryEmail) {
      await prisma.clinician.updateMany({
        where: { clerkId: id },
        data: {
          email: primaryEmail,
          name: userName || undefined,
        },
      });
    }
  } catch (error) {
    logger.error('Error updating user from Clerk', { id, error: error.message });
  }
}

async function handleUserDeleted(data) {
  const { id } = data;

  logger.info('User deleted in Clerk', { id });

  try {
    // Desactivar usuario en lugar de eliminar
    await prisma.clinician.updateMany({
      where: { clerkId: id },
      data: {
        isActive: false,
        organizationId: null,
      },
    });

    logger.info('User deactivated from Clerk deletion', { id });
  } catch (error) {
    logger.error('Error deactivating user', { id, error: error.message });
  }
}

// ==================== HELPERS ====================

/**
 * Mapear roles de Clerk a roles del sistema
 * Clerk usa: org:admin, org:member, etc.
 *
 * - Admin en Clerk → ADMIN (siempre anestesiólogo con permisos totales)
 * - Member en Clerk → VIEWER (un admin debe configurar su rol/specialty después)
 */
function mapClerkRoleToSystemRole(clerkRole) {
  const roleMapping = {
    'org:admin': 'ADMIN',
    'admin': 'ADMIN',
    'org:member': 'VIEWER', // Members empiezan como VIEWER, admin les asigna rol
    'member': 'VIEWER',
    'org:viewer': 'VIEWER',
    'viewer': 'VIEWER',
  };

  return roleMapping[clerkRole] || 'VIEWER';
}

/**
 * Obtener specialty según el rol de Clerk
 * - Admin → siempre ANESTESIOLOGO
 * - Member → OTRO (admin configura después)
 */
function getSpecialtyForClerkRole(clerkRole) {
  if (clerkRole === 'org:admin' || clerkRole === 'admin') {
    return 'ANESTESIOLOGO';
  }
  return 'OTRO';
}

module.exports = router;
