// tools/etl/sheetsToPg.js - Pipeline ETL idempotente Excel → PostgreSQL
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const {
  normalizeCI,
  parseDate,
  siNoToBoolean,
  parseTeamMember,
  findSimilarClinician,
  safeInt,
  safeFloat,
  emptyToNull,
} = require('./helpers');

const prisma = new PrismaClient();

// Configuración
const EXCEL_PATH = path.join(__dirname, '../../data/raw/Tablas Sistema Registro.xlsx');
const CLINICIANS_MAP_PATH = path.join(__dirname, '../../docs/clinicians-map.csv');
const LOG_DIR = path.join(__dirname, '../../data/logs');

// Stats globales
const stats = {
  clinicians: { total: 0, inserted: 0, skipped: 0 },
  patients: { total: 0, inserted: 0, skipped: 0 },
  cases: { total: 0, inserted: 0, skipped: 0 },
  errors: [],
};

/**
 * Cargar mapa manual de clínicos (si existe)
 */
function loadCliniciansMap() {
  if (!fs.existsSync(CLINICIANS_MAP_PATH)) {
    return {};
  }

  const content = fs.readFileSync(CLINICIANS_MAP_PATH, 'utf-8');
  const lines = content.split('\n').slice(1); // Skip header
  const map = {};

  lines.forEach((line) => {
    const [nameVariant, canonicalCP] = line.split(',').map((s) => s.trim());
    if (nameVariant && canonicalCP) {
      map[nameVariant.toLowerCase()] = parseInt(canonicalCP, 10);
    }
  });

  return map;
}

/**
 * Procesar hoja Equipo → Clinician
 */
async function processEquipo(rows, cliniciansMap) {
  console.log('\\n[Equipo] Procesando clínicos...');

  const seenCPs = new Set();

  for (const row of rows) {
    stats.clinicians.total++;

    try {
      const cp = safeInt(row.CP);
      const name = emptyToNull(row.Nombre);

      if (!cp || !name) {
        stats.errors.push({ sheet: 'Equipo', row: stats.clinicians.total, error: 'CP o Nombre vacío' });
        stats.clinicians.skipped++;
        continue;
      }

      // Verificar duplicado en este batch
      if (seenCPs.has(cp)) {
        stats.clinicians.skipped++;
        continue;
      }
      seenCPs.add(cp);

      // Mapear nombre a CP canónico
      const canonicalCP = cliniciansMap[name.toLowerCase()] || cp;

      // Idempotencia: upsert
      await prisma.clinician.upsert({
        where: { id: canonicalCP },
        update: {
          name,
          specialty: emptyToNull(row.Especialidad),
          email: emptyToNull(row.email),
          phone: emptyToNull(row.Telefono),
        },
        create: {
          id: canonicalCP,
          name,
          specialty: emptyToNull(row.Especialidad),
          email: emptyToNull(row.email) || `clinician${canonicalCP}@placeholder.com`,
          phone: emptyToNull(row.Telefono),
        },
      });

      stats.clinicians.inserted++;
    } catch (error) {
      stats.errors.push({
        sheet: 'Equipo',
        row: stats.clinicians.total,
        error: error.message,
      });
      stats.clinicians.skipped++;
    }
  }

  console.log(`  ✓ Insertados: ${stats.clinicians.inserted}, Omitidos: ${stats.clinicians.skipped}`);
}

/**
 * Procesar hoja DatosPaciente → Patient
 */
async function processDatosPaciente(rows) {
  console.log('\\n[DatosPaciente] Procesando pacientes...');

  const seenCIs = new Set();

  for (const row of rows) {
    stats.patients.total++;

    try {
      const ci = normalizeCI(row.CI);
      const ciRaw = emptyToNull(row.CI);

      if (!ci) {
        stats.errors.push({ sheet: 'DatosPaciente', row: stats.patients.total, error: 'CI inválido' });
        stats.patients.skipped++;
        continue;
      }

      // Verificar duplicado
      if (seenCIs.has(ci)) {
        stats.patients.skipped++;
        continue;
      }
      seenCIs.add(ci);

      // Idempotencia: upsert
      await prisma.patient.upsert({
        where: { id: ci },
        update: {
          ciRaw,
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
        },
        create: {
          id: ci,
          ciRaw,
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
        },
      });

      stats.patients.inserted++;
    } catch (error) {
      stats.errors.push({
        sheet: 'DatosPaciente',
        row: stats.patients.total,
        error: error.message,
        ci: row.CI,
      });
      stats.patients.skipped++;
    }
  }

  console.log(`  ✓ Insertados: ${stats.patients.inserted}, Omitidos: ${stats.patients.skipped}`);
}

