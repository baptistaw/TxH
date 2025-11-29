// Script para importar laboratorios desde Excel histórico
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

// Función para parsear fechas de Excel (números seriales)
function parseExcelDate(serial) {
  if (!serial || serial === '' || isNaN(serial)) return null;

  // Excel fecha base: 1900-01-01 (pero Excel tiene un bug con 1900 como año bisiesto)
  const excelEpoch = new Date(1899, 11, 30); // 30 de diciembre de 1899
  const days = Math.floor(serial);
  const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);

  return date;
}

// Función para convertir valor a número float o null
function toFloat(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

async function importPreopLabs() {
  console.log('📖 Leyendo archivo Excel...');

  try {
    const workbook = XLSX.readFile(excelPath);
    const sheetName = 'Preoperatorio';
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`📊 Encontradas ${data.length} filas en la hoja ${sheetName}`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of data) {
      try {
        const ci = String(row['CI']).trim();

        if (!ci) {
          skipped++;
          continue;
        }

        // Buscar la evaluación preoperatoria correspondiente
        const fechaEval = parseExcelDate(row['Fecha']);
        if (!fechaEval) {
          console.log(`⚠️  CI ${ci}: Fecha inválida`);
          skipped++;
          continue;
        }

        // Buscar TODAS las preops por paciente y fecha cercana (±2 días)
        // porque hay duplicados en la BD
        const startDate = new Date(fechaEval);
        startDate.setDate(startDate.getDate() - 2);
        const endDate = new Date(fechaEval);
        endDate.setDate(endDate.getDate() + 2);

        const preops = await prisma.preopEvaluation.findMany({
          where: {
            patientId: ci,
            evaluationDate: {
              gte: startDate,
              lte: endDate
            }
          }
        });

        if (!preops || preops.length === 0) {
          // No existe evaluación preop para este paciente
          skipped++;
          continue;
        }

        // Parsear fecha de laboratorio (puede ser diferente a fecha de evaluación)
        let labDate = parseExcelDate(row['FechaLaboratorio']);
        if (!labDate) {
          labDate = fechaEval; // Si no hay fecha específica, usar fecha de evaluación
        }

        // Crear labs para TODAS las preops encontradas (para manejar duplicados)
        for (const preop of preops) {
          // Verificar si ya existe un lab para esta preop en esta fecha
          const existingLab = await prisma.preopLabs.findFirst({
            where: {
              preopId: preop.id,
              labDate: labDate
            }
          });

          if (existingLab) {
            continue; // Skip this preop, but continue with others
          }

          // Crear registro de laboratorio
          const labData = {
            preopId: preop.id,
            labDate: labDate,

            // Hematología
            hb: toFloat(row['Hb']),
            hto: toFloat(row['Hto']),
            platelets: toFloat(row['Plaquetas']),

            // Coagulación
            pt: toFloat(row['TP']),
            inr: toFloat(row['INR']),
            fibrinogen: toFloat(row['Fib']),

            // Bioquímica
            glucose: toFloat(row['Glicemia']),
            sodium: toFloat(row['Na']),
            potassium: toFloat(row['K']),
            ionicCalcium: toFloat(row['CaIonico']),
            magnesium: toFloat(row['Mg']),
            azotemia: toFloat(row['Azo']),
            creatinine: toFloat(row['Crea']),
            gfr: toFloat(row['IFG']),

            // Función hepática
            sgot: toFloat(row['TGO']),
            sgpt: toFloat(row['TGP']),
            totalBili: toFloat(row['Btotal']),
            albumin: toFloat(row['Albumina']),

            // Otros
            tsh: toFloat(row['TSH'])
          };

          await prisma.preopLabs.create({ data: labData });
          imported++;
        }

        if (imported % 50 === 0) {
          console.log(`  ✅ Importados: ${imported}, Omitidos: ${skipped}`);
        }

      } catch (error) {
        console.error(`❌ Error procesando CI ${row['CI']}:`, error.message);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Importación completada:`);
    console.log(`   - Laboratorios importados: ${imported}`);
    console.log(`   - Registros omitidos: ${skipped}`);
    console.log(`   - Errores: ${errors}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error fatal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
importPreopLabs()
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
