const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const { normalizarCI } = require('/home/william-baptista/TxH/anestesia-trasplante/backend/scripts/ci-validator');

const prisma = new PrismaClient();
const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

async function analyzeExample() {
  console.log('\n📊 EJEMPLO DEL PROBLEMA: REGISTROS MEZCLADOS\n');
  console.log('='.repeat(80));

  // Buscar trasplantes de Alejandra Araujo en la BD
  const cases = await prisma.transplantCase.findMany({
    where: { patientId: '41812486' },
    include: { patient: true },
    orderBy: { startAt: 'asc' }
  });

  console.log('\n✅ TRASPLANTES EN LA BASE DE DATOS:\n');
  console.log(`Paciente: ${cases[0]?.patient.name || 'Desconocido'} (CI: 41812486)`);
  console.log(`Total trasplantes: ${cases.length}\n`);

  cases.forEach((c, idx) => {
    console.log(`Trasplante ${idx + 1}:`);
    console.log(`  Fecha inicio: ${c.startAt ? new Date(c.startAt).toISOString().split('T')[0] : 'Sin fecha'}`);
    console.log(`  Retrasplante: ${c.isRetransplant ? 'SÍ' : 'NO'}`);
    console.log('');
  });

  // Buscar registros intraop en la BD
  const intraopRecords = await prisma.intraopRecord.findMany({
    where: { case: { patientId: '41812486' } },
    include: { case: true },
    orderBy: { timestamp: 'asc' }
  });

  console.log('='.repeat(80));
  console.log(`\n✅ REGISTROS INTRAOPERATORIOS EN LA BD: ${intraopRecords.length}\n`);

  if (intraopRecords.length > 0) {
    const byPhase = {};
    intraopRecords.forEach(r => {
      if (!byPhase[r.phase]) byPhase[r.phase] = [];
      byPhase[r.phase].push(r.timestamp);
    });

    Object.entries(byPhase).forEach(([phase, timestamps]) => {
      console.log(`  ${phase}: ${timestamps.length} registros`);
      timestamps.forEach((ts, idx) => {
        console.log(`    [${idx + 1}] ${new Date(ts).toISOString().split('T')[0]}`);
      });
    });
  }

  // Buscar en el Excel
  console.log('\n' + '='.repeat(80));
  console.log('\n⚠️  REGISTROS EN EL EXCEL (hoja IntraopCierre):\n');

  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets['IntraopCierre'];
  const data = XLSX.utils.sheet_to_json(sheet);

  const aleRecords = data.filter(row => {
    const ciStr = String(row.CI || '').split(':')[0].trim();
    const validation = normalizarCI(ciStr);
    return validation.ci === '41812486';
  });

  console.log(`  Total registros en Excel para esta CI: ${aleRecords.length}\n`);

  aleRecords.forEach((row, idx) => {
    const excelDate = row.Fecha;
    const jsDate = excelDate ? new Date((excelDate - 25569) * 86400 * 1000) : null;
    console.log(`  Registro ${idx + 1}:`);
    console.log(`    Fecha (Excel): ${excelDate}`);
    console.log(`    Fecha (convertida): ${jsDate ? jsDate.toISOString() : 'Inválida'}`);
    console.log('');
  });

  console.log('='.repeat(80));
  console.log('\n🔍 ANÁLISIS DEL PROBLEMA:\n');
  console.log('Si hay registros con fechas MUY alejadas del trasplante,');
  console.log('significa que están MEZCLADOS con registros de otro procedimiento.\n');
  console.log('Esto causa duraciones imposibles cuando el script toma el registro');
  console.log('más reciente como "fin de cirugía".\n');

  await prisma.$disconnect();
}

analyzeExample();
