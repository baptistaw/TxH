const XLSX = require("xlsx");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Filas a importar (0-indexed en el array, +2 para Excel)
const ROWS_TO_IMPORT = [
  284, // 2025-11-16 - ALTA
  99,  // 2011-09-01
  100, // 2011-07-23
  101, // 2011-07-08
  103, // 2011-06-09
  106, // 2011-04-23
  108, // 2011-03-16
  137, // 2011-03-21 (Retrasplante)
  147, // 2011-06-02 (HepatoRenal)
  114, // 2010-06-17
  115, // 2010-05-08
  123, // 2009-09-01
  2,   // 2011-09-18 (sin CI)
];

function parseExcelDate(val) {
  if (!val) return null;
  if (typeof val === "number") {
    return new Date((val - 25569) * 86400 * 1000);
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeCI(ci) {
  if (!ci) return null;
  return String(ci).replace(/\D/g, '').trim();
}

async function main() {
  const path = "/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx";
  const workbook = XLSX.readFile(path);
  const txData = XLSX.utils.sheet_to_json(workbook.Sheets["DatosTrasplante"]);
  const pxData = XLSX.utils.sheet_to_json(workbook.Sheets["DatosPaciente"]);

  // Crear mapa de pacientes por CI
  const pxByCI = new Map();
  pxData.forEach(p => {
    const ci = normalizeCI(p["CI"]);
    if (ci) pxByCI.set(ci, p);
  });

  console.log("=== IMPORTANDO TRASPLANTES FALTANTES ===\n");

  let imported = 0;
  let errors = [];

  for (const excelRow of ROWS_TO_IMPORT) {
    const idx = excelRow - 2; // Convertir fila Excel a índice array
    const row = txData[idx];

    if (!row) {
      errors.push(`Fila ${excelRow}: No encontrada en Excel`);
      continue;
    }

    const startAt = parseExcelDate(row["FechaHoraInicio"]);
    const endAt = parseExcelDate(row["FechaHoraFin"]);
    const ci = normalizeCI(row["CI"]);

    console.log(`\nProcesando fila ${excelRow}: ${startAt?.toISOString().split('T')[0] || 'SIN FECHA'} | CI: ${ci || 'N/A'}`);

    if (!startAt) {
      errors.push(`Fila ${excelRow}: Sin fecha de inicio`);
      continue;
    }

    // Buscar o crear paciente
    let patient = null;
    if (ci) {
      patient = await prisma.patient.findUnique({ where: { id: ci } });

      if (!patient) {
        // Buscar datos del paciente en DatosPaciente
        const pxInfo = pxByCI.get(ci);

        // Crear paciente mínimo
        patient = await prisma.patient.create({
          data: {
            id: ci,
            ciRaw: ci,
            name: pxInfo?.["Nombre"] || `Paciente ${ci}`,
            sex: pxInfo?.["Sexo"] === "M" ? "M" : pxInfo?.["Sexo"] === "F" ? "F" : null,
            transplanted: true,
            dataSource: "APPSHEET",
          }
        });
        console.log(`  -> Paciente creado: ${patient.name}`);
      } else {
        // Actualizar como trasplantado si no lo está
        if (!patient.transplanted) {
          await prisma.patient.update({
            where: { id: ci },
            data: { transplanted: true }
          });
        }
        console.log(`  -> Paciente existente: ${patient.name}`);
      }
    } else {
      errors.push(`Fila ${excelRow}: Sin CI, no se puede vincular paciente`);
      continue;
    }

    // Verificar si ya existe el caso
    const existingCase = await prisma.transplantCase.findFirst({
      where: {
        patientId: ci,
        startAt: {
          gte: new Date(startAt.getTime() - 86400000), // -1 día
          lte: new Date(startAt.getTime() + 86400000), // +1 día
        }
      }
    });

    if (existingCase) {
      console.log(`  -> Ya existe caso para esta fecha, saltando`);
      continue;
    }

    // Calcular duración
    let duration = null;
    if (startAt && endAt) {
      duration = Math.round((endAt - startAt) / 60000); // en minutos
      if (duration < 0 || duration > 1440) duration = null; // Validar
    }

    // Crear TransplantCase
    const isRetransplant = row["Retrasplante"] === "SI";
    const isHepatoRenal = row["HepatoRenal"] === "SI";

    const newCase = await prisma.transplantCase.create({
      data: {
        patientId: ci,
        startAt: startAt,
        endAt: endAt,
        duration: duration,
        isRetransplant: isRetransplant,
        isHepatoRenal: isHepatoRenal,
        coldIschemiaTime: row["TIsqFria"] ? parseInt(row["TIsqFria"]) : null,
        warmIschemiaTime: row["TisqCaliente"] ? parseInt(row["TisqCaliente"]) : null,
        optimalDonor: row["DonanteOptimo"] === "SI",
        provenance: row["Procedencia"] || null,
        dataSource: "APPSHEET",
      }
    });

    console.log(`  -> Caso creado: ${newCase.id} | Retrasplante: ${isRetransplant} | HepatoRenal: ${isHepatoRenal}`);
    imported++;
  }

  console.log("\n" + "=".repeat(50));
  console.log(`\nRESUMEN:`);
  console.log(`  Importados: ${imported}`);
  console.log(`  Errores: ${errors.length}`);

  if (errors.length > 0) {
    console.log("\nERRORES:");
    errors.forEach(e => console.log(`  - ${e}`));
  }

  // Verificar total final
  const totalCases = await prisma.transplantCase.count();
  console.log(`\nTotal trasplantes en BD: ${totalCases}`);
}

main()
  .catch(e => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
