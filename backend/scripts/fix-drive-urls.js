// Script para actualizar las URLs de attachments a formato Google Drive
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');
const fs = require('fs');

const prisma = new PrismaClient();

console.log('🔧 ACTUALIZANDO URLs DE GOOGLE DRIVE\n');
console.log('='.repeat(80));

const stats = {
  total: 0,
  actualizados: 0,
  noEncontrados: 0,
  errores: []
};

// Inicializar Google Drive API
let drive;
try {
  const credentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_DRIVE_CREDENTIALS_PATH || './google-credentials.json'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  drive = google.drive({ version: 'v3', auth });
  console.log('✅ Conectado a Google Drive API\n');
} catch (error) {
  console.error('❌ Error al conectar con Google Drive:', error.message);
  process.exit(1);
}

// Función para buscar archivo en Google Drive por nombre
async function findFileInDrive(fileName) {
  try {
    const query = `name='${fileName.replace(/'/g, "\\'")}' and trashed=false`;

    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name, mimeType, size, webViewLink)',
      spaces: 'drive',
      pageSize: 5
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0]; // Retornar el primer match
    }

    return null;
  } catch (error) {
    console.error(`   Error buscando archivo ${fileName}:`, error.message);
    return null;
  }
}

async function updateAttachment(attachment) {
  stats.total++;

  // Si ya tiene formato gdrive://, saltar
  if (attachment.url && attachment.url.startsWith('gdrive://')) {
    console.log(`   ✓ Ya actualizado: ${attachment.fileName}`);
    return;
  }

  // Si la URL no parece ser un nombre de archivo de Drive, saltar
  if (!attachment.url || !attachment.url.includes('.jpg') && !attachment.url.includes('.pdf') && !attachment.url.includes('.png')) {
    console.log(`   - Saltando (no es archivo): ${attachment.url || 'sin URL'}`);
    return;
  }

  // Extraer el nombre del archivo de la ruta
  const fileName = attachment.url.split('/').pop();

  console.log(`\n[${stats.total}] Buscando: ${fileName}`);

  // Buscar en Google Drive
  const driveFile = await findFileInDrive(fileName);

  if (!driveFile) {
    stats.noEncontrados++;
    stats.errores.push(`No encontrado en Drive: ${fileName}`);
    console.log(`   ❌ No encontrado en Google Drive`);
    return;
  }

  console.log(`   ✅ Encontrado: ID=${driveFile.id}`);

  // Actualizar en la BD
  try {
    await prisma.preopAttachment.update({
      where: { id: attachment.id },
      data: {
        url: `gdrive://${driveFile.id}`,
        mimeType: driveFile.mimeType,
        sizeBytes: parseInt(driveFile.size) || null
      }
    });

    stats.actualizados++;
    console.log(`   ✓ URL actualizada: gdrive://${driveFile.id}`);
  } catch (error) {
    stats.errores.push(`Error actualizando ${fileName}: ${error.message}`);
    console.error(`   ❌ Error actualizando en BD:`, error.message);
  }
}

async function main() {
  try {
    // Obtener todos los attachments que necesitan actualización
    const attachments = await prisma.preopAttachment.findMany({
      where: {
        OR: [
          { url: { contains: 'Preoperatorio_Images/' } },
          { url: { not: { startsWith: 'gdrive://' } } }
        ]
      },
      select: {
        id: true,
        url: true,
        fileName: true,
        type: true
      }
    });

    console.log(`\nTotal de attachments a procesar: ${attachments.length}\n`);
    console.log('='.repeat(80));

    // Procesar cada attachment
    for (const attachment of attachments) {
      await updateAttachment(attachment);

      // Pequeña pausa para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Mostrar resumen
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN');
    console.log('='.repeat(80));
    console.log(`\n✅ RESULTADOS:`);
    console.log(`   Total procesados:        ${stats.total}`);
    console.log(`   Actualizados exitosamente: ${stats.actualizados}`);
    console.log(`   No encontrados en Drive:   ${stats.noEncontrados}`);
    console.log(`\n❌ ERRORES:                  ${stats.errores.length}`);

    if (stats.errores.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('📝 PRIMEROS 20 ERRORES:');
      console.log('='.repeat(80));
      stats.errores.slice(0, 20).forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
      if (stats.errores.length > 20) {
        console.log(`\n... y ${stats.errores.length - 20} errores más`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ PROCESO COMPLETADO\n');

  } catch (error) {
    console.error('❌ Error fatal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
