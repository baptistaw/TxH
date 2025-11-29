// scripts/fix-remaining-emails.js
// Actualizar emails de usuarios con IDs que no coinciden con el Excel

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapeo manual de usuarios que no coinciden por ID
const EMAIL_UPDATES = [
  // Karina Rando tiene ID 111 en BD, no 33333
  { name: 'Karina Rando', email: 'karina.rando@gmail.com' },

  // Verificar otros usuarios por nombre
  { name: 'Victoria Mainardi', email: 'victoria_mainardi@hotmail.com' },
  { name: 'Martin Elizondo', email: null }, // No tiene email en Excel
  { name: 'victorio Cervera', email: null }, // No tiene email en Excel
  { name: 'Martin Alvez', email: null }, // No tiene email en Excel
  { name: 'Yorley Andarcia', email: null }, // Verificar si existe
];

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

async function fixRemainingEmails() {
  console.log(`${colors.cyan}
╔════════════════════════════════════════════════════════════════╗
║        CORRECCIÓN DE EMAILS RESTANTES                         ║
╚════════════════════════════════════════════════════════════════╝
${colors.reset}\n`);

  try {
    // Obtener todos los usuarios actuales
    const allUsers = await prisma.clinician.findMany({
      where: { name: { not: 'Administrador del Sistema' } },
      orderBy: { name: 'asc' }
    });

    console.log(`Total de usuarios en BD (sin admin): ${allUsers.length}\n`);
    console.log('Usuarios actuales:\n');

    allUsers.forEach(u => {
      console.log(`  ${u.id.toString().padEnd(10)} ${u.name.padEnd(30)} ${u.email}`);
    });

    console.log(`\n${colors.cyan}Actualizando emails...${colors.reset}\n`);

    for (const update of EMAIL_UPDATES) {
      if (!update.email) continue;

      const user = await prisma.clinician.findFirst({
        where: { name: update.name }
      });

      if (user) {
        await prisma.clinician.update({
          where: { id: user.id },
          data: { email: update.email }
        });

        console.log(`${colors.green}✓ ${update.name}${colors.reset}`);
        console.log(`  ${user.email} → ${update.email}\n`);
      } else {
        console.log(`${colors.yellow}⚠ ${update.name} - No encontrado en BD${colors.reset}\n`);
      }
    }

    console.log(`${colors.cyan}Verificación final...${colors.reset}\n`);

    const finalUsers = await prisma.clinician.findMany({
      where: { userRole: { not: 'ADMIN' } },
      orderBy: { name: 'asc' }
    });

    console.log('Emails finales:');
    console.log('═'.repeat(80));

    const editors = finalUsers.filter(u => u.userRole === 'ANESTESIOLOGO');
    const viewers = finalUsers.filter(u => u.userRole === 'VIEWER');

    console.log(`\n${colors.green}EDITORES (${editors.length}):${colors.reset}`);
    editors.forEach(e => {
      console.log(`  ✓ ${e.name.padEnd(30)} ${e.email}`);
    });

    console.log(`\n${colors.cyan}VIEWERS (${viewers.length}):${colors.reset}`);
    viewers.forEach(v => {
      console.log(`  ✓ ${v.name.padEnd(30)} ${v.email}`);
    });

    console.log(`\n${colors.green}✓ Actualización completada${colors.reset}\n`);

  } catch (error) {
    console.error(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixRemainingEmails();
