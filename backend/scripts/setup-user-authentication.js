// scripts/setup-user-authentication.js
// Script para configurar autenticación y roles de usuarios

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const fs = require('fs');

const prisma = new PrismaClient();

// Configuración
const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'TxH2025'; // Contraseña temporal por defecto

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.blue}${title}${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}`);
}

// Generar contraseña basada en el nombre (primeras letras + ID)
function generatePassword(clinician) {
  // Usar contraseña temporal por defecto
  return DEFAULT_PASSWORD;
}

// Determinar rol basado en especialidad
function determineUserRole(specialty) {
  const specialty_upper = specialty ? specialty.toUpperCase() : '';

  // Anestesiólogos, cirujanos e intensivistas tienen permisos de edición
  if (['ANESTESIOLOGO', 'CIRUJANO', 'INTENSIVISTA'].includes(specialty_upper)) {
    return 'ANESTESIOLOGO';
  }

  // Resto son viewers
  return 'VIEWER';
}

async function setupAuthentication() {
  logSection('CONFIGURACIÓN DE AUTENTICACIÓN Y ROLES');

  try {
    // 1. Obtener todos los clínicos
    const clinicians = await prisma.clinician.findMany({
      orderBy: { name: 'asc' },
    });

    log(colors.cyan, `\nTotal de clínicos encontrados: ${clinicians.length}`);

    // 2. Procesar cada clínico
    const usersReport = [];
    let updated = 0;
    let errors = 0;

    for (const clinician of clinicians) {
      try {
        const password = generatePassword(clinician);
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const userRole = determineUserRole(clinician.specialty);

        // Actualizar clínico con contraseña y rol
        await prisma.clinician.update({
          where: { id: clinician.id },
          data: {
            password: hashedPassword,
            userRole: userRole,
          },
        });

        usersReport.push({
          id: clinician.id,
          name: clinician.name,
          email: clinician.email,
          specialty: clinician.specialty,
          userRole: userRole,
          password: password,
        });

        updated++;
        log(colors.green, `✓ ${clinician.name} - ${userRole}`);
      } catch (error) {
        log(colors.red, `✗ Error con ${clinician.name}: ${error.message}`);
        errors++;
      }
    }

    log(colors.cyan, `\n✓ Usuarios actualizados: ${updated}`);
    if (errors > 0) {
      log(colors.yellow, `⚠ Errores: ${errors}`);
    }

    return usersReport;
  } catch (error) {
    log(colors.red, `Error en setupAuthentication: ${error.message}`);
    throw error;
  }
}

async function createAdminUser() {
  logSection('CREAR USUARIO ADMINISTRADOR');

  try {
    // Verificar si ya existe un administrador
    const existingAdmin = await prisma.clinician.findFirst({
      where: { userRole: 'ADMIN' },
    });

    if (existingAdmin) {
      log(colors.yellow, `⚠ Ya existe un usuario administrador: ${existingAdmin.name}`);
      return existingAdmin;
    }

    // Crear usuario administrador
    const adminPassword = 'Admin2025!'; // Contraseña inicial del admin
    const hashedPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS);

    const admin = await prisma.clinician.create({
      data: {
        id: 99999, // ID especial para admin
        name: 'Administrador del Sistema',
        email: 'admin@txh-registro.uy',
        specialty: 'OTRO',
        userRole: 'ADMIN',
        password: hashedPassword,
      },
    });

    log(colors.green, `✓ Usuario administrador creado exitosamente`);
    log(colors.cyan, `  Email: ${admin.email}`);
    log(colors.cyan, `  Contraseña temporal: ${adminPassword}`);
    log(colors.yellow, `  ⚠ IMPORTANTE: Cambiar la contraseña después del primer login`);

    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      userRole: admin.userRole,
      password: adminPassword,
    };
  } catch (error) {
    // Si el error es por ID duplicado, intentar con otro ID
    if (error.code === 'P2002' && error.meta?.target?.includes('id')) {
      log(colors.yellow, '⚠ ID 99999 ya existe, intentando con 99998...');

      const adminPassword = 'Admin2025!';
      const hashedPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS);

      const admin = await prisma.clinician.create({
        data: {
          id: 99998,
          name: 'Administrador del Sistema',
          email: 'admin@txh-registro.uy',
          specialty: 'OTRO',
          userRole: 'ADMIN',
          password: hashedPassword,
        },
      });

      log(colors.green, `✓ Usuario administrador creado con ID ${admin.id}`);
      return {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        userRole: admin.userRole,
        password: adminPassword,
      };
    }

    log(colors.red, `Error creando administrador: ${error.message}`);
    throw error;
  }
}

async function generateReport(usersReport, adminData) {
  logSection('GENERAR REPORTE DE CREDENCIALES');

  const report = {
    generated: new Date().toISOString(),
    summary: {
      totalUsers: usersReport.length,
      adminUsers: usersReport.filter(u => u.userRole === 'ADMIN').length + (adminData ? 1 : 0),
      anestesiologos: usersReport.filter(u => u.userRole === 'ANESTESIOLOGO').length,
      viewers: usersReport.filter(u => u.userRole === 'VIEWER').length,
    },
    adminCredentials: adminData,
    users: usersReport,
  };

  // Guardar reporte en archivo
  const reportPath = `./user-credentials-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  log(colors.green, `✓ Reporte guardado en: ${reportPath}`);
  log(colors.yellow, '\n⚠ IMPORTANTE: Este archivo contiene contraseñas temporales.');
  log(colors.yellow, '  Guárdalo en un lugar seguro y elimínalo después de distribuir las credenciales.\n');

  // Mostrar resumen por rol
  console.log(`${colors.cyan}Resumen por rol:${colors.reset}`);
  console.log(`  ${colors.magenta}Administradores:${colors.reset} ${report.summary.adminUsers}`);
  console.log(`  ${colors.green}Anestesiólogos (edición):${colors.reset} ${report.summary.anestesiologos}`);
  console.log(`  ${colors.blue}Viewers (solo lectura):${colors.reset} ${report.summary.viewers}`);

  return report;
}

async function main() {
  console.log(`${colors.magenta}
╔══════════════════════════════════════════════════════════════════╗
║     CONFIGURACIÓN DE AUTENTICACIÓN Y ROLES DE USUARIOS           ║
╚══════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  try {
    // 1. Configurar autenticación para usuarios existentes
    const usersReport = await setupAuthentication();

    // 2. Crear usuario administrador
    const adminData = await createAdminUser();

    // 3. Generar reporte
    const report = await generateReport(usersReport, adminData);

    logSection('RESUMEN FINAL');

    log(colors.green, '✓ Configuración completada exitosamente');
    log(colors.cyan, `\nTotal de usuarios configurados: ${report.summary.totalUsers + 1}`);

    console.log(`\n${colors.yellow}Contraseña temporal por defecto:${colors.reset} ${DEFAULT_PASSWORD}`);
    console.log(`${colors.yellow}Contraseña del administrador:${colors.reset} ${adminData.password}\n`);

    log(colors.blue, 'Niveles de permiso asignados:');
    console.log(`  - ${colors.magenta}ADMIN:${colors.reset} Permisos absolutos`);
    console.log(`  - ${colors.green}ANESTESIOLOGO:${colors.reset} Crear/editar pacientes, trasplantes y procedimientos`);
    console.log(`  - ${colors.blue}VIEWER:${colors.reset} Solo visualización\n`);

    log(colors.yellow, 'IMPORTANTE: Los usuarios deben cambiar su contraseña temporal al primer login.');

  } catch (error) {
    log(colors.red, `\n✗ Error durante la configuración: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
main();
