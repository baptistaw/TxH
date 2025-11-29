const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeFiles() {
  console.log('🔍 ANÁLISIS DE ARCHIVOS A MIGRAR\n');
  console.log('='.repeat(80));

  const allExams = await prisma.preopAttachment.findMany({
    select: {
      fileName: true,
      type: true
    }
  });

  // Categorizar por tipo de referencia
  const conRuta = allExams.filter(e => e.fileName.includes('/'));
  const soloNombre = allExams.filter(e => !e.fileName.includes('/') && e.fileName !== 'Normal');
  const marcadosNormal = allExams.filter(e => e.fileName === 'Normal');

  console.log(`\nTotal de estudios: ${allExams.length}\n`);
  console.log(`📁 Con ruta de archivo:        ${conRuta.length}`);
  console.log(`📄 Solo nombre (sin ruta):     ${soloNombre.length}`);
  console.log(`✓  Marcados como 'Normal':     ${marcadosNormal.length}`);

  console.log(`\n\nRUTAS ENCONTRADAS (muestra):\n`);
  const rutas = [...new Set(conRuta.map(e => {
    const match = e.fileName.match(/^([^/]+)\//);
    return match ? match[1] : e.fileName;
  }))];

  rutas.forEach(ruta => {
    const count = conRuta.filter(e => e.fileName.startsWith(ruta + '/')).length;
    console.log(`  ${ruta}/: ${count} archivos`);
  });

  console.log(`\n\nEJEMPLOS DE RUTAS COMPLETAS:\n`);
  conRuta.slice(0, 10).forEach((e, idx) => {
    console.log(`  [${idx+1}] ${e.fileName}`);
  });

  console.log(`\n\nEJEMPLOS DE SOLO NOMBRES:\n`);
  soloNombre.slice(0, 10).forEach((e, idx) => {
    console.log(`  [${idx+1}] ${e.fileName}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n📍 UBICACIÓN PROBABLE DE LOS ARCHIVOS:\n');
  console.log('Los archivos con ruta "Preoperatorio_Images/" probablemente están en:');
  console.log('  1. Google Drive (compartido con AppSheet)');
  console.log('  2. Carpeta local de AppSheet');
  console.log('  3. Storage de AppSheet\n');
  console.log('Para migrarlos necesitas:');
  console.log('  a) Acceso al Google Drive donde están almacenados');
  console.log('  b) O exportarlos desde AppSheet');
  console.log('  c) O indicarme la ubicación actual de los archivos');
  console.log('='.repeat(80));

  await prisma.$disconnect();
}

analyzeFiles();
