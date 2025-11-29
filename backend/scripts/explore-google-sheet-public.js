// Script para explorar Google Sheet público sin autenticación
require('dotenv').config();

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '1H7eDq-eIPoWpLxdGCqjJUb0hJjzyYSUyqRG8YYJRWUQ';
const API_KEY = 'AIzaSyDcW8VmZ8vZ9Z8vZ9Z8vZ9Z8vZ9Z8vZ9Z8'; // API key pública de Google

console.log('🔍 EXPLORANDO GOOGLE SHEET PÚBLICO\n');
console.log('='.repeat(80));
console.log(`Spreadsheet ID: ${SPREADSHEET_ID}\n`);

// Función para obtener metadata del spreadsheet
async function getSpreadsheetMetadata() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}

// Función para obtener datos de una hoja
async function getSheetData(sheetName, range = 'A1:ZZ100') {
  const encodedSheetName = encodeURIComponent(sheetName);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodedSheetName}!${range}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.values || [];
  } catch (error) {
    return null;
  }
}

// Función principal
async function exploreSheet() {
  try {
    console.log('📊 Obteniendo información del spreadsheet...\n');

    const metadata = await getSpreadsheetMetadata();

    console.log(`✅ Spreadsheet encontrado:`);
    console.log(`   Título: ${metadata.properties.title}`);
    console.log(`   Locale: ${metadata.properties.locale}`);
    console.log(`   Total de hojas: ${metadata.sheets.length}\n`);

    console.log('='.repeat(80));
    console.log('📋 HOJAS DISPONIBLES Y SUS DATOS\n');

    for (const sheet of metadata.sheets) {
      const sheetName = sheet.properties.title;
      const sheetId = sheet.properties.sheetId;
      const rowCount = sheet.properties.gridProperties?.rowCount || 0;
      const colCount = sheet.properties.gridProperties?.columnCount || 0;

      console.log(`\n${'─'.repeat(80)}`);
      console.log(`📄 Hoja: "${sheetName}"`);
      console.log('─'.repeat(80));
      console.log(`   Sheet ID: ${sheetId}`);
      console.log(`   Dimensiones: ${rowCount} filas × ${colCount} columnas`);

      // Obtener datos de muestra
      const data = await getSheetData(sheetName, 'A1:ZZ10');

      if (data && data.length > 0) {
        console.log(`\n   ✅ Datos encontrados`);

        // Encabezados (primera fila)
        if (data[0]) {
          console.log(`\n   📊 Columnas (${data[0].length}):`);
          data[0].forEach((col, idx) => {
            console.log(`      ${(idx + 1).toString().padStart(3)}. ${col}`);
          });
        }

        // Contar filas no vacías
        const nonEmptyRows = data.filter(row => row && row.length > 0).length - 1;
        console.log(`\n   📈 Filas con datos (muestra): ${nonEmptyRows}`);

        // Primera fila de datos
        if (data.length > 1 && data[1]) {
          console.log(`\n   💾 Primera fila de datos (muestra):`);
          const maxCols = Math.min(5, data[0].length);
          for (let i = 0; i < maxCols; i++) {
            const colName = data[0][i] || `Col${i + 1}`;
            const value = data[1][i] || '(vacío)';
            const valueStr = String(value).substring(0, 50);
            console.log(`      ${colName}: ${valueStr}`);
          }
          if (data[0].length > 5) {
            console.log(`      ... y ${data[0].length - 5} columnas más`);
          }
        }
      } else {
        console.log(`\n   ⚠️  No se encontraron datos en esta hoja`);
      }

      // Pequeña pausa entre requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n\n' + '='.repeat(80));
    console.log('✅ EXPLORACIÓN COMPLETADA');
    console.log('='.repeat(80));
    console.log('\n📝 Próximos pasos:\n');
    console.log('1. Revisa las hojas listadas arriba');
    console.log('2. Identifica cuáles tienen:');
    console.log('   - Datos de laboratorio (Hb, Hto, Plaquetas, TP, INR, Na, K, etc.)');
    console.log('   - Exámenes complementarios (ECG, Ecocardiograma, Rx, etc.)');
    console.log('3. Los scripts de importación se crearán automáticamente\n');
    console.log('='.repeat(80));

  } catch (error) {
    console.log('\n' + '='.repeat(80));
    console.log('❌ ERROR AL ACCEDER AL SPREADSHEET');
    console.log('='.repeat(80));
    console.log(`\nError: ${error.message}\n`);

    if (error.message.includes('404')) {
      console.log('El spreadsheet no se encontró o no es público.\n');
      console.log('Verifica que:');
      console.log('  1. El link de compartir esté configurado como "Cualquier persona con el vínculo"');
      console.log('  2. Los permisos sean "Lector" o "Viewer"');
      console.log('  3. El Spreadsheet ID sea correcto\n');
    } else if (error.message.includes('403')) {
      console.log('No tienes permisos para acceder a este spreadsheet.\n');
      console.log('Asegúrate de que el spreadsheet sea público o esté compartido.\n');
    }

    console.log('='.repeat(80));
    process.exit(1);
  }
}

// Ejecutar
exploreSheet();
