// scripts/migrate-to-normalized-structure.js
// Migrar datos históricos a la estructura normalizada

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// Normalizar código de etiología
function normalizeEtiologyCode(etiology) {
  if (!etiology) return null;

  const normalized = etiology.trim().toUpperCase();

  // Mapeo de variaciones comunes
  const mappings = {
    'COLANGCARCINOMA': 'COLANGIOCARCINOMA',
    'HEPATOCARCINOMA': 'HCC',
    'Hepatocarcinoma': 'HCC',
    'Hcc': 'HCC',
    'CRIPTOGENICA': 'CRIPTO',
    'Criptogenica': 'CRIPTO',
    'HEMOCROMATOSIS': 'HH',
    'Hemocromatosis': 'HH',
    'Idiopatica': 'CRIPTO',
    'Sin clara causa': 'CRIPTO',
  };

  return mappings[etiology] || normalized;
}

// Categorizar etiología
function categorizeEtiology(code) {
  const viral = ['HVB', 'HVC'];
  const autoinmune = ['HAI', 'CBP', 'CEP'];
  const metabolica = ['NASH', 'MAFLD', 'HH', 'HEMOCROMATOSIS', 'EW', 'HIPEROXALOSIS PRIMARIA'];
  const toxica = ['OH', 'DILI', 'TOXICA'];
  const vascular = ['BUDD CHIARI', 'CAVERNOMA PORTA'];
  const tumoral = ['HCC', 'COLANGIOCARCINOMA', 'HEMANGIOMA', 'METASTASIS HEPATICAS'];
  const congenita = ['Atresia biliar', 'PQHR', 'Enf. Caroli'];

  if (viral.some(v => code.includes(v))) return 'Viral';
  if (autoinmune.some(a => code.includes(a))) return 'Autoinmune';
  if (metabolica.some(m => code.includes(m))) return 'Metabólica';
  if (toxica.some(t => code.includes(t))) return 'Tóxica';
  if (vascular.some(v => code.includes(v))) return 'Vascular';
  if (tumoral.some(t => code.includes(t))) return 'Tumoral';
  if (congenita.some(c => code.includes(c))) return 'Congénita';

  return 'Otra';
}

