// scripts/verify-patient-count.js
// Verifica que todos los pacientes del Excel estén en la BD

const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const { normalizarCI } = require('./ci-validator');

const prisma = new PrismaClient();
const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

async function verify() {
  const wb = XLSX.readFile(excelPath);
  const data = XLSX.utils.sheet_to_json(wb.Sheets['DatosPaciente']);

  const totalInDB = await prisma.patient.count();
  const totalInExcel = data.length;

  console.log('═'.repeat(80));
  console.log('📊 COMPARACIÓN EXCEL vs BASE DE DATOS');
  console.log('═'.repeat(80));
  console.log('');
  console.log('Registros en Excel (DatosPaciente):', totalInExcel);
  console.log('Pacientes en Base de Datos:', totalInDB);
  console.log('Diferencia:', totalInExcel - totalInDB);
  console.log('');

  // Buscar registros en Excel que no estén en BD
  const missing = [];
  for (const row of data) {
    const ciValidation = normalizarCI(row.CI);
    if (!ciValidation.ci) continue;

    const patient = await prisma.patient.findUnique({
      where: { id: ciValidation.ci }
    });

    if (!patient) {
      missing.push({ ci: ciValidation.ci, name: row.Nombre });
    }
  }

  if (missing.length > 0) {
    console.log('⚠️  PACIENTES EN EXCEL QUE NO ESTÁN EN LA BD:', missing.length);
    console.log('');
    missing.slice(0, 10).forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.name} (CI: ${m.ci})`);
    });
    if (missing.length > 10) {
      console.log(`  ... y ${missing.length - 10} más`);
    }
  } else {
    console.log('✅ TODOS LOS PACIENTES DEL EXCEL ESTÁN EN LA BASE DE DATOS');
  }

  console.log('');

  // Verificar campos importados
  const samples = await prisma.patient.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });

  console.log('═'.repeat(80));
  console.log('MUESTRA DE PACIENTES IMPORTADOS (últimos 5):');
  console.log('═'.repeat(80));
  console.log('');

  samples.forEach((p, i) => {
    console.log(`${i + 1}. ${p.name} (CI: ${p.id})`);
    console.log(`   - FNR: ${p.fnr || 'N/A'}`);
    console.log(`   - Sexo: ${p.sex || 'N/A'}`);
    console.log(`   - Origen: ${p.placeOfOrigin || 'N/A'}`);
    console.log(`   - Prestador: ${p.provider || 'N/A'}`);
    console.log(`   - Talla: ${p.height || 'N/A'} cm`);
    console.log(`   - Peso: ${p.weight || 'N/A'} kg`);
    console.log(`   - Grupo Sanguíneo: ${p.bloodGroup || 'N/A'}`);
    console.log(`   - ASA: ${p.asa || 'N/A'}`);
    console.log('');
  });

  // Verificar campos con valores vs sin valores
  console.log('═'.repeat(80));
  console.log('ESTADÍSTICAS DE CAMPOS IMPORTADOS:');
  console.log('═'.repeat(80));
  console.log('');

  const stats = {
    withFNR: await prisma.patient.count({ where: { fnr: { not: null } } }),
    withOrigin: await prisma.patient.count({ where: { placeOfOrigin: { not: null } } }),
    withProvider: await prisma.patient.count({ where: { provider: { not: null } } }),
    withBirthDate: await prisma.patient.count({ where: { birthDate: { not: null } } }),
    withSex: await prisma.patient.count({ where: { sex: { not: null } } }),
    withASA: await prisma.patient.count({ where: { asa: { not: null } } }),
    withHeight: await prisma.patient.count({ where: { height: { not: null } } }),
    withWeight: await prisma.patient.count({ where: { weight: { not: null } } }),
    withBloodGroup: await prisma.patient.count({ where: { bloodGroup: { not: null } } }),
    withAdmission: await prisma.patient.count({ where: { admissionDate: { not: null } } }),
    withObs: await prisma.patient.count({ where: { observations: { not: null } } }),
  };

  console.log(`Número de Historia Clínica (FNR):    ${stats.withFNR}/${totalInDB} (${((stats.withFNR/totalInDB)*100).toFixed(1)}%)`);
  console.log(`Lugar de Procedencia:                ${stats.withOrigin}/${totalInDB} (${((stats.withOrigin/totalInDB)*100).toFixed(1)}%)`);
  console.log(`Prestador:                           ${stats.withProvider}/${totalInDB} (${((stats.withProvider/totalInDB)*100).toFixed(1)}%)`);
  console.log(`Fecha de Nacimiento:                 ${stats.withBirthDate}/${totalInDB} (${((stats.withBirthDate/totalInDB)*100).toFixed(1)}%)`);
  console.log(`Sexo:                                ${stats.withSex}/${totalInDB} (${((stats.withSex/totalInDB)*100).toFixed(1)}%)`);
  console.log(`ASA:                                 ${stats.withASA}/${totalInDB} (${((stats.withASA/totalInDB)*100).toFixed(1)}%)`);
  console.log(`Talla:                               ${stats.withHeight}/${totalInDB} (${((stats.withHeight/totalInDB)*100).toFixed(1)}%)`);
  console.log(`Peso:                                ${stats.withWeight}/${totalInDB} (${((stats.withWeight/totalInDB)*100).toFixed(1)}%)`);
  console.log(`Grupo Sanguíneo:                     ${stats.withBloodGroup}/${totalInDB} (${((stats.withBloodGroup/totalInDB)*100).toFixed(1)}%)`);
  console.log(`Fecha Ingreso Lista:                 ${stats.withAdmission}/${totalInDB} (${((stats.withAdmission/totalInDB)*100).toFixed(1)}%)`);
  console.log(`Observaciones:                       ${stats.withObs}/${totalInDB} (${((stats.withObs/totalInDB)*100).toFixed(1)}%)`);
  console.log('');

  await prisma.$disconnect();
}

verify().catch(e => {
  console.error(e);
  process.exit(1);
});
