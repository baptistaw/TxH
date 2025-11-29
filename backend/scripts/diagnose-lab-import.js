// Script para diagnosticar por qué no se importaron los labs
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

async function diagnose() {
  try {
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets['Preoperatorio'];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`📊 Total filas en Excel: ${data.length}`);

    // Analizar primeras 10 filas
    console.log('\n🔍 Analizando primeras 10 filas:');
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      const ci = String(row['CI']).trim();
      const fechaEval = parseExcelDate(row['Fecha']);

      console.log(`\n--- Fila ${i + 1} ---`);
      console.log(`CI: ${ci}`);
      console.log(`Fecha raw: ${row['Fecha']}`);
      console.log(`Fecha parsed: ${fechaEval}`);

      if (ci && fechaEval) {
        // Buscar preop
        const startDate = new Date(fechaEval);
        startDate.setDate(startDate.getDate() - 2);
        const endDate = new Date(fechaEval);
        endDate.setDate(endDate.getDate() + 2);

        const preop = await prisma.preopEvaluation.findFirst({
          where: {
            patientId: ci,
            evaluationDate: {
              gte: startDate,
              lte: endDate
            }
          },
          include: {
            patient: true
          }
        });

        if (preop) {
          console.log(`✅ PREOP ENCONTRADA: ${preop.patient.name} (fecha: ${preop.evaluationDate.toISOString().split('T')[0]})`);
        } else {
          console.log(`❌ PREOP NO ENCONTRADA`);

          // Buscar si existe el paciente
          const patient = await prisma.patient.findUnique({
            where: { id: ci }
          });

          if (patient) {
            console.log(`   Paciente existe: ${patient.name}`);

            // Buscar todas las preops de este paciente
            const allPreops = await prisma.preopEvaluation.findMany({
              where: { patientId: ci }
            });

            if (allPreops.length > 0) {
              console.log(`   Tiene ${allPreops.length} preops con fechas:`);
              allPreops.forEach(p => {
                const diff = Math.abs(p.evaluationDate.getTime() - fechaEval.getTime()) / (1000 * 60 * 60 * 24);
                console.log(`     - ${p.evaluationDate.toISOString().split('T')[0]} (diferencia: ${diff.toFixed(1)} días)`);
              });
            } else {
              console.log(`   ❌ Paciente NO tiene preops`);
            }
          } else {
            console.log(`   ❌ Paciente NO existe en BD`);
          }
        }
      } else {
        console.log(`❌ CI o Fecha inválidos`);
      }
    }

    // Estadísticas generales
    console.log('\n📈 Estadísticas:');

    const rowsWithCI = data.filter(r => r['CI'] && String(r['CI']).trim()).length;
    console.log(`Filas con CI: ${rowsWithCI}`);

    const rowsWithDate = data.filter(r => parseExcelDate(r['Fecha'])).length;
    console.log(`Filas con fecha válida: ${rowsWithDate}`);

    const rowsComplete = data.filter(r => r['CI'] && String(r['CI']).trim() && parseExcelDate(r['Fecha'])).length;
    console.log(`Filas con CI y fecha: ${rowsComplete}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
