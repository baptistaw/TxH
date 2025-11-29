// scripts/generate-credentials-csv.js
const fs = require('fs');

// Leer el archivo JSON de credenciales
const files = fs.readdirSync('.').filter(f => f.startsWith('user-credentials-') && f.endsWith('.json'));
if (files.length === 0) {
  console.error('No se encontró archivo de credenciales');
  process.exit(1);
}

const latestFile = files.sort().reverse()[0];
const data = JSON.parse(fs.readFileSync(latestFile, 'utf8'));

// Generar CSV
const lines = ['Nombre,Email,Rol,Permisos,Contraseña Temporal'];

// Agregar administrador
lines.push([
  data.adminCredentials.name,
  data.adminCredentials.email,
  'ADMIN',
  'Permisos absolutos',
  data.adminCredentials.password
].join(','));

// Agregar usuarios ordenados por nombre
data.users.sort((a, b) => a.name.localeCompare(b.name)).forEach(u => {
  const roleLabel = u.userRole === 'ANESTESIOLOGO' ? 'Editor' : 'Visualización';
  const permissions = u.userRole === 'ANESTESIOLOGO'
    ? 'Crear/editar pacientes, trasplantes y procedimientos'
    : 'Solo visualización';

  lines.push([
    u.name,
    u.email,
    roleLabel,
    permissions,
    u.password
  ].join(','));
});

// Guardar CSV
const csvContent = lines.join('\n');
fs.writeFileSync('user-credentials.csv', csvContent);

console.log(`✓ CSV generado: user-credentials.csv`);
console.log(`  Total de usuarios: ${data.users.length + 1}`);
console.log(`  Administradores: ${data.summary.adminUsers}`);
console.log(`  Editores: ${data.summary.anestesiologos}`);
console.log(`  Visualización: ${data.summary.viewers}`);
