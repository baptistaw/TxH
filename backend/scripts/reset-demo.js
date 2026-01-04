/**
 * Reset Demo - Limpia y recrea todos los datos de demostración
 *
 * Uso: node scripts/reset-demo.js
 *
 * Este script:
 * 1. Elimina TODOS los datos de la organización demo
 * 2. Vuelve a ejecutar el seed completo
 *
 * ⚠️  CUIDADO: Este script elimina datos. Solo usar en ambiente demo.
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('   RESET DEMO - Sistema Registro TxH');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('⚠️  Este script eliminará TODOS los datos demo y los recreará.');
console.log('');

// Ejecutar seed-demo.js (que ya incluye la limpieza)
const seedPath = path.join(__dirname, 'seed-demo.js');

try {
  execSync(`node "${seedPath}"`, { stdio: 'inherit' });
  console.log('');
  console.log('✅ Demo reseteada exitosamente');
} catch (error) {
  console.error('❌ Error reseteando demo:', error.message);
  process.exit(1);
}
