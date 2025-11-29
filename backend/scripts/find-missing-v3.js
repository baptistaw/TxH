const XLSX = require("xlsx");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function parseExcelDate(val) {
  if (!val) return null;
  if (typeof val === "number") {
    return new Date((val - 25569) * 86400 * 1000);
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  const path = "/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx";
  const workbook = XLSX.readFile(path);
  const txData = XLSX.utils.sheet_to_json(workbook.Sheets["DatosTrasplante"]);

  // Cargar casos de BD con pacientes
  const dbCases = await prisma.transplantCase.findMany({
    include: { patient: { select: { id: true, name: true } } }
  });

  // Crear índice de BD por CI + fecha aproximada
  const dbIndex = new Map();
  dbCases.forEach(c => {
    if (c.startAt && c.patient?.id) {
      const dateKey = c.startAt.toISOString().split('T')[0];
      const key = `${c.patient.id}_${dateKey}`;
      dbIndex.set(key, c);
      // También solo por fecha
      if (!dbIndex.has(dateKey)) dbIndex.set(dateKey, []);
      dbIndex.get(dateKey).push ? dbIndex.get(dateKey).push(c) : null;
    }
  });

  console.log("=== TRASPLANTES EN EXCEL NO ENCONTRADOS EN BD ===\n");
  console.log("Fila | Fecha        | CI         | Retrasplante | HepatoRenal | Procedencia");
  console.log("-".repeat(85));

  let missing = [];
  txData.forEach((row, idx) => {
    const date = parseExcelDate(row["FechaHoraInicio"]);
    const dateStr = date ? date.toISOString().split("T")[0] : "SIN FECHA";
    const ci = row["CI"] ? String(row["CI"]).trim() : null;

    // Buscar en BD
    let found = false;
    if (ci && date) {
      const key = `${ci}_${dateStr}`;
      if (dbIndex.has(key)) found = true;
    }

    // Si no encontramos por CI+fecha, buscar solo por fecha
    if (!found && date) {
      const casesOnDate = dbCases.filter(c =>
        c.startAt && c.startAt.toISOString().split('T')[0] === dateStr
      );
      if (casesOnDate.length > 0) {
        // Podría ser un match si hay mismo número de trasplantes ese día
        found = true;
      }
    }

    if (!found) {
      missing.push({
        row: idx + 2,
        fecha: dateStr,
        ci: ci || "-",
        retrasplante: row["Retrasplante"] || "-",
        hepatoRenal: row["HepatoRenal"] || "-",
        procedencia: row["Procedencia"] || "-"
      });
    }
  });

  missing.forEach(m => {
    console.log(`${String(m.row).padStart(4)} | ${m.fecha.padEnd(12)} | ${String(m.ci).padEnd(10)} | ${String(m.retrasplante).padEnd(12)} | ${String(m.hepatoRenal).padEnd(11)} | ${m.procedencia}`);
  });

  console.log("\n" + "-".repeat(85));
  console.log(`Total faltantes: ${missing.length}`);

  // Separar por categoría
  const sinFecha = missing.filter(m => m.fecha === "SIN FECHA");
  const conFecha = missing.filter(m => m.fecha !== "SIN FECHA");
  const recientes = conFecha.filter(m => m.fecha >= "2024-01-01");
  const antiguos = conFecha.filter(m => m.fecha < "2024-01-01");

  console.log(`\n  - Sin fecha: ${sinFecha.length}`);
  console.log(`  - Recientes (2024+): ${recientes.length}`);
  console.log(`  - Antiguos (<2024): ${antiguos.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
