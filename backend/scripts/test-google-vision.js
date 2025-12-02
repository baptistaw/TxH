#!/usr/bin/env node
/**
 * Script para probar la conexión con Google Cloud Vision API
 * Diagnostica problemas de autenticación
 */

require('dotenv').config();
const vision = require('@google-cloud/vision');

async function testVision() {
  console.log('=== Test de Google Cloud Vision ===\n');

  // 1. Verificar variables de entorno
  console.log('1. Variables de entorno:');
  console.log(`   GOOGLE_CLOUD_CREDENTIALS: ${process.env.GOOGLE_CLOUD_CREDENTIALS ? 'DEFINIDA (' + process.env.GOOGLE_CLOUD_CREDENTIALS.length + ' chars)' : 'NO DEFINIDA'}`);
  console.log(`   GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || 'NO DEFINIDA'}`);

  // 2. Parsear credenciales
  if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
    console.log('\n2. Parseando GOOGLE_CLOUD_CREDENTIALS:');
    try {
      const creds = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
      console.log(`   ✓ JSON válido`);
      console.log(`   project_id: ${creds.project_id}`);
      console.log(`   client_email: ${creds.client_email}`);
      console.log(`   private_key_id: ${creds.private_key_id?.substring(0, 8)}...`);
      console.log(`   private_key presente: ${creds.private_key ? 'SÍ (' + creds.private_key.length + ' chars)' : 'NO'}`);

      // Verificar que private_key tiene formato correcto
      if (creds.private_key) {
        const hasBegin = creds.private_key.includes('-----BEGIN PRIVATE KEY-----');
        const hasEnd = creds.private_key.includes('-----END PRIVATE KEY-----');
        const hasNewlines = creds.private_key.includes('\n');
        console.log(`   private_key tiene BEGIN: ${hasBegin ? 'SÍ' : 'NO ❌'}`);
        console.log(`   private_key tiene END: ${hasEnd ? 'SÍ' : 'NO ❌'}`);
        console.log(`   private_key tiene newlines: ${hasNewlines ? 'SÍ' : 'NO ❌'}`);

        if (!hasNewlines) {
          console.log('   ⚠️  La private_key no tiene saltos de línea reales');
          console.log('   Esto puede causar error 401');
        }
      }

      // 3. Intentar crear cliente
      console.log('\n3. Creando cliente de Vision:');
      const client = new vision.ImageAnnotatorClient({ credentials: creds });
      console.log('   ✓ Cliente creado exitosamente');

      // 4. Hacer una petición de prueba (lista de features soportadas)
      console.log('\n4. Probando conexión a la API:');

      // Crear una imagen de prueba pequeña (1x1 pixel blanco)
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const testImageBuffer = Buffer.from(testImageBase64, 'base64');

      try {
        const [result] = await client.textDetection({
          image: { content: testImageBuffer }
        });
        console.log('   ✓ Conexión exitosa a Google Cloud Vision API');
        console.log(`   Respuesta: ${result.textAnnotations?.length || 0} anotaciones (normal para imagen vacía)`);
      } catch (apiError) {
        console.log(`   ❌ Error de API: ${apiError.message}`);
        console.log(`   Código: ${apiError.code}`);

        if (apiError.code === 7 || apiError.message.includes('PERMISSION_DENIED')) {
          console.log('\n   ⚠️  La API de Cloud Vision puede no estar habilitada.');
          console.log('   Ve a: https://console.cloud.google.com/apis/library/vision.googleapis.com');
          console.log('   Y habilita la API para el proyecto:', creds.project_id);
        }

        if (apiError.code === 16 || apiError.message.includes('UNAUTHENTICATED')) {
          console.log('\n   ⚠️  Error de autenticación 401.');
          console.log('   Posibles causas:');
          console.log('   1. La cuenta de servicio fue eliminada o deshabilitada');
          console.log('   2. Las credenciales expiraron (re-descarga el JSON)');
          console.log('   3. El proyecto fue deshabilitado');
        }
      }

    } catch (parseError) {
      console.log(`   ❌ Error parseando JSON: ${parseError.message}`);
      console.log('   El JSON en GOOGLE_CLOUD_CREDENTIALS no es válido');
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('\n2. Usando archivo de credenciales:');
    console.log(`   Ruta: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);

    const fs = require('fs');
    if (fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      console.log('   ✓ Archivo existe');

      // Leer y mostrar info del archivo
      const creds = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
      console.log(`   project_id: ${creds.project_id}`);
      console.log(`   client_email: ${creds.client_email}`);

      // Crear cliente y probar
      console.log('\n3. Creando cliente de Vision:');
      const client = new vision.ImageAnnotatorClient();
      console.log('   ✓ Cliente creado exitosamente');

      // 4. Probar API
      console.log('\n4. Probando conexión a la API:');
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const testImageBuffer = Buffer.from(testImageBase64, 'base64');

      try {
        const [result] = await client.textDetection({
          image: { content: testImageBuffer }
        });
        console.log('   ✓ Conexión exitosa a Google Cloud Vision API');
        console.log(`   Respuesta: ${result.textAnnotations?.length || 0} anotaciones (normal para imagen vacía)`);
      } catch (apiError) {
        console.log(`   ❌ Error de API: ${apiError.message}`);
        console.log(`   Código: ${apiError.code}`);

        if (apiError.code === 7 || apiError.message.includes('PERMISSION_DENIED')) {
          console.log('\n   ⚠️  La API de Cloud Vision NO está habilitada.');
          console.log('   Ve a: https://console.cloud.google.com/apis/library/vision.googleapis.com');
          console.log('   Y habilita la API para el proyecto:', creds.project_id);
        }

        if (apiError.code === 16 || apiError.message.includes('UNAUTHENTICATED')) {
          console.log('\n   ⚠️  Error de autenticación 401.');
          console.log('   Posibles causas:');
          console.log('   1. La cuenta de servicio fue eliminada o deshabilitada');
          console.log('   2. Las credenciales expiraron (re-descarga el JSON)');
          console.log('   3. El proyecto fue deshabilitado');
        }
      }

    } else {
      console.log('   ❌ Archivo NO existe');
    }
  } else {
    console.log('\n❌ No hay credenciales configuradas');
    console.log('   Configura GOOGLE_CLOUD_CREDENTIALS o GOOGLE_APPLICATION_CREDENTIALS');
  }

  console.log('\n=== Fin del test ===');
}

testVision().catch(console.error);
