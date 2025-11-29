// Analizar por qué solo 31 de 83 pacientes tienen labs
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

function parseExcelDate(serial) {
  if (!serial || serial === '' || isNaN(serial)) return null;
  const excelEpoch = new Date(1899, 11, 30);
  const days = Math.floor(serial);
  const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
  return date;
}

async function analyze() {
  try {
    const workbook = XLSX.readFile(excelPath);
    const preopData = XLSX.utils.sheet_to_json(workbook.Sheets['Preoperatorio']);

    // Get all DB patients
    const dbPatients = await prisma.patient.findMany({
      select: { id: true }
    });
    const dbCIs = new Set(dbPatients.map(p => p.id));

    // Filter preop data to only patients in DB
    const matchingPreopData = preopData.filter(row => {
      const ci = String(row['CI']).trim();
      return ci && dbCIs.has(ci);
    });

    console.log(`📊 Registros de Preoperatorio para pacientes en BD: ${matchingPreopData.length}`);

    let hasPreopEval = 0;
    let noPreopEval = 0;
    let dateIssues = 0;

    console.log('\n🔍 Analizando primeros 20 casos...\n');

    for (let i = 0; i < Math.min(20, matchingPreopData.length); i++) {
      const row = matchingPreopData[i];
      const ci = String(row['CI']).trim();
      const fechaExcel = parseExcelDate(row['Fecha']);

      // Get patient preop evaluations
      const preops = await prisma.preopEvaluation.findMany({
        where: { patientId: ci },
        include: { patient: true }
      });

      console.log(`--- CI: ${ci} (${preops[0]?.patient.name || 'unknown'}) ---`);
      console.log(`Fecha en Excel: ${fechaExcel?.toISOString().split('T')[0]}`);
      console.log(`Preops en BD: ${preops.length}`);

      if (preops.length === 0) {
        console.log(`❌ No tiene evaluación preoperatoria en BD`);
        noPreopEval++;
      } else {
        hasPreopEval++;
        console.log(`Fechas de preops en BD:`);
        preops.forEach(p => {
          const diff = Math.abs(p.evaluationDate.getTime() - fechaExcel.getTime()) / (1000 * 60 * 60 * 24);
          const match = diff <= 2 ? '✅' : '❌';
          console.log(`  ${match} ${p.evaluationDate.toISOString().split('T')[0]} (diff: ${diff.toFixed(1)} días)`);

          if (diff > 2) dateIssues++;
        });
      }
      console.log();
    }

    console.log('\n📈 Resumen:');
    console.log(`Pacientes con preop eval: ${hasPreopEval}`);
    console.log(`Pacientes sin preop eval: ${noPreopEval}`);
    console.log(`Casos con diferencia de fechas > 2 días: ${dateIssues}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyze();
