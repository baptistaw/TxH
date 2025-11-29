// Script para sincronizar archivos de Google Drive con la base de datos
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

console.log('🔄 SINCRONIZACIÓN DE ARCHIVOS DE GOOGLE DRIVE\n');
console.log('='.repeat(80));

async function syncDriveFiles() {
  try {
    // 1. Autenticar con Google Drive
    console.log('\n🔐 Autenticando con Google Drive...\n');

    const credentialsPath = process.env.GOOGLE_DRIVE_CREDENTIALS_PATH || './google-credentials.json';
    const fullPath = path.resolve(credentialsPath);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`No se encontró el archivo de credenciales en: ${fullPath}`);
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: fullPath,
      scopes: ['https://www.googleapis.com/auth/drive.readonly']
    });

    const drive = google.drive({ version: 'v3', auth });

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID no está configurado en .env');
    }

    console.log('   ✅ Autenticación exitosa');

    // 2. Listar TODOS los archivos de Drive (con paginación)
    console.log('\n📁 Listando archivos en Google Drive...\n');

    let allFiles = [];
    let pageToken = null;

    do {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, webViewLink, webContentLink)',
        pageSize: 1000,
        pageToken: pageToken
      });

      allFiles = allFiles.concat(response.data.files);
      pageToken = response.data.nextPageToken;

      console.log(`   Descargados: ${allFiles.length} archivos...`);

    } while (pageToken);

    console.log(`\n   ✅ Total archivos en Drive: ${allFiles.length}`);

    // 3. Obtener archivos de la BD
    console.log('\n📋 Obteniendo archivos de la base de datos...\n');

    const dbFiles = await prisma.preopAttachment.findMany({
      select: {
        id: true,
        fileName: true,
        url: true,
        type: true
      }
    });

    console.log(`   ✅ Total archivos en BD: ${dbFiles.length}`);

    // Filtrar solo los que tienen ruta (no "Normal" ni solo texto)
    const dbFilesConRuta = dbFiles.filter(f =>
      f.fileName.includes('/') || f.fileName.includes('\\')
    );

    console.log(`   📁 Archivos con ruta en BD: ${dbFilesConRuta.length}`);

    // 4. Mapear archivos
    console.log('\n🔗 Mapeando archivos de Drive con BD...\n');

    let matched = 0;
    let notFound = 0;
    let updated = 0;
    const notFoundFiles = [];

    for (const dbFile of dbFilesConRuta) {
      // Extraer solo el nombre del archivo (sin la ruta Preoperatorio_Images/)
      const fileNameOnly = dbFile.fileName.split('/').pop();

      // Buscar en Drive
      const driveFile = allFiles.find(df => df.name === fileNameOnly);

      if (driveFile) {
        matched++;

        // Generar URL para acceder al archivo
        // Opción 1: URL directa (requiere que el archivo sea público)
        // const newUrl = `https://drive.google.com/uc?id=${driveFile.id}`;

        // Opción 2: URL de visualización
        // const newUrl = `https://drive.google.com/file/d/${driveFile.id}/view`;

        // Opción 3: Guardar solo el ID (recomendado - lo convertiremos en URL en el backend)
        const newUrl = `gdrive://${driveFile.id}`;

        // Actualizar en la BD
        await prisma.preopAttachment.update({
          where: { id: dbFile.id },
          data: {
            url: newUrl,
            appsheetUrl: dbFile.fileName // Preservar referencia original
          }
        });

        updated++;

        if (updated % 50 === 0) {
          console.log(`   Actualizados: ${updated}/${matched}`);
        }

      } else {
        notFound++;
        notFoundFiles.push(fileNameOnly);
      }
    }

    console.log(`\n   ✅ Archivos encontrados y mapeados: ${matched}`);
    console.log(`   ⚠️  Archivos no encontrados en Drive: ${notFound}`);
    console.log(`   ✅ Registros actualizados en BD: ${updated}`);

    // 5. Mostrar archivos no encontrados
    if (notFoundFiles.length > 0 && notFoundFiles.length <= 20) {
      console.log('\n   ⚠️  Archivos no encontrados:\n');
      notFoundFiles.forEach(f => console.log(`      - ${f}`));
    } else if (notFoundFiles.length > 20) {
      console.log('\n   ⚠️  Demasiados archivos no encontrados (${notFoundFiles.length}).');
      console.log('      Verifica que todos los archivos estén en la carpeta de Drive.');
    }

    // 6. Estadísticas finales
    console.log('\n' + '='.repeat(80));
    console.log('📊 ESTADÍSTICAS FINALES');
    console.log('='.repeat(80));
    console.log();
    console.log(`   Total archivos en Google Drive:     ${allFiles.length}`);
    console.log(`   Total referencias en BD:            ${dbFiles.length}`);
    console.log(`   Referencias con ruta:               ${dbFilesConRuta.length}`);
    console.log(`   ✅ Archivos sincronizados:          ${matched} (${((matched/dbFilesConRuta.length)*100).toFixed(1)}%)`);
    console.log(`   ⚠️  No encontrados:                 ${notFound}`);
    console.log();

    // 7. Verificar actualización
    const sampleUpdated = await prisma.preopAttachment.findMany({
      where: {
        url: {
          startsWith: 'gdrive://'
        }
      },
      take: 5,
      include: {
        preop: {
          include: {
            patient: {
              select: { ciRaw: true, name: true }
            }
          }
        }
      }
    });

    if (sampleUpdated.length > 0) {
      console.log('📄 MUESTRA DE ARCHIVOS SINCRONIZADOS:\n');
      sampleUpdated.forEach((file, idx) => {
        const driveId = file.url.replace('gdrive://', '');
        console.log(`[${idx+1}] ${file.preop.patient.name} (CI: ${file.preop.patient.ciRaw})`);
        console.log(`    Tipo: ${file.type}`);
        console.log(`    Archivo: ${file.fileName.split('/').pop()}`);
        console.log(`    Drive ID: ${driveId}`);
        console.log(`    URL acceso: https://drive.google.com/file/d/${driveId}/view`);
        console.log();
      });
    }

    console.log('='.repeat(80));
    console.log('\n✅ SINCRONIZACIÓN COMPLETADA\n');
    console.log('Próximo paso: Crear endpoint para servir archivos');
    console.log('  - Los archivos están referenciados como gdrive://FILE_ID');
    console.log('  - El backend los convertirá en URLs accesibles');
    console.log('  - O puedes generar enlaces públicos si prefieres\n');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

syncDriveFiles();