async function migrateData() {
  console.log(`${colors.blue}
╔══════════════════════════════════════════════════════════════════╗
║        MIGRACIÓN A ESTRUCTURA NORMALIZADA                         ║
╚══════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  const migrationReport = {
    timestamp: new Date().toISOString(),
    etiologies: { created: 0, migrated: 0 },
    vascularLines: { created: 0 },
    catalogs: { created: 0 },
    errors: [],
  };

  try {
    // ================================================================
    // 1. CREAR CATÁLOGO DE ETIOLOGÍAS
    // ================================================================
    log(colors.cyan, '\n1. Creando catálogo de etiologías...\n');

    const preops = await prisma.preopEvaluation.findMany({
      select: { id: true, etiology1: true, etiology2: true }
    });

    const etiologyMap = new Map(); // code -> Etiology

    for (const preop of preops) {
      for (const et of [preop.etiology1, preop.etiology2]) {
        if (!et) continue;

        const code = normalizeEtiologyCode(et);
        if (!code) continue;

        if (!etiologyMap.has(code)) {
          etiologyMap.set(code, {
            code,
            name: et.trim(),
            category: categorizeEtiology(code)
          });
        }
      }
    }

    log(colors.yellow, `   Encontradas ${etiologyMap.size} etiologías únicas\n`);

    for (const [code, data] of etiologyMap) {
      try {
        const etiology = await prisma.etiology.upsert({
          where: { code },
          create: data,
          update: {},
        });
        log(colors.green, `   ✓ ${code} (${data.category})`);
        migrationReport.etiologies.created++;
      } catch (error) {
        log(colors.red, `   ✗ Error con ${code}: ${error.message}`);
        migrationReport.errors.push({ type: 'etiology', code, error: error.message });
      }
    }

    // ================================================================
    // 2. MIGRAR ETIOLOGÍAS DE EVALUACIONES PREOP
    // ================================================================
    log(colors.cyan, '\n\n2. Migrando etiologías de evaluaciones preop...\n');

    for (const preop of preops) {
      const etiologies = [];

      if (preop.etiology1) {
        const code = normalizeEtiologyCode(preop.etiology1);
        if (code) etiologies.push({ code, isPrimary: true, order: 0 });
      }

      if (preop.etiology2) {
        const code = normalizeEtiologyCode(preop.etiology2);
        if (code) etiologies.push({ code, isPrimary: false, order: 1 });
      }

      for (const et of etiologies) {
        try {
          const etiology = await prisma.etiology.findUnique({
            where: { code: et.code }
          });

          if (etiology) {
            await prisma.preopEtiology.upsert({
              where: {
                preopId_etiologyId: {
                  preopId: preop.id,
                  etiologyId: etiology.id
                }
              },
              create: {
                preopId: preop.id,
                etiologyId: etiology.id,
                isPrimary: et.isPrimary,
                order: et.order,
              },
              update: {},
            });
            migrationReport.etiologies.migrated++;
          }
        } catch (error) {
          migrationReport.errors.push({
            type: 'preop_etiology',
            preopId: preop.id,
            error: error.message
          });
        }
      }
    }

    log(colors.green, `   ✓ ${migrationReport.etiologies.migrated} relaciones creadas\n`);

    // ================================================================
    // 3. MIGRAR LÍNEAS VASCULARES
    // ================================================================
    log(colors.cyan, '3. Migrando líneas vasculares...\n');

    const linesMonitoring = await prisma.linesAndMonitoring.findMany({
      select: {
        id: true,
        cvc1: true,
        cvc2: true,
        cvc3: true,
        arterialLine1: true,
        arterialLine2: true,
      }
    });

    for (const lm of linesMonitoring) {
      // CVCs
      for (const [index, location] of [[1, lm.cvc1], [2, lm.cvc2], [3, lm.cvc3]]) {
        if (location && location.trim()) {
          try {
            await prisma.vascularLine.create({
              data: {
                linesMonId: lm.id,
                lineType: 'CVC',
                location: location.trim(),
              }
            });
            migrationReport.vascularLines.created++;
          } catch (error) {
            // Puede fallar si ya existe
          }
        }
      }

      // Líneas arteriales
      for (const [index, location] of [[1, lm.arterialLine1], [2, lm.arterialLine2]]) {
        if (location && location.trim()) {
          try {
            await prisma.vascularLine.create({
              data: {
                linesMonId: lm.id,
                lineType: 'ARTERIAL',
                location: location.trim(),
              }
            });
            migrationReport.vascularLines.created++;
          } catch (error) {
            // Puede fallar si ya existe
          }
        }
      }
    }

    log(colors.green, `   ✓ ${migrationReport.vascularLines.created} líneas vasculares migradas\n`);

    // ================================================================
    // 4. CREAR CATÁLOGOS ADICIONALES
    // ================================================================
    log(colors.cyan, '4. Creando catálogos adicionales...\n');

    // Grupos sanguíneos
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    for (const code of bloodGroups) {
      try {
        await prisma.bloodGroup.upsert({
          where: { code },
          create: { code },
          update: {},
        });
        migrationReport.catalogs.created++;
      } catch (error) {
        // Ignorar duplicados
      }
    }
    log(colors.green, `   ✓ ${bloodGroups.length} grupos sanguíneos`);

    // Locaciones (procedencias/destinos)
    const locations = [
      { code: 'DOMICILIO', name: 'Domicilio', type: 'provenance' },
      { code: 'CTI', name: 'CTI', type: 'both' },
      { code: 'SALA', name: 'Sala', type: 'both' },
      { code: 'BQ', name: 'Block Quirúrgico', type: 'destination' },
      { code: 'OTRO', name: 'Otro', type: 'both' },
    ];

    for (const loc of locations) {
      try {
        if (loc.type === 'both') {
          await prisma.location.upsert({
            where: { code: `${loc.code}_PROV` },
            create: { code: `${loc.code}_PROV`, name: loc.name, type: 'provenance' },
            update: {},
          });
          await prisma.location.upsert({
            where: { code: `${loc.code}_DEST` },
            create: { code: `${loc.code}_DEST`, name: loc.name, type: 'destination' },
            update: {},
          });
        } else {
          await prisma.location.upsert({
            where: { code: loc.code },
            create: { code: loc.code, name: loc.name, type: loc.type },
            update: {},
          });
        }
        migrationReport.catalogs.created++;
      } catch (error) {
        // Ignorar duplicados
      }
    }
    log(colors.green, `   ✓ Locaciones creadas`);

    // Posiciones
    const positions = [
      { code: 'DD', name: 'Decúbito Dorsal' },
      { code: 'DL', name: 'Decúbito Lateral' },
      { code: 'DV', name: 'Decúbito Ventral' },
      { code: 'FOWLER', name: 'Fowler' },
      { code: 'TRENDELENBURG', name: 'Trendelenburg' },
    ];

    for (const pos of positions) {
      try {
        await prisma.position.upsert({
          where: { code: pos.code },
          create: pos,
          update: {},
        });
        migrationReport.catalogs.created++;
      } catch (error) {
        // Ignorar duplicados
      }
    }
    log(colors.green, `   ✓ ${positions.length} posiciones quirúrgicas`);

    // Antibióticos comunes
    const antibiotics = [
      { code: 'UNASYM', name: 'Unasym' },
      { code: 'CEFTRIAXONA', name: 'Ceftriaxona' },
      { code: 'VANCOMICINA', name: 'Vancomicina' },
      { code: 'MEROPENEM', name: 'Meropenem' },
      { code: 'PIPERACILINA_TAZOBACTAM', name: 'Piperacilina/Tazobactam' },
    ];

    for (const atb of antibiotics) {
      try {
        await prisma.antibiotic.upsert({
          where: { code: atb.code },
          create: atb,
          update: {},
        });
        migrationReport.catalogs.created++;
      } catch (error) {
        // Ignorar duplicados
      }
    }
    log(colors.green, `   ✓ ${antibiotics.length} antibióticos\n`);

    // ================================================================
    // 5. GENERAR REPORTE
    // ================================================================
    log(colors.cyan, '5. Generando reporte de migración...\n');

    const reportPath = `./migration-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(migrationReport, null, 2));

    log(colors.blue, '═'.repeat(70));
    log(colors.green, '\n✓ Migración completada exitosamente\n');

    console.log('Resumen:');
    console.log(`  Etiologías creadas:        ${migrationReport.etiologies.created}`);
    console.log(`  Relaciones migradas:       ${migrationReport.etiologies.migrated}`);
    console.log(`  Líneas vasculares:         ${migrationReport.vascularLines.created}`);
    console.log(`  Catálogos adicionales:     ${migrationReport.catalogs.created}`);
    console.log(`  Errores:                   ${migrationReport.errors.length}\n`);

    if (migrationReport.errors.length > 0) {
      log(colors.yellow, `⚠ Revisa los errores en: ${reportPath}\n`);
    }

    log(colors.cyan, `Reporte completo guardado en: ${reportPath}\n`);

  } catch (error) {
    log(colors.red, `\n✗ Error fatal: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
migrateData();