/**
 * Procesar hoja DatosTrasplante → TransplantCase
 */
async function processDatosTrasplante(rows) {
  console.log('\\n[DatosTrasplante] Procesando casos de trasplante...');

  for (const row of rows) {
    stats.cases.total++;

    try {
      const ci = normalizeCI(row.CI);

      if (!ci) {
        stats.errors.push({ sheet: 'DatosTrasplante', row: stats.cases.total, error: 'CI inválido' });
        stats.cases.skipped++;
        continue;
      }

      // Verificar que el paciente existe
      const patient = await prisma.patient.findUnique({ where: { id: ci } });
      if (!patient) {
        stats.errors.push({ sheet: 'DatosTrasplante', row: stats.cases.total, error: `Paciente ${ci} no existe` });
        stats.cases.skipped++;
        continue;
      }

      const startAt = parseDate(row.FechaHoraInicio);

      // Idempotencia: buscar caso existente por patientId + startAt
      const existing = startAt
        ? await prisma.transplantCase.findFirst({
            where: {
              patientId: ci,
              startAt,
            },
          })
        : null;

      if (existing) {
        // Actualizar
        await prisma.transplantCase.update({
          where: { id: existing.id },
          data: {
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
          },
        });
      } else {
        // Crear
        await prisma.transplantCase.create({
          data: {
            patientId: ci,
            startAt,
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
          },
        });
      }

      stats.cases.inserted++;
    } catch (error) {
      stats.errors.push({
        sheet: 'DatosTrasplante',
        row: stats.cases.total,
        error: error.message,
        ci: row.CI,
      });
      stats.cases.skipped++;
    }
  }

  console.log(`  ✓ Insertados: ${stats.cases.inserted}, Omitidos: ${stats.cases.skipped}`);
}

/**
 * Procesar todas las hojas
 */
async function runETL(mode = 'full') {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  ETL: Excel → PostgreSQL - Sistema Registro TxH          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`\\nModo: ${mode}`);
  console.log(`Excel: ${EXCEL_PATH}`);

  // Verificar que existe el Excel
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`\\n✗ Error: No se encontró el archivo ${EXCEL_PATH}`);
    console.error('  Por favor, coloca el archivo "Tablas Sistema Registro.xlsx" en data/raw/\\n');
    process.exit(1);
  }

  // Leer Excel
  console.log('\\nLeyendo archivo Excel...');
  const workbook = XLSX.readFile(EXCEL_PATH);

  // Cargar mapa de clínicos
  const cliniciansMap = loadCliniciansMap();

  try {
    // 1. Equipo → Clinician
    if (workbook.SheetNames.includes('Equipo')) {
      const equipoSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Equipo']);
      await processEquipo(equipoSheet, cliniciansMap);
    }

    // 2. DatosPaciente → Patient
    if (workbook.SheetNames.includes('DatosPaciente')) {
      const pacientesSheet = XLSX.utils.sheet_to_json(workbook.Sheets['DatosPaciente']);
      await processDatosPaciente(pacientesSheet);
    }

    // 3. DatosTrasplante → TransplantCase
    if (workbook.SheetNames.includes('DatosTrasplante')) {
      const casesSheet = XLSX.utils.sheet_to_json(workbook.Sheets['DatosTrasplante']);
      await processDatosTrasplante(casesSheet);
    }

    // TODO: Agregar procesamiento de otras hojas (Preoperatorio, Intraop*, PostOp, Mortalidad)

    // Generar reporte
    console.log('\\n═══════════════════════════════════════════════════════════');
    console.log('RESUMEN ETL');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Clínicos:  ${stats.clinicians.inserted}/${stats.clinicians.total} insertados`);
    console.log(`Pacientes: ${stats.patients.inserted}/${stats.patients.total} insertados`);
    console.log(`Casos:     ${stats.cases.inserted}/${stats.cases.total} insertados`);
    console.log(`Errores:   ${stats.errors.length}`);

    // Guardar log de errores
    if (stats.errors.length > 0) {
      const timestamp = new Date().toISOString().split('T')[0];
      const logPath = path.join(LOG_DIR, `etl-errors-${timestamp}.json`);

      if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
      }

      fs.writeFileSync(logPath, JSON.stringify(stats.errors, null, 2));
      console.log(`\\n⚠ Log de errores guardado en: ${logPath}`);
    }

    console.log('\\n✓ ETL completado exitosamente\\n');
  } catch (error) {
    console.error('\\n✗ Error fatal en ETL:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
const mode = process.argv.find((arg) => arg.startsWith('--mode='))?.split('=')[1] || 'full';
runETL(mode).catch(console.error);
