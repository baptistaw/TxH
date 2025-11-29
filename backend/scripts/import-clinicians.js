// scripts/import-clinicians.js
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const prisma = new PrismaClient();

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

// Helper para parsear clínico del formato "CP: Nombre"
function parseClinician(clinicianStr) {
  if (!clinicianStr || clinicianStr === 'undefined') return null;

  const str = String(clinicianStr).trim();

  // Formato: "CP: Nombre"
  if (str.includes(':')) {
    const parts = str.split(':');
    const cp = parseInt(parts[0].trim());
    const name = parts.slice(1).join(':').trim();

    if (isNaN(cp) || !name) return null;

    return { cp, name };
  }

  return null;
}

async function importClinicians() {
  console.log('\n👨‍⚕️ IMPORTANDO CLÍNICOS\n');

  try {
    const workbook = XLSX.readFile(excelPath);
    const trasplanteData = XLSX.utils.sheet_to_json(workbook.Sheets['DatosTrasplante']);

    // Extraer todos los clínicos únicos con sus roles
    const cliniciansMap = new Map();

    trasplanteData.forEach(row => {
      const roles = [
        { field: 'Anestesista 1', specialty: 'ANESTESIOLOGO' },
        { field: 'Anestesista 2', specialty: 'ANESTESIOLOGO' },
        { field: 'Cirujano 1', specialty: 'CIRUJANO' },
        { field: 'Cirujano 2', specialty: 'CIRUJANO' },
        { field: 'Intensivista', specialty: 'INTENSIVISTA' },
        { field: 'Hepatólogo', specialty: 'HEPATOLOGO' },
        { field: 'NurseCoordinadora', specialty: 'COORDINADORA' }
      ];

      roles.forEach(({ field, specialty }) => {
        const clinician = parseClinician(row[field]);
        if (clinician) {
          if (!cliniciansMap.has(clinician.cp)) {
            cliniciansMap.set(clinician.cp, {
              cp: clinician.cp,
              name: clinician.name,
              specialty: specialty
            });
          }
        }
      });
    });

    console.log(`✓ Clínicos únicos encontrados: ${cliniciansMap.size}\n`);
    console.log('='.repeat(80));

    let imported = 0;
    let updated = 0;
    let errors = 0;

    for (const [cp, clinician] of cliniciansMap) {
      try {
        console.log(`\nImportando: ${clinician.name} (CP: ${cp}) - ${clinician.specialty}`);

        // Generar email basado en el nombre (ya que el Excel no tiene emails)
        const emailBase = clinician.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remover acentos
          .replace(/\s+/g, '.')
          .replace(/[^a-z.]/g, '');

        const email = `${emailBase}@txh.uy`;

        const result = await prisma.clinician.upsert({
          where: { id: cp },
          update: {
            name: clinician.name,
            specialty: clinician.specialty,
          },
          create: {
            id: cp,
            name: clinician.name,
            specialty: clinician.specialty,
            email: email,
          }
        });

        if (result.createdAt.getTime() > Date.now() - 1000) {
          imported++;
          console.log(`  ✓ Clínico creado`);
        } else {
          updated++;
          console.log(`  ✓ Clínico actualizado`);
        }

      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN DE IMPORTACIÓN');
    console.log('='.repeat(80));
    console.log(`✅ Clínicos nuevos: ${imported}`);
    console.log(`🔄 Clínicos actualizados: ${updated}`);
    console.log(`❌ Errores: ${errors}`);
    console.log('\n✅ Importación de clínicos completada\n');

  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importClinicians().catch(console.error);
