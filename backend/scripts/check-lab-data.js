// scripts/check-lab-data.js
// Verificar si hay datos de laboratorio en los registros intraoperatorios
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLabData() {
  console.log('\n🔬 VERIFICACIÓN DE DATOS DE LABORATORIO\n');
  console.log('='.repeat(80));

  try {
    // Total de registros
    const totalRecords = await prisma.intraopRecord.count();
    console.log(`\nTotal registros intraoperatorios: ${totalRecords}\n`);

    // Verificar campos de laboratorio específicos
    const labFields = {
      // Hematología
      'hb': 'Hemoglobina',
      'hto': 'Hematocrito',
      'platelets': 'Plaquetas',

      // Coagulación
      'pt': 'Tiempo de Protrombina',
      'inr': 'INR',
      'fibrinogen': 'Fibrinógeno',
      'aptt': 'APTT',

      // Electrolitos
      'sodium': 'Sodio',
      'potassium': 'Potasio',
      'ionicCalcium': 'Calcio Iónico',
      'magnesium': 'Magnesio',
      'chloride': 'Cloruro',

      // Gases arteriales
      'pH': 'pH arterial',
      'paO2': 'PaO2',
      'paCO2': 'PaCO2',
      'hco3': 'Bicarbonato',
      'baseExcess': 'Exceso de Base',

      // Función renal
      'azotemia': 'Azotemia/BUN',
      'creatinine': 'Creatinina',

      // Función hepática
      'sgot': 'SGOT/AST',
      'sgpt': 'SGPT/ALT',
      'totalBili': 'Bilirrubina Total',
      'albumin': 'Albúmina',

      // Metabólicos
      'glucose': 'Glucosa',
      'lactate': 'Lactato',
    };

    console.log('📊 REGISTROS CON DATOS DE LABORATORIO:\n');

    for (const [field, name] of Object.entries(labFields)) {
      const count = await prisma.intraopRecord.count({
        where: {
          [field]: { not: null }
        }
      });

      const percentage = totalRecords > 0 ? ((count / totalRecords) * 100).toFixed(2) : '0.00';

      if (count > 0) {
        console.log(`✓ ${name.padEnd(25)}: ${count.toString().padStart(4)} registros (${percentage}%)`);
      } else {
        console.log(`✗ ${name.padEnd(25)}: ${count.toString().padStart(4)} registros (${percentage}%)`);
      }
    }

    // Total de registros con AL MENOS un dato de laboratorio
    console.log('\n' + '='.repeat(80));
    console.log('\n📈 RESUMEN:\n');

    const recordsWithAnyLab = await prisma.intraopRecord.count({
      where: {
        OR: [
          { hb: { not: null } },
          { hto: { not: null } },
          { platelets: { not: null } },
          { pt: { not: null } },
          { inr: { not: null } },
          { sodium: { not: null } },
          { potassium: { not: null } },
          { pH: { not: null } },
          { lactate: { not: null } },
          { glucose: { not: null } },
          { creatinine: { not: null } },
        ]
      }
    });

    console.log(`Registros con AL MENOS un dato de laboratorio: ${recordsWithAnyLab} (${((recordsWithAnyLab / totalRecords) * 100).toFixed(2)}%)`);
    console.log(`Registros SIN datos de laboratorio: ${totalRecords - recordsWithAnyLab} (${(((totalRecords - recordsWithAnyLab) / totalRecords) * 100).toFixed(2)}%)\n`);

    // Ejemplo de un registro CON datos de laboratorio (si existe)
    if (recordsWithAnyLab > 0) {
      console.log('='.repeat(80));
      console.log('\n📋 EJEMPLO DE REGISTRO CON DATOS DE LABORATORIO:\n');

      const exampleRecord = await prisma.intraopRecord.findFirst({
        where: {
          OR: [
            { hb: { not: null } },
            { lactate: { not: null } },
          ]
        },
        include: {
          case: {
            include: {
              patient: true
            }
          }
        }
      });

      if (exampleRecord) {
        console.log(`Paciente: ${exampleRecord.case.patient.name} (CI: ${exampleRecord.case.patientId})`);
        console.log(`Fecha: ${new Date(exampleRecord.timestamp).toISOString()}`);
        console.log(`Fase: ${exampleRecord.phase}\n`);
        console.log('Valores encontrados:');
        if (exampleRecord.hb) console.log(`  - Hemoglobina: ${exampleRecord.hb} g/dL`);
        if (exampleRecord.hto) console.log(`  - Hematocrito: ${exampleRecord.hto}%`);
        if (exampleRecord.platelets) console.log(`  - Plaquetas: ${exampleRecord.platelets} x10³/µL`);
        if (exampleRecord.lactate) console.log(`  - Lactato: ${exampleRecord.lactate} mmol/L`);
        if (exampleRecord.sodium) console.log(`  - Sodio: ${exampleRecord.sodium} mEq/L`);
        if (exampleRecord.potassium) console.log(`  - Potasio: ${exampleRecord.potassium} mEq/L`);
        if (exampleRecord.glucose) console.log(`  - Glucosa: ${exampleRecord.glucose} mg/dL`);
        console.log('');
      }
    }

    // Verificar si el problema es de importación
    console.log('='.repeat(80));
    console.log('\n🔍 DIAGNÓSTICO:\n');

    if (recordsWithAnyLab === 0) {
      console.log('❌ NO HAY DATOS DE LABORATORIO IMPORTADOS\n');
      console.log('Posibles causas:');
      console.log('  1. El script de importación NO está importando los datos de laboratorio del Excel');
      console.log('  2. Las columnas de laboratorio en el Excel están vacías');
      console.log('  3. El mapeo de columnas Excel → BD está incorrecto\n');
      console.log('Acción recomendada: Revisar el script import-intraop-records.js');
    } else if (recordsWithAnyLab < totalRecords * 0.5) {
      console.log('⚠️  HAY DATOS DE LABORATORIO PERO SON ESCASOS\n');
      console.log(`Solo ${((recordsWithAnyLab / totalRecords) * 100).toFixed(2)}% de registros tienen datos de laboratorio.\n`);
      console.log('Posible causa: Datos de laboratorio no están disponibles para todos los registros.');
    } else {
      console.log('✅ HAY DATOS DE LABORATORIO IMPORTADOS\n');
      console.log('El problema podría ser en la visualización en la plataforma (frontend/API).');
    }

    console.log('✅ Verificación completada\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkLabData();
