// Script para probar la conexión con Google Sheets API y explorar las hojas disponibles
require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH || './google-credentials.json';
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

console.log('🔌 TEST DE CONEXIÓN A GOOGLE SHEETS API\n');
console.log('='.repeat(80));

// Validar configuración
if (!SPREADSHEET_ID) {
  console.log('❌ ERROR: SPREADSHEET_ID no configurado');
  console.log('\nPor favor, configura en el archivo .env:');
  console.log('  GOOGLE_SHEETS_SPREADSHEET_ID=tu-spreadsheet-id\n');
  console.log('El ID se encuentra en la URL de tu Google Sheet:');
  console.log('  https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit\n');
  console.log('='.repeat(80));
  process.exit(1);
}

const credentialsFullPath = path.resolve(CREDENTIALS_PATH);

if (!fs.existsSync(credentialsFullPath)) {
  console.log('❌ ERROR: Archivo de credenciales no encontrado');
  console.log(`\nBuscando en: ${credentialsFullPath}`);
  console.log('\nPor favor, sigue estos pasos:');
  console.log('  1. Crea un Service Account en Google Cloud Console');
  console.log('  2. Descarga el archivo JSON de credenciales');
  console.log('  3. Cópialo a: ' + credentialsFullPath);
  console.log('  4. Comparte tu Google Sheet con el email del service account\n');
  console.log('Ver guía completa en: GOOGLE_SHEETS_API_SETUP.md');
  console.log('='.repeat(80));
  process.exit(1);
}

console.log('✅ Configuración encontrada');
console.log(`   Credenciales: ${credentialsFullPath}`);
console.log(`   Spreadsheet ID: ${SPREADSHEET_ID}\n`);

// Leer credenciales
let credentials;
try {
  credentials = JSON.parse(fs.readFileSync(credentialsFullPath, 'utf8'));
  console.log('✅ Credenciales cargadas');
  console.log(`   Service Account: ${credentials.client_email}`);
  console.log(`   Project ID: ${credentials.project_id}\n`);
} catch (error) {
  console.log('❌ ERROR: No se pudo leer el archivo de credenciales');
  console.log(`   ${error.message}\n`);
  console.log('='.repeat(80));
  process.exit(1);
}

// Crear cliente de autenticación
async function authenticate() {
  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsFullPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return await auth.getClient();
}

// Obtener metadata del spreadsheet
async function getSpreadsheetMetadata(sheets) {
  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    return response.data;
  } catch (error) {
    throw error;
  }
}

// Obtener datos de una hoja específica
async function getSheetData(sheets, sheetName, maxRows = 5) {
  try {
    const range = `${sheetName}!A1:ZZ${maxRows}`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
    });

    return response.data.values || [];
  } catch (error) {
    console.log(`   ⚠️  Error leyendo datos de "${sheetName}": ${error.message}`);
    return null;
  }
}

