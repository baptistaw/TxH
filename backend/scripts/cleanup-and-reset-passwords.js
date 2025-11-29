// scripts/cleanup-and-reset-passwords.js
// Eliminar usuarios de prueba y resetear contraseñas

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const fs = require('fs');

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;
const NEW_PASSWORD = '123456'; // Nueva contraseña para todos

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function cleanupAndReset() {
  console.log(`${colors.blue}
╔══════════════════════════════════════════════════════════════════╗
║        LIMPIEZA DE USUARIOS Y RESETEO DE CONTRASEÑAS             ║
╚══════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    // 1. Identificar usuarios de prueba (emails @test.com)
    log(colors.cyan, '\n1. Identificando usuarios de prueba...\n');

    const testUsers = await prisma.clinician.findMany({
      where: {
        email: {
          contains: '@test.com'
        }
      }
    });

    if (testUsers.length > 0) {
      log(colors.yellow, `   Encontrados ${testUsers.length} usuarios de prueba:`);
      testUsers.forEach(u => {
        console.log(`   - ${u.name} (${u.email})`);
      });

      // 2. Eliminar usuarios de prueba
      log(colors.cyan, '\n2. Eliminando usuarios de prueba...\n');

      const deleted = await prisma.clinician.deleteMany({
        where: {
          email: {
            contains: '@test.com'
          }
        }
      });

      log(colors.green, `   ✓ ${deleted.count} usuarios eliminados\n`);
    } else {
      log(colors.green, '   ✓ No se encontraron usuarios de prueba\n');
    }

    // 3. Obtener todos los usuarios restantes
    log(colors.cyan, '3. Actualizando contraseñas...\n');

    const allUsers = await prisma.clinician.findMany({
      orderBy: { name: 'asc' }
    });

    log(colors.yellow, `   Total de usuarios: ${allUsers.length}\n`);

    // 4. Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, SALT_ROUNDS);

    // 5. Actualizar contraseña de todos los usuarios
    let updated = 0;
    for (const user of allUsers) {
      await prisma.clinician.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });

      const roleLabel = user.userRole === 'ADMIN' ? 'ADMIN' :
                       user.userRole === 'ANESTESIOLOGO' ? 'Editor' : 'Viewer';
      log(colors.green, `   ✓ ${user.name} (${roleLabel})`);
      updated++;
    }

    log(colors.green, `\n   ✓ ${updated} contraseñas actualizadas\n`);

    // 6. Generar reporte final
    log(colors.cyan, '4. Generando reporte de credenciales...\n');

    const admin = allUsers.find(u => u.userRole === 'ADMIN');
    const editors = allUsers.filter(u => u.userRole === 'ANESTESIOLOGO');
    const viewers = allUsers.filter(u => u.userRole === 'VIEWER');

    // Generar CSV
    const csvLines = ['Nombre,Email,Rol,Permisos,Contraseña'];

    // Admin
    if (admin) {
      csvLines.push([
        admin.name,
        admin.email,
        'ADMIN',
        'Permisos absolutos',
        NEW_PASSWORD
      ].join(','));
    }

    // Editores
    editors.forEach(u => {
      csvLines.push([
        u.name,
        u.email,
        'Editor',
        'Crear/editar pacientes, trasplantes y procedimientos',
        NEW_PASSWORD
      ].join(','));
    });

    // Viewers
    viewers.forEach(u => {
      csvLines.push([
        u.name,
        u.email,
        'Visualización',
        'Solo visualización',
        NEW_PASSWORD
      ].join(','));
    });

    const csvPath = './user-credentials-final.csv';
    fs.writeFileSync(csvPath, csvLines.join('\n'));

    // Generar JSON
    const report = {
      generated: new Date().toISOString(),
      password: NEW_PASSWORD,
      summary: {
        totalUsers: allUsers.length,
        adminUsers: admin ? 1 : 0,
        editors: editors.length,
        viewers: viewers.length,
      },
      users: allUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        specialty: u.specialty,
        userRole: u.userRole,
        password: NEW_PASSWORD
      }))
    };

    const jsonPath = './user-credentials-final.json';
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // 7. Resumen final
    console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}`);
    log(colors.green, '\n✓ Proceso completado exitosamente\n');

    console.log('Archivos generados:');
    console.log(`  CSV:  ${csvPath}`);
    console.log(`  JSON: ${jsonPath}\n`);

    console.log('Resumen final:');
    console.log(`  Total de usuarios:  ${report.summary.totalUsers}`);
    console.log(`  Administradores:    ${report.summary.adminUsers}`);
    console.log(`  Editores:           ${report.summary.editors}`);
    console.log(`  Viewers:            ${report.summary.viewers}\n`);

    console.log('Usuarios con permiso de EDICIÓN:');
    editors.forEach(e => {
      console.log(`  ✓ ${e.name} (${e.email})`);
    });

    log(colors.cyan, `\nContraseña para TODOS los usuarios: ${NEW_PASSWORD}`);
    log(colors.yellow, '\n⚠ IMPORTANTE: Los usuarios deben cambiar esta contraseña al primer login.\n');

  } catch (error) {
    log(colors.red, `\n✗ Error durante el proceso: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
cleanupAndReset();
