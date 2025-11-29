// Script de diagnóstico para AppSheet API
require('dotenv').config();

const APPSHEET_API_KEY = process.env.APPSHEET_API_KEY;
const APPSHEET_APP_ID = process.env.APPSHEET_APP_ID;

console.log('🔍 DIAGNÓSTICO DE APPSHEET API\n');
console.log('='.repeat(80));

console.log('📋 Información de configuración:');
console.log(`   App ID: ${APPSHEET_APP_ID}`);
console.log(`   API Key: ${APPSHEET_API_KEY ? APPSHEET_API_KEY.substring(0, 15) + '...' : 'NO CONFIGURADO'}`);
console.log('\n' + '='.repeat(80));

console.log('\n❌ Error detectado: "AppTemplate not found"\n');
console.log('Este error generalmente significa:\n');

console.log('1️⃣  El Application ID es incorrecto');
console.log('   → Verifica que el ID sea el correcto en AppSheet');
console.log('   → No uses el email, usa solo el número del App ID\n');

console.log('2️⃣  La aplicación no está publicada/desplegada');
console.log('   → En AppSheet, ve a tu aplicación');
console.log('   → Haz clic en "Deploy" o "Manage" > "Deploy"');
console.log('   → Asegúrate de que esté "Deployed" (no solo guardada)\n');

console.log('3️⃣  La API no está habilitada correctamente');
console.log('   → Ve a AppSheet: www.appsheet.com/account/apps');
console.log('   → Selecciona tu app de Registro Anestesiológico');
console.log('   → Ve a "Manage" > "Integrations"');
console.log('   → En la sección "IN: from cloud services":');
console.log('     • Habilita "Enable" en la API');
console.log('     • Copia el Application ID (solo el número)');
console.log('     • Copia el Application Access Key (la cadena larga)\n');

console.log('4️⃣  Necesitas usar el nombre exacto de la aplicación');
console.log('   → En lugar del App ID numérico, algunos casos requieren');
console.log('   → el nombre exacto de la app como aparece en AppSheet\n');

console.log('='.repeat(80));
console.log('\n📝 ACCIONES RECOMENDADAS:\n');

console.log('A. Verificar el Application ID:');
console.log('   1. Ve a https://www.appsheet.com/account/apps');
console.log('   2. Haz clic en tu aplicación "Registro Anestesiológico"');
console.log('   3. Ve a "Settings" > "App info"');
console.log('   4. Busca el "App ID" o "Application ID"');
console.log('   5. Compáralo con el que tienes configurado: ' + APPSHEET_APP_ID + '\n');

console.log('B. Verificar que la app esté desplegada:');
console.log('   1. En tu app de AppSheet');
console.log('   2. Haz clic en el botón "Deploy"');
console.log('   3. Verifica que diga "Deployed" con fecha reciente\n');

console.log('C. Habilitar la API:');
console.log('   1. En tu app: "Manage" > "Integrations"');
console.log('   2. Sección "IN: from cloud services"');
console.log('   3. Activa el toggle de la API');
console.log('   4. Copia las credenciales EXACTAMENTE como aparecen\n');

console.log('D. Método alternativo - Usar el nombre de la app:');
console.log('   Algunos casos requieren usar el nombre de la app en lugar del ID');
console.log('   ¿Cuál es el nombre exacto de tu aplicación en AppSheet?\n');

console.log('='.repeat(80));
console.log('\n💡 INFORMACIÓN ADICIONAL NECESARIA:\n');
console.log('Por favor proporciona:');
console.log('   1. ¿Cuál es el nombre EXACTO de tu aplicación en AppSheet?');
console.log('   2. ¿La app está en estado "Deployed"?');
console.log('   3. ¿Puedes ver la opción "Enable API" en Integrations?');
console.log('   4. ¿Hay algún mensaje de error en AppSheet cuando intentas habilitar la API?\n');
console.log('='.repeat(80));
