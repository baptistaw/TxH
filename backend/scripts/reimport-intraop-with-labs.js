// scripts/reimport-intraop-with-labs.js
// Limpiar y reimportar registros intraoperatorios CON datos de laboratorio
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function reimport() {
  console.log('\n🔄 REIMPORTACIÓN DE REGISTROS INTRAOPERATORIOS CON LABORATORIO\n');
  console.log('='.repeat(80));

  try {
    // PASO 1: Backup de estadísticas actuales
    console.log('\n📊 ESTADO ACTUAL:\n');

    const currentTotal = await prisma.intraopRecord.count();
    const currentWithLab = await prisma.intraopRecord.count({
      where: {
        OR: [
          { hb: { not: null } },
          { lactate: { not: null } },
          { sodium: { not: null } },
        ]
      }
    });

    console.log(`Total registros intraop: ${currentTotal}`);
    console.log(`Con datos de lab: ${currentWithLab} (${((currentWithLab / currentTotal) * 100).toFixed(2)}%)\n`);

    // PASO 2: Eliminar SOLO registros intraoperatorios (NO los casos)
    console.log('='.repeat(80));
    console.log('\n🗑️  ELIMINANDO REGISTROS INTRAOPERATORIOS ACTUALES...\n');

    const deleted = await prisma.intraopRecord.deleteMany({});
    console.log(`✓ Eliminados ${deleted.count} registros\n`);

    // PASO 3: Reimportar con el script corregido
    console.log('='.repeat(80));
    console.log('\n📥 REIMPORTANDO CON SCRIPT CORREGIDO...\n');

    execSync('node /home/william-baptista/TxH/anestesia-trasplante/backend/scripts/import-intraop-records.js', {
      stdio: 'inherit'
    });

    // PASO 4: Verificar resultado
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 RESULTADO FINAL:\n');

    const newTotal = await prisma.intraopRecord.count();
    const newWithHb = await prisma.intraopRecord.count({ where: { hb: { not: null } } });
    const newWithHto = await prisma.intraopRecord.count({ where: { hto: { not: null } } });
    const newWithPlatelets = await prisma.intraopRecord.count({ where: { platelets: { not: null } } });
    const newWithSodium = await prisma.intraopRecord.count({ where: { sodium: { not: null } } });
    const newWithPotassium = await prisma.intraopRecord.count({ where: { potassium: { not: null } } });
    const newWithLactate = await prisma.intraopRecord.count({ where: { lactate: { not: null } } });
    const newWithGlucose = await prisma.intraopRecord.count({ where: { glucose: { not: null } } });
    const newWithPH = await prisma.intraopRecord.count({ where: { pH: { not: null } } });
    const newWithINR = await prisma.intraopRecord.count({ where: { inr: { not: null } } });
    const newWithCreatinine = await prisma.intraopRecord.count({ where: { creatinine: { not: null } } });

    console.log(`Total registros intraop: ${newTotal}`);
    console.log(`\nDatos de laboratorio importados:\n`);
    console.log(`  Hemoglobina:      ${newWithHb.toString().padStart(4)} (${((newWithHb / newTotal) * 100).toFixed(1)}%)`);
    console.log(`  Hematocrito:      ${newWithHto.toString().padStart(4)} (${((newWithHto / newTotal) * 100).toFixed(1)}%)`);
    console.log(`  Plaquetas:        ${newWithPlatelets.toString().padStart(4)} (${((newWithPlatelets / newTotal) * 100).toFixed(1)}%)`);
    console.log(`  Sodio:            ${newWithSodium.toString().padStart(4)} (${((newWithSodium / newTotal) * 100).toFixed(1)}%)`);
    console.log(`  Potasio:          ${newWithPotassium.toString().padStart(4)} (${((newWithPotassium / newTotal) * 100).toFixed(1)}%)`);
    console.log(`  Lactato:          ${newWithLactate.toString().padStart(4)} (${((newWithLactate / newTotal) * 100).toFixed(1)}%)`);
    console.log(`  Glucosa:          ${newWithGlucose.toString().padStart(4)} (${((newWithGlucose / newTotal) * 100).toFixed(1)}%)`);
    console.log(`  pH arterial:      ${newWithPH.toString().padStart(4)} (${((newWithPH / newTotal) * 100).toFixed(1)}%)`);
    console.log(`  INR:              ${newWithINR.toString().padStart(4)} (${((newWithINR / newTotal) * 100).toFixed(1)}%)`);
    console.log(`  Creatinina:       ${newWithCreatinine.toString().padStart(4)} (${((newWithCreatinine / newTotal) * 100).toFixed(1)}%)`);

    console.log(`\n✅ Reimportación completada\n`);

    // Comparación
    console.log('='.repeat(80));
    console.log('\n📈 COMPARACIÓN:\n');
    console.log(`Antes: ${currentTotal} registros, ${currentWithLab} con lab (${((currentWithLab / currentTotal) * 100).toFixed(2)}%)`);
    console.log(`Ahora: ${newTotal} registros, ${newWithHb} con Hb (${((newWithHb / newTotal) * 100).toFixed(2)}%)`);
    console.log(`\nMejora: +${newWithHb - currentWithLab} registros con datos de laboratorio\n`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

reimport();
