// Script para comparar pacientes en Excel vs BD
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

async function compare() {
  try {
    console.log('📖 Leyendo hojas del Excel...\n');

    const workbook = XLSX.readFile(excelPath);

    // Mostrar todas las hojas disponibles
    console.log('📊 Hojas disponibles:');
    workbook.SheetNames.forEach((name, idx) => {
      const sheet = workbook.Sheets[name];
      const data = XLSX.utils.sheet_to_json(sheet);
      console.log(`  ${idx + 1}. ${name} (${data.length} filas)`);
    });

    // Leer pacientes de la hoja que se usó para importar originalmente
    const patientSheet = workbook.Sheets['Paciente'];
    const patientData = XLSX.utils.sheet_to_json(patientSheet);

    console.log(`\n📋 Pacientes en hoja "Paciente": ${patientData.length}`);

    // Leer CIs de la hoja Preoperatorio
    const preopSheet = workbook.Sheets['Preoperatorio'];
    const preopData = XLSX.utils.sheet_to_json(preopSheet);

    const preopCIs = new Set(preopData.map(r => String(r['CI']).trim()).filter(ci => ci));
    console.log(`📋 CIs únicos en hoja "Preoperatorio": ${preopCIs.size}`);

    // Contar cuántos pacientes de BD existen
    const dbPatients = await prisma.patient.findMany({
      select: { id: true }
    });
    const dbCIs = new Set(dbPatients.map(p => p.id));
    console.log(`📋 Pacientes en BD: ${dbCIs.size}`);

    // Comparar overlap
    const preopCIsArray = Array.from(preopCIs);
    const inBoth = preopCIsArray.filter(ci => dbCIs.has(ci));
    const onlyInPreop = preopCIsArray.filter(ci => !dbCIs.has(ci));

    console.log(`\n✅ CIs que están en AMBOS (Preop y BD): ${inBoth.length}`);
    console.log(`❌ CIs solo en Preoperatorio (no en BD): ${onlyInPreop.length}`);

    // Mostrar algunos ejemplos de CIs que no están en BD
    if (onlyInPreop.length > 0) {
      console.log(`\n📋 Primeros 10 CIs del Preoperatorio que NO están en BD:`);
      onlyInPreop.slice(0, 10).forEach(ci => {
        const row = preopData.find(r => String(r['CI']).trim() === ci);
        console.log(`  - CI: ${ci} (Fecha: ${row['Fecha']})`);
      });
    }

    // Revisar si necesitamos importar pacientes desde otra hoja
    const patientCIs = new Set(patientData.map(r => String(r['CI']).trim()).filter(ci => ci));
    const missingInPatientSheet = onlyInPreop.filter(ci => !patientCIs.has(ci));

    console.log(`\n🔍 CIs del Preoperatorio que tampoco están en hoja "Paciente": ${missingInPatientSheet.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

compare();
