const XLSX = require("xlsx");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const path = "/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx";
  const workbook = XLSX.readFile(path);
  const sheet = workbook.Sheets["DatosTrasplante"];
  const excelData = XLSX.utils.sheet_to_json(sheet);

  const dbCases = await prisma.transplantCase.findMany({
    select: {
      id: true,
      patientId: true,
      startAt: true,
      patient: { select: { name: true } }
    }
  });

  // Crear set de fechas en BD
  const dbDates = new Set();
  dbCases.forEach(c => {
    if (c.startAt) {
      const d = new Date(c.startAt);
      dbDates.add(d.toISOString().split("T")[0]);
    }
  });

  console.log("=== TRASPLANTES EN EXCEL NO ENCONTRADOS EN BD ===\n");

  let missing = [];
  excelData.forEach((row, idx) => {
    const dateVal = row["FechaHoraInicio"];
    let dateStr = null;

    if (typeof dateVal === "number") {
      const date = new Date((dateVal - 25569) * 86400 * 1000);
      dateStr = date.toISOString().split("T")[0];
    } else if (dateVal) {
      const d = new Date(dateVal);
      if (d.getTime()) dateStr = d.toISOString().split("T")[0];
    }

    if (!dateStr) {
      missing.push({ row: idx + 2, fecha: "SIN FECHA", raw: String(dateVal), hepatoRenal: row["HepatoRenal"], procedencia: row["Procedencia"] });
    } else if (!dbDates.has(dateStr)) {
      missing.push({ row: idx + 2, fecha: dateStr, hepatoRenal: row["HepatoRenal"], procedencia: row["Procedencia"] });
    }
  });

  missing.forEach(m => {
    console.log(`Fila Excel ${m.row}: ${m.fecha} | HepatoRenal: ${m.hepatoRenal || "-"} | Procedencia: ${m.procedencia || "-"}`);
  });

  console.log("\nTotal faltantes:", missing.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
