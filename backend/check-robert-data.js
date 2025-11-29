const prisma = require('./src/lib/prisma');

(async () => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { ciRaw: '3326307' },
      include: {
        cases: {
          orderBy: { surgeryDate: 'desc' },
          take: 1,
          include: {
            intraoperativeRecords: {
              orderBy: { recordedAt: 'asc' }
            },
            fluidBalance: {
              orderBy: { recordedAt: 'asc' }
            }
          }
        }
      }
    });

    if (!patient || !patient.cases[0]) {
      console.log('No se encontró el caso de Robert Guillen');
      return;
    }

    const caso = patient.cases[0];
    console.log('=== CASO ROBERT GUILLEN ===');
    console.log('Case ID:', caso.id);
    console.log('Fecha:', caso.surgeryDate);
    console.log('\n=== FLUID BALANCE RECORDS ===');
    console.log('Total registros:', caso.fluidBalance.length);
    caso.fluidBalance.forEach((f, idx) => {
      console.log(`\n[${idx + 1}] Hora: ${f.recordedAt}`);
      console.log(`  Fase: ${f.phase}`);
      console.log(`  Diuresis: ${f.urine} ml`);
      console.log(`  Sangrado Aspiración: ${f.suction} ml`);
      console.log(`  Sangrado Gasas: ${f.gauze} ml`);
      console.log(`  Cell Saver: ${f.cellSaver} ml`);
      console.log(`  Glóbulos Rojos: ${f.redBloodCells} U`);
      console.log(`  Plasmalyte: ${f.plasmalyte} ml`);
      console.log(`  Ringer: ${f.ringer} ml`);
      console.log(`  SF: ${f.saline} ml`);
      console.log(`  Albúmina: ${f.albumin} ml`);
      console.log(`  Coloides: ${f.colloids} ml`);
    });
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await prisma.$disconnect();
  }
})();
