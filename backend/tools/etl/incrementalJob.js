// tools/etl/incrementalJob.js - ETL incremental para doble corrida
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const {
  normalizeCI,
  parseDate,
  siNoToBoolean,
  safeInt,
  safeFloat,
  emptyToNull,
} = require('./helpers');
const { needsUpdate } = require('./changeDetector');

const prisma = new PrismaClient();

// Configuración
const EXCEL_PATH = path.join(__dirname, '../../data/raw/Tablas Sistema Registro.xlsx');
const LOG_DIR = path.join(__dirname, '../../data/logs');

// Stats
const stats = {
  patients: { checked: 0, updated: 0, created: 0, skipped: 0 },
  cases: { checked: 0, updated: 0, created: 0, skipped: 0 },
  preops: { checked: 0, updated: 0, created: 0, skipped: 0 },
  postops: { checked: 0, updated: 0, created: 0, skipped: 0 },
  errors: [],
  startTime: new Date(),
  endTime: null,
};

/**
 * Procesar pacientes incrementalmente
 */
async function processPatientIncremental(row) {
  stats.patients.checked++;

  try {
    const ci = normalizeCI(row.CI);
    if (!ci) {
      stats.patients.skipped++;
      return;
    }

    // Verificar si necesita actualización
    const { needsUpdate: shouldUpdate, isNew } = await needsUpdate(prisma, 'DatosPaciente', row);

    if (!shouldUpdate) {
      stats.patients.skipped++;
      return;
    }

    const data = {
      ciRaw: emptyToNull(row.CI),
      name: emptyToNull(row.Nombre) || 'Sin nombre',
      fnr: emptyToNull(row.FNR),
      birthDate: parseDate(row.FNac),
      sex: emptyToNull(row.Sexo),
      provider: emptyToNull(row.Prestador),
      height: safeFloat(row.Talla),
      weight: safeFloat(row.Peso),
      bloodGroup: emptyToNull(row.GrupoS),
      admissionDate: parseDate(row.FechaIngresoProg),
      transplanted: siNoToBoolean(row.Trasplantado) || false,
      observations: emptyToNull(row.Observaciones),
    };

    if (isNew) {
      await prisma.patient.create({ data: { id: ci, ...data } });
      stats.patients.created++;
    } else {
      await prisma.patient.update({ where: { id: ci }, data });
      stats.patients.updated++;
    }
  } catch (error) {
    stats.errors.push({
      sheet: 'DatosPaciente',
      row: stats.patients.checked,
      error: error.message,
      ci: row.CI,
    });
    stats.patients.skipped++;
  }
}

/**
 * Procesar casos incrementalmente
 */
async function processCaseIncremental(row) {
  stats.cases.checked++;

  try {
    const ci = normalizeCI(row.CI);
    if (!ci) {
      stats.cases.skipped++;
      return;
    }

    // Verificar paciente existe
    const patient = await prisma.patient.findUnique({ where: { id: ci } });
    if (!patient) {
      stats.errors.push({
        sheet: 'DatosTrasplante',
        row: stats.cases.checked,
        error: `Paciente ${ci} no existe`,
      });
      stats.cases.skipped++;
      return;
    }

    // Verificar si necesita actualización
    const { needsUpdate: shouldUpdate, isNew, existing } = await needsUpdate(
      prisma,
      'DatosTrasplante',
      row
    );

    if (!shouldUpdate) {
      stats.cases.skipped++;
      return;
    }

    const data = {
      endAt: parseDate(row.FechaHoraFin),
      duration: safeInt(row.Duracion),
      isRetransplant: siNoToBoolean(row.Retrasplante) || false,
      isHepatoRenal: siNoToBoolean(row.HepatoRenal) || false,
      optimalDonor: siNoToBoolean(row.DonanteOptimo),
      provenance: emptyToNull(row.Procedencia),
      coldIschemiaTime: safeInt(row.TIsqFria),
      warmIschemiaTime: safeInt(row.TisqCaliente),
      icuTransferDate: parseDate(row.FechaTrasladoCTI),
      observations: emptyToNull(row.Observaciones),
    };

    if (isNew) {
      await prisma.transplantCase.create({
        data: {
          patientId: ci,
          startAt: parseDate(row.FechaHoraInicio),
          ...data,
        },
      });
      stats.cases.created++;
    } else {
      await prisma.transplantCase.update({
        where: { id: existing.id },
        data,
      });
      stats.cases.updated++;
    }
  } catch (error) {
    stats.errors.push({
      sheet: 'DatosTrasplante',
      row: stats.cases.checked,
      error: error.message,
      ci: row.CI,
    });
    stats.cases.skipped++;
  }
}

/**
 * Procesar preoperatorios incrementalmente
 */
