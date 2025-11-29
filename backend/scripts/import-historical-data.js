// scripts/import-historical-data.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Función para parsear tiempo AM/PM a formato ISO
function parseTime(dateStr, timeStr) {
  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);

  if (period.includes('p.') && hours !== 12) {
    hours += 12;
  } else if (period.includes('a.') && hours === 12) {
    hours = 0;
  }

  const date = new Date(dateStr);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

// Mapeo de nombres de fase del CSV histórico a enum actual
const phaseMapping = {
  'ESTADO_BASAL': 'ESTADO_BASAL',
  'INDUCCION': 'INDUCCION',
  'DISECCION': 'DISECCION',
  'ANHEPATICA': 'ANHEPATICA',
  'PRE_REPERFUSION': 'PRE_REPERFUSION',
  'POST_REPERFUSION': 'POST_REPERFUSION',
  'VIA_BILIAR': 'VIA_BILIAR',
  'FIN_VIA_BILIAR': 'VIA_BILIAR', // Mapear fase antigua a la nueva
  'CIERRE': 'CIERRE',
  'SALIDA_BQ': 'SALIDA_BQ'
};

async function importHistoricalData() {
  const csvPath = '/home/william-baptista/TxH/Documentacion desarrollo/caso-cmhyzhydc0003arfam04fx2br-intraop.csv';
  const caseId = 'cmhyzhydc0003arfam04fx2br'; // ID del caso existente
  const surgeryDate = '2025-11-17'; // Fecha de la cirugía

  console.log('📊 Iniciando importación de datos históricos...\n');

  try {
    // Leer CSV
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

    console.log('Columnas encontradas:', headers.join(', '));
    console.log(`Total de registros a importar: ${lines.length - 1}\n`);

    const errors = [];
    const warnings = [];
    let successCount = 0;

    // Procesar cada línea (saltar header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(',').map(v => v.replace(/"/g, '').trim());

      const record = {};
      headers.forEach((header, index) => {
        record[header] = values[index];
      });

      try {
        // Mapear campos
        const phase = phaseMapping[record.Fase];
        if (!phase) {
          throw new Error(`Fase desconocida: ${record.Fase}`);
        }

        const timestamp = parseTime(surgeryDate, record.Hora);

        const intraopData = {
          caseId,
          phase,
          timestamp: new Date(timestamp),

          // Hemodinamia
          heartRate: record['FC'] ? parseInt(record['FC']) : null,
          pas: record['PAS'] ? parseInt(record['PAS']) : null,
          pad: record['PAD'] ? parseInt(record['PAD']) : null,
          pam: record['PAm'] ? parseInt(record['PAm']) : null,
          cvp: record['PVC'] ? parseInt(record['PVC']) : null,
          satO2: record['SpO₂'] ? parseInt(record['SpO₂']) : null,
          temp: record['Temp'] ? parseFloat(record['Temp']) : null,

          // Ventilación
          ventMode: record['FiO₂'] ? 'VC' : null, // Asumir modo si hay datos
          fio2: record['FiO₂'] ? parseFloat(record['FiO₂']) : null,
          tidalVolume: record['Vt'] ? parseInt(record['Vt']) : null,
          peep: record['PEEP'] ? parseInt(record['PEEP']) : null,

          // Fármacos (convertir a boolean)
          noradrenaline: record.Noradrenalina === 'X' || record.Noradrenalina === '1',
          dobutamine: record.Dobutamina === 'X' || record.Dobutamina === '1',
        };

        console.log(`[${i}/${lines.length - 1}] Importando: ${phase} - ${record.Hora}`);

        // Intentar crear registro
        await prisma.intraopRecord.create({
          data: intraopData
        });

        successCount++;
        console.log(`  ✅ Registro creado exitosamente`);

      } catch (error) {
        errors.push({
          line: i + 1,
          record: record,
          error: error.message
        });
        console.log(`  ❌ Error: ${error.message}`);
      }
    }

    // Intentar crear registros de fluidos para diuresis y sangrado
    console.log('\n📊 Importando datos de fluidos...\n');

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(',').map(v => v.replace(/"/g, '').trim());

      const record = {};
      headers.forEach((header, index) => {
        record[header] = values[index];
      });

      // Solo crear registro de fluidos si hay datos
      if (record.Diuresis || record.Sangrado || record.GR || record.PFC || record.Plaquetas) {
        try {
          const phase = phaseMapping[record.Fase];
          const timestamp = parseTime(surgeryDate, record.Hora);

          const fluidsData = {
            caseId,
            phase,
            timestamp: new Date(timestamp),

            // Pérdidas
            urine: record.Diuresis ? parseInt(record.Diuresis) : 0,
            suction: record.Sangrado ? parseInt(record.Sangrado) : 0,

            // Hemoderivados
            redBloodCells: record.GR ? parseInt(record.GR) : 0,
            plasma: record.PFC ? parseInt(record.PFC) : 0,
            platelets: record.Plaquetas ? parseInt(record.Plaquetas) : 0,
          };

          await prisma.fluidsAndBlood.create({
            data: fluidsData
          });

          console.log(`  ✅ Fluidos: ${phase} - ${record.Hora}`);
        } catch (error) {
          warnings.push({
            line: i + 1,
            type: 'fluids',
            error: error.message
          });
          console.log(`  ⚠️  Fluidos: ${error.message}`);
        }
      }
    }

    // Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE IMPORTACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Registros importados exitosamente: ${successCount}`);
    console.log(`❌ Errores: ${errors.length}`);
    console.log(`⚠️  Advertencias: ${warnings.length}`);

    if (errors.length > 0) {
      console.log('\n❌ ERRORES DETALLADOS:');
      errors.forEach((err, idx) => {
        console.log(`\n${idx + 1}. Línea ${err.line}:`);
        console.log(`   Fase: ${err.record.Fase}, Hora: ${err.record.Hora}`);
        console.log(`   Error: ${err.error}`);
      });
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  ADVERTENCIAS:');
      warnings.forEach((warn, idx) => {
        console.log(`${idx + 1}. Línea ${warn.line} (${warn.type}): ${warn.error}`);
      });
    }

    console.log('\n✅ Importación completada\n');

  } catch (error) {
    console.error('\n❌ Error fatal en importación:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
importHistoricalData()
  .catch(console.error);
