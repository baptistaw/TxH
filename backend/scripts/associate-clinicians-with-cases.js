// scripts/associate-clinicians-with-cases.js
// Asociar cada clínico con sus casos, procedimientos y evaluaciones

const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');

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
  console.log(\`\${color}\${message}\${colors.reset}\`);
}

async function associateClinicians() {
  console.log(\`\${colors.blue}
╔══════════════════════════════════════════════════════════════════╗
║     ASOCIACIÓN DE CLÍNICOS CON CASOS Y PROCEDIMIENTOS            ║
╚══════════════════════════════════════════════════════════════════╝
\${colors.reset}\`);

  try {
    // 1. Leer hojas del Excel
    log(colors.cyan, '\n1. Leyendo datos del Excel...\n');
    
    const workbook = XLSX.readFile(excelPath);
    
    // Leer hoja de Procedimientos
    const proceduresSheet = workbook.Sheets['Procedimientos'];
    const proceduresData = XLSX.utils.sheet_to_json(proceduresSheet);
    log(colors.yellow, \`   Procedimientos en Excel: \${proceduresData.length}\`);
    
    // Leer hoja de Evaluaciones (si existe)
    const preopSheet = workbook.Sheets['EvaluacionPreoperatoria'];
    const preopData = XLSX.utils.sheet_to_json(preopSheet);
    log(colors.yellow, \`   Evaluaciones Preop en Excel: \${preopData.length}\n\`);
    
    // 2. Verificar estructura de datos
    log(colors.cyan, '2. Verificando estructura de datos...\n');
    
    if (proceduresData.length > 0) {
      console.log('Columnas en Procedimientos:');
      console.log(Object.keys(proceduresData[0]).join(', '));
      console.log();
    }
    
    if (preopData.length > 0) {
      console.log('Columnas en EvaluacionPreoperatoria:');
      console.log(Object.keys(preopData[0]).join(', '));
      console.log();
    }
    
    // 3. Buscar columnas de anestesiólogo
    log(colors.cyan, '3. Buscando información de anestesiólogos...\n');
    
    // Ver ejemplos de procedimientos
    if (proceduresData.length > 0) {
      console.log('Ejemplo de procedimiento:');
      console.log(JSON.stringify(proceduresData[0], null, 2));
    }
    
    log(colors.green, '\n✓ Análisis completado\n');

  } catch (error) {
    log(colors.red, \`\n✗ Error: \${error.message}\`);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

associateClinicians();