async function processPreopIncremental(row) {
  stats.preops.checked++;

  try {
    const ci = normalizeCI(row.CI);
    const evalDate = parseDate(row.Fecha);

    if (!ci || !evalDate) {
      stats.preops.skipped++;
      return;
    }

    const { needsUpdate: shouldUpdate, isNew, existing } = await needsUpdate(
      prisma,
      'Preoperatorio',
      row
    );

    if (!shouldUpdate) {
      stats.preops.skipped++;
      return;
    }

    const data = {
      patientId: ci,
      evaluationDate: evalDate,
      meld: safeInt(row.MELD),
      meldNa: safeInt(row.MELDe),
      child: emptyToNull(row.Child),
      etiology1: emptyToNull(row.Etiologia1),
      etiology2: emptyToNull(row.Etiologia2),
      isFulminant: siNoToBoolean(row.Fulminante) || false,
      // ... más campos según necesidad
      observations: emptyToNull(row.ObsComorbilidades),
    };

    if (isNew) {
      await prisma.preopEvaluation.create({ data });
      stats.preops.created++;
    } else {
      await prisma.preopEvaluation.update({
        where: { id: existing.id },
        data,
      });
      stats.preops.updated++;
    }
  } catch (error) {
    stats.errors.push({
      sheet: 'Preoperatorio',
      row: stats.preops.checked,
      error: error.message,
      ci: row.CI,
    });
    stats.preops.skipped++;
  }
}

/**
 * Ejecutar ETL incremental
 */
async function runIncrementalETL() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  ETL INCREMENTAL - Sistema Registro TxH                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`\nInicio: ${stats.startTime.toISOString()}`);

  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`\n✗ Error: No se encontró ${EXCEL_PATH}`);
    process.exit(1);
  }

  console.log('Leyendo Excel...');
  const workbook = XLSX.readFile(EXCEL_PATH);

  try {
    // Procesar DatosPaciente
    if (workbook.SheetNames.includes('DatosPaciente')) {
      console.log('\n[DatosPaciente] Procesando cambios...');
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets['DatosPaciente']);

      for (const row of rows) {
        await processPatientIncremental(row);
      }

      console.log(`  Revisados: ${stats.patients.checked}`);
      console.log(`  Creados: ${stats.patients.created}`);
      console.log(`  Actualizados: ${stats.patients.updated}`);
      console.log(`  Sin cambios: ${stats.patients.skipped}`);
    }

    // Procesar DatosTrasplante
    if (workbook.SheetNames.includes('DatosTrasplante')) {
      console.log('\n[DatosTrasplante] Procesando cambios...');
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets['DatosTrasplante']);

      for (const row of rows) {
        await processCaseIncremental(row);
      }

      console.log(`  Revisados: ${stats.cases.checked}`);
      console.log(`  Creados: ${stats.cases.created}`);
      console.log(`  Actualizados: ${stats.cases.updated}`);
      console.log(`  Sin cambios: ${stats.cases.skipped}`);
    }

    // Procesar Preoperatorio
    if (workbook.SheetNames.includes('Preoperatorio')) {
      console.log('\n[Preoperatorio] Procesando cambios...');
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Preoperatorio']);

      for (const row of rows) {
        await processPreopIncremental(row);
      }

      console.log(`  Revisados: ${stats.preops.checked}`);
      console.log(`  Creados: ${stats.preops.created}`);
      console.log(`  Actualizados: ${stats.preops.updated}`);
      console.log(`  Sin cambios: ${stats.preops.skipped}`);
    }

    // Resumen final
    stats.endTime = new Date();
    const durationMs = stats.endTime - stats.startTime;
    const durationSec = (durationMs / 1000).toFixed(2);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('RESUMEN ETL INCREMENTAL');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Duración: ${durationSec}s`);
    console.log(
      `\nPacientes: ${stats.patients.created} nuevos, ${stats.patients.updated} actualizados, ${stats.patients.skipped} sin cambios`
    );
    console.log(
      `Casos: ${stats.cases.created} nuevos, ${stats.cases.updated} actualizados, ${stats.cases.skipped} sin cambios`
    );
    console.log(
      `Preops: ${stats.preops.created} nuevos, ${stats.preops.updated} actualizados, ${stats.preops.skipped} sin cambios`
    );
    console.log(`\nErrores: ${stats.errors.length}`);

    // Guardar log
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logPath = path.join(LOG_DIR, `etl-incremental-${timestamp}.json`);

    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    fs.writeFileSync(logPath, JSON.stringify({ stats, errors: stats.errors }, null, 2));
    console.log(`\nLog guardado en: ${logPath}`);

    console.log('\n✓ ETL incremental completado\n');
  } catch (error) {
    console.error('\n✗ Error fatal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Si se ejecuta directamente
if (require.main === module) {
  runIncrementalETL().catch(console.error);
}

module.exports = { runIncrementalETL };
