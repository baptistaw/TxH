const XLSX = require("xlsx");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const path = "/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx";
  const workbook = XLSX.readFile(path);

  // Cargar DatosTrasplante
  const txSheet = workbook.Sheets["DatosTrasplante"];
  const txData = XLSX.utils.sheet_to_json(txSheet);

  // Cargar DatosPaciente para obtener CI
  const pxSheet = workbook.Sheets["DatosPaciente"];
  const pxData = XLSX.utils.sheet_to_json(pxSheet);

  // Crear mapa de pacientes por índice (asumiendo orden relacionado)
  console.log("Excel DatosTrasplante:", txData.length, "registros");
  console.log("Excel DatosPaciente:", pxData.length, "registros");

  // Ver columnas de DatosTrasplante
  console.log("\nColumnas DatosTrasplante:", Object.keys(txData[0]).join(", "));

  // Ver si hay algún identificador de paciente en DatosTrasplante
  const cols = Object.keys(txData[0]);
  const idCol = cols.find(c => c.toLowerCase().includes('ci') || c.toLowerCase().includes('paciente') || c.toLowerCase().includes('id'));
  console.log("Columna ID encontrada:", idCol || "Ninguna");

  // Cargar casos de BD
  const dbCases = await prisma.transplantCase.findMany({
    include: { patient: { select: { id: true, name: true } } }
  });

  console.log("\nBD TransplantCase:", dbCases.length, "registros");

  // Buscar el trasplante del 2025-11-16 específicamente
  console.log("\n=== TRASPLANTE 2025-11-16 ===");
  const nov16 = txData.find(row => {
    const dateVal = row["FechaHoraInicio"];
    if (typeof dateVal === "number") {
      const date = new Date((dateVal - 25569) * 86400 * 1000);
      return date.toISOString().startsWith("2025-11-16");
    }
    return false;
  });
  console.log("Registro Excel:", JSON.stringify(nov16, null, 2));

  // Ver si hay trasplantes en noviembre 2025 en la BD
  const nov2025 = dbCases.filter(c => {
    if (!c.startAt) return false;
    const d = new Date(c.startAt);
    return d.getFullYear() === 2025 && d.getMonth() === 10; // Nov = 10
  });
  console.log("\nTrasplantes Nov 2025 en BD:", nov2025.length);
  nov2025.forEach(c => {
    console.log(`  ${c.startAt.toISOString().split('T')[0]} - ${c.patient?.name} (${c.patient?.id})`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
