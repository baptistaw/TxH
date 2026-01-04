/**
 * Link Clerk Users - Vincula usuarios de Clerk con Clinicians en la BD
 *
 * Uso: node scripts/link-clerk-users.js
 *
 * Este script actualiza el campo clerkId de los Clinicians demo
 * con los IDs de usuarios de Clerk.
 *
 * Debes proporcionar los IDs de Clerk como variables de entorno o
 * editarlos directamente en este archivo.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ============================================================================
// MAPEO DE EMAILS A CLERK IDs
// ============================================================================
// Edita estos valores con los IDs reales de Clerk después de crear los usuarios

const CLERK_USER_MAP = {
  'admin@demo.anestrasplante.org': process.env.CLERK_ADMIN_ID || 'user_xxx',
  'anestesiologo@demo.anestrasplante.org': process.env.CLERK_ANESTESIOLOGO_ID || 'user_xxx',
  'cirujano@demo.anestrasplante.org': process.env.CLERK_CIRUJANO_ID || 'user_xxx',
  'hepatologo@demo.anestrasplante.org': process.env.CLERK_HEPATOLOGO_ID || 'user_xxx',
  'intensivista@demo.anestrasplante.org': process.env.CLERK_INTENSIVISTA_ID || 'user_xxx',
  'viewer@demo.anestrasplante.org': process.env.CLERK_VIEWER_ID || 'user_xxx',
};

async function linkClerkUsers() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   LINK CLERK USERS - Sistema Registro TxH');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  for (const [email, clerkId] of Object.entries(CLERK_USER_MAP)) {
    if (clerkId === 'user_xxx') {
      console.log(`⚠️  Saltando ${email} - Clerk ID no configurado`);
      continue;
    }

    try {
      const updated = await prisma.clinician.updateMany({
        where: { email },
        data: { clerkId },
      });

      if (updated.count > 0) {
        console.log(`✅ ${email} → ${clerkId}`);
      } else {
        console.log(`⚠️  ${email} - No encontrado en la BD`);
      }
    } catch (error) {
      console.error(`❌ Error vinculando ${email}:`, error.message);
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   PROCESO COMPLETADO');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  await prisma.$disconnect();
}

linkClerkUsers();
