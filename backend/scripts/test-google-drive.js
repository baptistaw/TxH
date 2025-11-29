// Script para probar conexión a Google Drive API
require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

console.log('🔍 PROBANDO CONEXIÓN A GOOGLE DRIVE\n');
console.log('='.repeat(80));

async function testDrive() {
  try {
    // 1. Verificar que existen las credenciales
    const credentialsPath = process.env.GOOGLE_DRIVE_CREDENTIALS_PATH || './google-credentials.json';
    const fullPath = path.resolve(credentialsPath);

    console.log(`\n📄 Verificando credenciales...\n`);
    console.log(`   Ruta: ${fullPath}`);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`No se encontró el archivo de credenciales en: ${fullPath}`);
    }

    console.log(`   ✅ Archivo de credenciales encontrado`);

    // 2. Cargar credenciales
    const credentials = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    console.log(`   ✅ Service Account: ${credentials.client_email}`);

    // 3. Autenticar con Google Drive
    console.log(`\n🔐 Autenticando con Google Drive...\n`);

    const auth = new google.auth.GoogleAuth({
      keyFile: fullPath,
      scopes: ['https://www.googleapis.com/auth/drive.readonly']
    });

    const drive = google.drive({ version: 'v3', auth });

    // 4. Verificar acceso a la carpeta
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID no está configurado en .env');
    }

    console.log(`   ✅ Autenticación exitosa`);
    console.log(`\n📁 Accediendo a carpeta...\n`);
    console.log(`   Folder ID: ${folderId}`);

    // Obtener información de la carpeta
    const folder = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType, createdTime, modifiedTime, owners'
    });

    console.log(`   ✅ Carpeta encontrada: "${folder.data.name}"`);
    console.log(`   📅 Creada: ${new Date(folder.data.createdTime).toLocaleDateString()}`);
    console.log(`   📅 Modificada: ${new Date(folder.data.modifiedTime).toLocaleDateString()}`);

    // 5. Listar archivos en la carpeta
    console.log(`\n📋 Listando archivos en la carpeta...\n`);

    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, size, createdTime)',
      pageSize: 10,
      orderBy: 'name'
    });

    const files = response.data.files;

    console.log(`   Total de archivos encontrados: ${files.length}\n`);

    if (files.length === 0) {
      console.log('   ⚠️  La carpeta está vacía o no tienes acceso');
    } else {
      console.log('   Primeros 10 archivos:\n');
      files.forEach((file, idx) => {
        const sizeMB = file.size ? (parseInt(file.size) / (1024 * 1024)).toFixed(2) : 'N/A';
        console.log(`   [${idx + 1}] ${file.name}`);
        console.log(`       ID: ${file.id}`);
        console.log(`       Tipo: ${file.mimeType}`);
        console.log(`       Tamaño: ${sizeMB} MB`);
        console.log();
      });
    }

    // 6. Probar generación de URL
    if (files.length > 0) {
      console.log('='.repeat(80));
      console.log('\n🔗 Ejemplo de URLs para acceder a archivos:\n');

      const sampleFile = files[0];
      console.log(`   Archivo: ${sampleFile.name}`);
      console.log(`   ID: ${sampleFile.id}`);
      console.log();
      console.log('   Opciones de URL:');
      console.log();
      console.log(`   1. URL directa (requiere permisos):`);
      console.log(`      https://drive.google.com/uc?id=${sampleFile.id}`);
      console.log();
      console.log(`   2. URL de visualización:`);
      console.log(`      https://drive.google.com/file/d/${sampleFile.id}/view`);
      console.log();
      console.log(`   3. URL a través de tu backend (recomendado):`);
      console.log(`      https://tu-backend.com/api/files/${sampleFile.id}`);
      console.log();
    }

    console.log('='.repeat(80));
    console.log('\n✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE\n');
    console.log('La configuración de Google Drive está correcta.');
    console.log('Puedes proceder a sincronizar los archivos con la base de datos.\n');
    console.log('Siguiente paso:');
    console.log('  node scripts/sync-drive-files.js');
    console.log('='.repeat(80));

  } catch (error) {
    console.log('\n' + '='.repeat(80));
    console.log('❌ ERROR AL CONECTAR CON GOOGLE DRIVE');
    console.log('='.repeat(80));
    console.log();
    console.log(`Error: ${error.message}`);
    console.log();

    if (error.message.includes('No se encontró el archivo')) {
      console.log('📝 Solución:');
      console.log('  1. Descarga las credenciales desde Google Cloud Console');
      console.log('  2. Guárdalas como google-credentials.json en la raíz del proyecto');
      console.log('  3. Verifica que GOOGLE_DRIVE_CREDENTIALS_PATH en .env sea correcto');
    } else if (error.message.includes('GOOGLE_DRIVE_FOLDER_ID')) {
      console.log('📝 Solución:');
      console.log('  1. Agrega GOOGLE_DRIVE_FOLDER_ID=122t1N5J3OJY1luatU0V4B5T7Ig3kkRMc al archivo .env');
    } else if (error.code === 404) {
      console.log('📝 Solución:');
      console.log('  1. Verifica que el FOLDER_ID sea correcto');
      console.log('  2. Comparte la carpeta con el email del Service Account');
      console.log(`  3. Email: ${error.config?.headers?.Authorization ? 'ver credenciales' : 'revisar google-credentials.json'}`);
    } else if (error.code === 403) {
      console.log('📝 Solución:');
      console.log('  1. Habilita Google Drive API en Google Cloud Console');
      console.log('  2. Comparte la carpeta con el Service Account');
      console.log('  3. Asegúrate de dar permisos de "Lector"');
    }

    console.log();
    console.log('Para más ayuda, consulta: GOOGLE_DRIVE_SETUP.md');
    console.log('='.repeat(80));

    process.exit(1);
  }
}

testDrive();
