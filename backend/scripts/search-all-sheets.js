const ExcelJS = require('exceljs');

const EXCEL_PATH = process.env.EXCEL_PATH || '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

async function searchAll() {
  console.log('\n=== BUSCANDO CI 20193126 y 35702396 EN TODAS LAS HOJAS ===\n');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);

  workbook.eachSheet((sheet, id) => {
    let found = false;

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      // Buscar en todas las columnas
      for (let colNum = 1; colNum <= row.cellCount; colNum++) {
        const cellValue = row.getCell(colNum).value;

        if (cellValue !== null && cellValue !== undefined) {
          const cellStr = cellValue.toString();

          if (cellStr.includes('20193126') || cellStr.includes('35702396')) {
            if (!found) {
              console.log(`\n📄 HOJA: ${sheet.name}`);
              found = true;
            }

            // Parsear la fecha si está en formato compuesto
            if (cellStr.includes(':') && cellStr.includes('2024')) {
              const parts = cellStr.split(':');
              const ci = parts[0].trim();

              console.log(`  Fila ${rowNumber}, Col ${colNum}: CI=${ci}`);
              console.log(`    Valor completo: ${cellStr.substring(0, 100)}`);

              // Intentar parsear fecha
              const dateMatch = cellStr.match(/(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2})/);
              if (dateMatch) {
                console.log(`    Fecha encontrada: ${dateMatch[1]}`);
              }
            } else {
              console.log(`  Fila ${rowNumber}, Col ${colNum}: ${cellStr.substring(0, 50)}`);
            }
          }
        }
      }
    });
  });
}

searchAll().catch(console.error);
