// Script para probar la conexión con AppSheet API y explorar las tablas disponibles
require('dotenv').config();

const APPSHEET_API_KEY = process.env.APPSHEET_API_KEY;
const APPSHEET_APP_ID = process.env.APPSHEET_APP_ID;
const APPSHEET_API_URL = process.env.APPSHEET_API_URL || 'https://api.appsheet.com/api/v2';

console.log('🔌 TEST DE CONEXIÓN A APPSHEET API\n');
console.log('='.repeat(80));

// Validar que las credenciales estén configuradas
if (!APPSHEET_API_KEY || !APPSHEET_APP_ID) {
  console.log('❌ ERROR: Credenciales no configuradas');
  console.log('\nPor favor, configura en el archivo .env:');
  console.log('  APPSHEET_APP_ID=tu-app-id');
  console.log('  APPSHEET_API_KEY=tu-api-key');
  console.log('\nPasos para obtener las credenciales:');
  console.log('  1. Ve a https://www.appsheet.com/account/apps');
  console.log('  2. Selecciona tu aplicación');
  console.log('  3. Ve a "Manage" > "Integrations" > "IN: from cloud services"');
  console.log('  4. Habilita la API y copia el Application ID y el Access Key');
  console.log('='.repeat(80));
  process.exit(1);
}

console.log('✅ Credenciales configuradas');
console.log(`   App ID: ${APPSHEET_APP_ID}`);
console.log(`   API Key: ${APPSHEET_API_KEY.substring(0, 10)}...`);
console.log(`   API URL: ${APPSHEET_API_URL}\n`);

// Función para hacer una petición a AppSheet API
async function appsheetRequest(action, tableName, selector = 'Filter(, true)') {
  const url = `${APPSHEET_API_URL}/apps/${APPSHEET_APP_ID}/tables/${tableName}/Action`;

  const body = {
    Action: action,
    Properties: {
      Locale: 'es-UY',
      Selector: selector
    }
  };

  console.log(`📤 Haciendo petición a: ${url}`);
  console.log(`   Acción: ${action}`);
  console.log(`   Tabla: ${tableName}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'ApplicationAccessKey': APPSHEET_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const status = response.status;
    const statusText = response.statusText;

    console.log(`📥 Respuesta: ${status} ${statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Error: ${errorText}\n`);
      return null;
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.log(`❌ Error de conexión: ${error.message}\n`);
    return null;
  }
}

// Función principal
async function testConnection() {
  console.log('='.repeat(80));
  console.log('🔍 EXPLORANDO TABLAS EN APPSHEET\n');

  // Lista de posibles nombres de tablas (basado en la estructura del Excel)
  const possibleTables = [
    'Preoperatorio',
    'PreOp',
    'Laboratorios',
    'Labs',
    'DatosLaboratorio',
    'ExamenesComplementarios',
    'Examenes',
    'Estudios',
    'DatosPaciente',
    'Pacientes',
    'DatosTrasplante',
    'Trasplantes'
  ];

  console.log('Intentando conectar con las siguientes tablas:');
  possibleTables.forEach((table, idx) => {
    console.log(`  ${idx + 1}. ${table}`);
  });
  console.log('\n' + '='.repeat(80) + '\n');

  for (const tableName of possibleTables) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📋 Probando tabla: "${tableName}"`);
    console.log('─'.repeat(80));

    // Intentar obtener 1 registro de la tabla
    const data = await appsheetRequest('Find', tableName, 'FILTER(, true)');

    if (data && data.Rows && data.Rows.length > 0) {
      console.log(`✅ Tabla encontrada: "${tableName}"`);
      console.log(`   Registros obtenidos: ${data.Rows.length}`);
      console.log(`\n   📊 Columnas disponibles (${Object.keys(data.Rows[0]).length}):`);

      const columns = Object.keys(data.Rows[0]);
      columns.forEach((col, idx) => {
        const value = data.Rows[0][col];
        const valueStr = value !== null && value !== undefined ?
          String(value).substring(0, 50) : 'null';
        console.log(`      ${(idx + 1).toString().padStart(3)}. ${col.padEnd(30)} → ${valueStr}`);
      });

      console.log(`\n   💾 Primer registro completo:`);
      console.log(JSON.stringify(data.Rows[0], null, 2));

    } else if (data) {
      console.log(`⚠️  Tabla "${tableName}" existe pero no tiene datos`);
    } else {
      console.log(`❌ Tabla "${tableName}" no encontrada o error en la petición`);
    }

    // Pequeña pausa entre peticiones
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('✅ TEST COMPLETADO');
  console.log('='.repeat(80));
  console.log('\nPróximos pasos:');
  console.log('  1. Identifica las tablas que contienen los datos de laboratorio');
  console.log('  2. Actualiza .env con los nombres correctos:');
  console.log('     APPSHEET_TABLE_LABS=nombre_tabla_laboratorios');
  console.log('     APPSHEET_TABLE_EXAMS=nombre_tabla_examenes');
  console.log('  3. Ejecuta el script de importación');
  console.log('='.repeat(80));
}

// Ejecutar
testConnection().catch(err => {
  console.error('\n❌ Error fatal:', err);
  process.exit(1);
});