// Función principal
async function testConnection() {
  try {
    console.log('='.repeat(80));
    console.log('🔐 AUTENTICANDO CON GOOGLE SHEETS API\n');

    const authClient = await authenticate();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    console.log('✅ Autenticación exitosa\n');
    console.log('='.repeat(80));
    console.log('📊 OBTENIENDO INFORMACIÓN DEL SPREADSHEET\n');

    const metadata = await getSpreadsheetMetadata(sheets);

    console.log(`✅ Spreadsheet encontrado:`);
    console.log(`   Título: ${metadata.properties.title}`);
    console.log(`   Locale: ${metadata.properties.locale}`);
    console.log(`   Zona horaria: ${metadata.properties.timeZone}`);
    console.log(`   Total de hojas: ${metadata.sheets.length}\n`);

    console.log('='.repeat(80));
    console.log('📋 HOJAS DISPONIBLES\n');

    for (const sheet of metadata.sheets) {
      const sheetName = sheet.properties.title;
      const sheetId = sheet.properties.sheetId;
      const rowCount = sheet.properties.gridProperties?.rowCount || 0;
      const colCount = sheet.properties.gridProperties?.columnCount || 0;

      console.log(`\n${'─'.repeat(80)}`);
      console.log(`📄 Hoja: "${sheetName}"`);
      console.log('─'.repeat(80));
      console.log(`   Sheet ID: ${sheetId}`);
      console.log(`   Filas: ${rowCount}`);
      console.log(`   Columnas: ${colCount}`);

      // Obtener datos de muestra
      const data = await getSheetData(sheets, sheetName, 5);

      if (data && data.length > 0) {
        console.log(`\n   ✅ Datos encontrados (mostrando primeras ${Math.min(5, data.length)} filas)`);

        // Encabezados
        if (data[0]) {
          console.log(`\n   📊 Columnas (${data[0].length}):`);
          data[0].forEach((col, idx) => {
            console.log(`      ${(idx + 1).toString().padStart(3)}. ${col}`);
          });
        }

        // Primera fila de datos
        if (data.length > 1 && data[1]) {
          console.log(`\n   💾 Primera fila de datos:`);
          data[0].forEach((col, idx) => {
            const value = data[1][idx] || '(vacío)';
            const valueStr = String(value).substring(0, 50);
            console.log(`      ${col}: ${valueStr}`);
          });
        }

        // Contar filas con datos
        console.log(`\n   📈 Total de filas con datos en muestra: ${data.length - 1}`);
      } else {
        console.log(`\n   ⚠️  No se encontraron datos en esta hoja`);
      }
    }

    console.log('\n\n' + '='.repeat(80));
    console.log('✅ TEST COMPLETADO EXITOSAMENTE');
    console.log('='.repeat(80));
    console.log('\n📝 Próximos pasos:\n');
    console.log('1. Identifica las hojas que contienen:');
    console.log('   - Datos de laboratorio (Hb, Hto, Plaquetas, TP, INR, etc.)');
    console.log('   - Exámenes complementarios (ECG, Ecocardiograma, etc.)\n');
    console.log('2. Actualiza el archivo .env con los nombres:');
    console.log('   GOOGLE_SHEETS_TAB_LABS=nombre_hoja_laboratorios');
    console.log('   GOOGLE_SHEETS_TAB_EXAMS=nombre_hoja_examenes\n');
    console.log('3. Ejecuta el script de importación de datos');
    console.log('='.repeat(80));

  } catch (error) {
    console.log('\n' + '='.repeat(80));
    console.log('❌ ERROR EN LA CONEXIÓN');
    console.log('='.repeat(80));
    console.log(`\nTipo de error: ${error.code || 'UNKNOWN'}`);
    console.log(`Mensaje: ${error.message}\n`);

    if (error.code === 403) {
      console.log('🔒 Error de permisos (403 Forbidden)\n');
      console.log('Posibles causas:');
      console.log('  1. El Google Sheet no está compartido con el service account');
      console.log(`     → Comparte el sheet con: ${credentials.client_email}`);
      console.log('  2. El service account no tiene permisos de lectura');
      console.log('  3. Google Sheets API no está habilitada en Google Cloud Console\n');
    } else if (error.code === 404) {
      console.log('❌ Spreadsheet no encontrado (404 Not Found)\n');
      console.log('Posibles causas:');
      console.log('  1. El SPREADSHEET_ID es incorrecto');
      console.log(`     → Verifica: ${SPREADSHEET_ID}`);
      console.log('  2. El spreadsheet fue eliminado o no existe\n');
    } else if (error.message.includes('API has not been used')) {
      console.log('🔧 Google Sheets API no está habilitada\n');
      console.log('Pasos para habilitar:');
      console.log('  1. Ve a https://console.cloud.google.com/apis/library');
      console.log('  2. Busca "Google Sheets API"');
      console.log('  3. Haz clic en "Enable"\n');
    }

    console.log('Ver guía completa en: GOOGLE_SHEETS_API_SETUP.md');
    console.log('='.repeat(80));
    process.exit(1);
  }
}

// Ejecutar
testConnection();
