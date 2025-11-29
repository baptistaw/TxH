// scripts/correct-user-roles.js
// Script para corregir roles de usuarios

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// Usuarios que deben ser EDITORES (rol ANESTESIOLOGO)
const EDITORS = [
  'Karina Rando',
  'Victoria Formoso',
  'William Baptista',
  'Jessica Vega'
];

async function correctUserRoles() {
  console.log(`${colors.blue}
╔══════════════════════════════════════════════════════════════════╗
║              CORRECCIÓN DE ROLES DE USUARIOS                     ║
╚══════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    // 1. Obtener todos los clínicos (excepto admin)
    const clinicians = await prisma.clinician.findMany({
      where: {
        userRole: { not: 'ADMIN' }
      },
      orderBy: { name: 'asc' }
    });

    log(colors.cyan, `\nTotal de clínicos encontrados (sin admin): ${clinicians.length}\n`);

    let editorsUpdated = 0;
    let viewersUpdated = 0;
    let unchanged = 0;

    // 2. Actualizar cada clínico
    for (const clinician of clinicians) {
      const shouldBeEditor = EDITORS.includes(clinician.name);
      const newRole = shouldBeEditor ? 'ANESTESIOLOGO' : 'VIEWER';

      if (clinician.userRole !== newRole) {
        // Actualizar rol
        await prisma.clinician.update({
          where: { id: clinician.id },
          data: { userRole: newRole }
        });

        if (newRole === 'ANESTESIOLOGO') {
          log(colors.green, `✓ ${clinician.name} → EDITOR (Anestesiólogo)`);
          editorsUpdated++;
        } else {
          log(colors.blue, `✓ ${clinician.name} → VIEWER`);
          viewersUpdated++;
        }
      } else {
        unchanged++;
      }
    }

    // 3. Resumen
    console.log(`\n${colors.cyan}${'='.repeat(70)}${colors.reset}`);
    log(colors.green, `\n✓ Corrección completada exitosamente`);
    log(colors.cyan, `\nResumen de cambios:`);
    console.log(`  Actualizados a EDITOR: ${editorsUpdated}`);
    console.log(`  Actualizados a VIEWER: ${viewersUpdated}`);
    console.log(`  Sin cambios: ${unchanged}`);

    // 4. Mostrar resumen final
    const summary = await prisma.clinician.groupBy({
      by: ['userRole'],
      _count: true
    });

    console.log(`\n${colors.cyan}Estado final:${colors.reset}`);
    summary.forEach(s => {
      const label = s.userRole === 'ADMIN' ? 'Administradores' :
                    s.userRole === 'ANESTESIOLOGO' ? 'Editores' : 'Viewers';
      console.log(`  ${label}: ${s._count}`);
    });

    // 5. Listar los editores
    const editors = await prisma.clinician.findMany({
      where: { userRole: 'ANESTESIOLOGO' },
      select: { name: true, email: true },
      orderBy: { name: 'asc' }
    });

    console.log(`\n${colors.green}Usuarios con permiso de EDICIÓN:${colors.reset}`);
    editors.forEach(e => {
      console.log(`  - ${e.name} (${e.email})`);
    });

  } catch (error) {
    log(colors.red, `\n✗ Error durante la corrección: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
correctUserRoles();
