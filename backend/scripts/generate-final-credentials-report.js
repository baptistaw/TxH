// scripts/generate-final-credentials-report.js
// Generar reporte final de credenciales con emails reales

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function generateFinalReport() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  REPORTE FINAL DE CREDENCIALES CON EMAILS REALES');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
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

    const csvPath = './user-credentials-FINAL-REAL-EMAILS.csv';
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
        usersWithRealEmails: allUsers.filter(u =>
          !u.email.includes('@txh.uy') &&
          !u.email.includes('@txh-registro.uy')
        ).length,
        usersWithTempEmails: allUsers.filter(u =>
          u.email.includes('@txh.uy')
        ).length,
      },
      adminCredentials: admin ? {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        userRole: admin.userRole,
        password: '123456',
        note: 'Email institucional del sistema'
      } : null,
      editors: editors.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        specialty: u.specialty,
        userRole: u.userRole,
        password: '123456',
        hasRealEmail: !u.email.includes('@txh.uy')
      })),
      viewers: viewers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        specialty: u.specialty,
        userRole: u.userRole,
        password: '123456',
        hasRealEmail: !u.email.includes('@txh.uy')
      }))
    };

    const jsonPath = './user-credentials-FINAL-REAL-EMAILS.json';
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // Mostrar resumen
    console.log('✓ Archivos generados:');
    console.log(\`  • \${csvPath}\`);
    console.log(\`  • \${jsonPath}\\n\`);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  RESUMEN DE USUARIOS');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(\`Total de usuarios:           \${report.summary.totalUsers}\`);
    console.log(\`  • Administradores:         \${report.summary.adminUsers}\`);
    console.log(\`  • Editores:                \${report.summary.editors}\`);
    console.log(\`  • Visualizadores:          \${report.summary.viewers}\`);
    console.log(\`\\nEmails:\`);
    console.log(\`  • Con email real:          \${report.summary.usersWithRealEmails}\`);
    console.log(\`  • Con email temporal:      \${report.summary.usersWithTempEmails}\`);

    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('  ADMINISTRADOR');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (admin) {
      console.log(\`Nombre:      \${admin.name}\`);
      console.log(\`Email:       \${admin.email}\`);
      console.log(\`Contraseña:  123456\`);
      console.log(\`Rol:         ADMIN (permisos absolutos)\`);
    }

    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('  EDITORES (pueden crear y editar)');
    console.log('═══════════════════════════════════════════════════════════\n');

    editors.forEach(e => {
      const emailType = e.email.includes('@txh.uy') ? '[TEMPORAL]' : '[REAL]';
      console.log(\`✓ \${e.name}\`);
      console.log(\`  Email:       \${e.email} \${emailType}\`);
      console.log(\`  Contraseña:  123456\\n\`);
    });

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  VISUALIZADORES (solo lectura)');
    console.log('═══════════════════════════════════════════════════════════\n');

    viewers.forEach(v => {
      const emailType = v.email.includes('@txh.uy') ? '[TEMPORAL]' : '[REAL]';
      console.log(\`✓ \${v.name.padEnd(30)} \${v.email} \${emailType}\`);
    });

    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('  USUARIOS CON EMAILS TEMPORALES @txh.uy');
    console.log('═══════════════════════════════════════════════════════════\n');

    const tempEmailUsers = allUsers.filter(u =>
      u.email.includes('@txh.uy') && !u.email.includes('@txh-registro.uy')
    );

    if (tempEmailUsers.length > 0) {
      console.log('⚠ Los siguientes usuarios no tienen email en la hoja Equipo:');
      console.log('  Se les asignó un email temporal @txh.uy\n');
      tempEmailUsers.forEach(u => {
        console.log(\`  • \${u.name} → \${u.email}\`);
      });
      console.log('\n  Estos usuarios podrán cambiar su email desde su perfil.');
    } else {
      console.log('✓ Todos los usuarios tienen emails reales del Excel');
    }

    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('  INSTRUCCIONES PARA LOS USUARIOS');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('1. Todos los usuarios deben iniciar sesión con:');
    console.log('   • Email: Su email mostrado arriba');
    console.log('   • Contraseña: 123456\n');

    console.log('2. Al primer login, DEBEN cambiar su contraseña desde:');
    console.log('   Menú → Mi Perfil → Cambiar Contraseña\n');

    console.log('3. Usuarios con email temporal @txh.uy pueden actualizar');
    console.log('   su email real desde: Menú → Mi Perfil\n');

    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

generateFinalReport();
