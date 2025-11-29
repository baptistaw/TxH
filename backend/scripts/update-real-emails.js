// scripts/update-real-emails.js
// Actualizar emails con los reales de la hoja Equipo

const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const fs = require('fs');

const prisma = new PrismaClient();
const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

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

async function updateRealEmails() {
  console.log(`${colors.blue}
╔═══════════════════════════════════════════════════════════════════╗
║        ACTUALIZACIÓN DE EMAILS REALES DESDE HOJA EQUIPO          ║
╚═══════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    // 1. Leer el archivo Excel
    log(colors.cyan, '\n1. Leyendo emails de la hoja Equipo...\n');

    const workbook = XLSX.readFile(excelPath);
    const worksheet = workbook.Sheets['Equipo'];
    const equipoData = XLSX.utils.sheet_to_json(worksheet);

    // Filtrar solo los que tienen email
    const withEmails = equipoData.filter(row => row.email);
    log(colors.yellow, `   Encontrados ${withEmails.length} registros con email\n`);

    // 2. Obtener usuarios actuales de la BD
    log(colors.cyan, '2. Obteniendo usuarios de la base de datos...\n');

    const currentUsers = await prisma.clinician.findMany({
      where: {
        name: { not: 'Administrador del Sistema' }
      }
    });

    log(colors.yellow, `   Total de usuarios en BD (sin admin): ${currentUsers.length}\n`);

    // 3. Actualizar emails
    log(colors.cyan, '3. Actualizando emails...\n');

    let updated = 0;
    let notFound = 0;
    let skipped = 0;

    for (const row of withEmails) {
      const cp = row.CP;
      const realEmail = row.email.trim();
      const nombre = row.Nombre.trim();

      // Buscar usuario por CP (id)
      const user = await prisma.clinician.findUnique({
        where: { id: cp }
      });

      if (user) {
        // Actualizar email
        await prisma.clinician.update({
          where: { id: cp },
          data: { email: realEmail }
        });

        log(colors.green, `   ✓ ${nombre} (CP: ${cp})`);
        log(colors.cyan, `      ${user.email} → ${realEmail}`);
        updated++;
      } else {
        log(colors.yellow, `   ⚠ ${nombre} (CP: ${cp}) - No encontrado en BD`);
        notFound++;
      }
    }

    // 4. Usuarios sin email en la hoja
    log(colors.cyan, '\n4. Usuarios sin email en la hoja Equipo...\n');

    const withoutEmails = equipoData.filter(row => !row.email);
    withoutEmails.forEach(row => {
      log(colors.yellow, `   ⚠ ${row.Nombre} (CP: ${row.CP || 'N/A'}) - Sin email`);
    });

    // 5. Generar reporte actualizado
    log(colors.cyan, '\n5. Generando reporte de credenciales actualizado...\n');

    const allUsers = await prisma.clinician.findMany({
      orderBy: { name: 'asc' }
    });

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
        '123456'
      ].join(','));
    }

    // Editores
    editors.forEach(u => {
      csvLines.push([
        u.name,
        u.email,
        'Editor',
        'Crear/editar pacientes, trasplantes y procedimientos',
        '123456'
      ].join(','));
    });

    // Viewers
    viewers.forEach(u => {
      csvLines.push([
        u.name,
        u.email,
        'Visualización',
        'Solo visualización',
        '123456'
      ].join(','));
    });

    const timestamp = Date.now();
    const csvPath = `./user-credentials-updated-${timestamp}.csv`;
    fs.writeFileSync(csvPath, csvLines.join('\n'));

    // Generar JSON
    const report = {
      generated: new Date().toISOString(),
      password: '123456',
      summary: {
        totalUsers: allUsers.length,
        adminUsers: admin ? 1 : 0,
        editors: editors.length,
        viewers: viewers.length,
        emailsUpdated: updated,
        notFoundInDB: notFound,
      },
      adminCredentials: admin ? {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        userRole: admin.userRole,
        password: '123456'
      } : null,
      users: allUsers.filter(u => u.userRole !== 'ADMIN').map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        specialty: u.specialty,
        userRole: u.userRole,
        password: '123456'
      }))
    };

    const jsonPath = `./user-credentials-updated-${timestamp}.json`;
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // 6. Resumen final
    console.log(`${colors.blue}${'═'.repeat(70)}${colors.reset}`);
    log(colors.green, '\n✓ Actualización completada exitosamente\n');

    console.log('Archivos generados:');
    console.log(`  CSV:  ${csvPath}`);
    console.log(`  JSON: ${jsonPath}\n`);

    console.log('Resumen de actualización:');
    console.log(`  Emails actualizados:    ${updated}`);
    console.log(`  No encontrados en BD:   ${notFound}`);
    console.log(`  Sin email en Excel:     ${withoutEmails.length}\n`);

    console.log('Usuarios con permiso de EDICIÓN:');
    editors.forEach(e => {
      console.log(`  ✓ ${e.name} (${e.email})`);
    });

    log(colors.cyan, `\nContraseña para TODOS los usuarios: 123456`);
    log(colors.yellow, '\n⚠ IMPORTANTE: Los usuarios deben cambiar esta contraseña al primer login.\n');

  } catch (error) {
    log(colors.red, `\n✗ Error durante la actualización: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
updateRealEmails();
