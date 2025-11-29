// scripts/fix-all-roles.js
// Corregir TODOS los roles correctamente

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Usuarios que deben ser EDITORES (rol ANESTESIOLOGO)
const EDITORS = [
  'Karina Rando',
  'Victoria Formoso',
  'William Baptista',
  'Jessica Vega'
];

// Usuario administrador
const ADMIN_NAME = 'Administrador del Sistema';

async function fixAllRoles() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  CORRECCIÓN COMPLETA DE ROLES DE USUARIOS');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // 1. Restaurar administrador
    console.log('1. Restaurando rol ADMIN...');
    const adminUpdated = await prisma.clinician.updateMany({
      where: { name: ADMIN_NAME },
      data: { userRole: 'ADMIN' }
    });
    console.log(`   ✓ Administrador restaurado (${adminUpdated.count} registro)\n`);

    // 2. Obtener todos los clínicos (excepto admin)
    const clinicians = await prisma.clinician.findMany({
      where: { name: { not: ADMIN_NAME } },
      orderBy: { name: 'asc' }
    });

    console.log(`2. Procesando ${clinicians.length} usuarios...\n`);

    let editorsSet = 0;
    let viewersSet = 0;

    // 3. Actualizar cada clínico
    for (const clinician of clinicians) {
      const shouldBeEditor = EDITORS.includes(clinician.name);
      const newRole = shouldBeEditor ? 'ANESTESIOLOGO' : 'VIEWER';

      await prisma.clinician.update({
        where: { id: clinician.id },
        data: { userRole: newRole }
      });

      if (newRole === 'ANESTESIOLOGO') {
        console.log(`   ✓ ${clinician.name} → EDITOR`);
        editorsSet++;
      } else {
        console.log(`   ✓ ${clinician.name} → VIEWER`);
        viewersSet++;
      }
    }

    // 4. Verificar resultado
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  VERIFICACIÓN FINAL');
    console.log('═══════════════════════════════════════════════════════════\n');

    const summary = await prisma.clinician.groupBy({
      by: ['userRole'],
      _count: true
    });

    console.log('Estado final:');
    summary.forEach(s => {
      const label = s.userRole === 'ADMIN' ? 'Administradores' :
                    s.userRole === 'ANESTESIOLOGO' ? 'Editores     ' : 'Viewers      ';
      console.log(`  ${label}: ${s._count}`);
    });

    // 5. Listar editores
    const editors = await prisma.clinician.findMany({
      where: { userRole: 'ANESTESIOLOGO' },
      select: { name: true, email: true },
      orderBy: { name: 'asc' }
    });

    console.log('\nUsuarios con permiso de EDICIÓN:');
    editors.forEach(e => {
      console.log(`  ✓ ${e.name} (${e.email})`);
    });

    console.log('\n✓ Corrección completada exitosamente\n');

  } catch (error) {
    console.error('\n✗ Error durante la corrección:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
fixAllRoles();
