#!/usr/bin/env node
/**
 * Script de backup manual de base de datos PostgreSQL
 *
 * Uso:
 *   node scripts/backup-database.js
 *   node scripts/backup-database.js --output /path/to/backup
 *
 * Este script crea un dump de la base de datos que puede ser restaurado
 * en caso de pérdida de datos o errores de manipulación.
 *
 * Para restaurar un backup:
 *   pg_restore -d DATABASE_NAME backup_file.dump
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuración
const BACKUP_DIR = process.argv[3] || path.join(__dirname, '../backups');
const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  console.error('ERROR: DATABASE_URL no está definida');
  console.error('Asegúrate de tener el archivo .env con DATABASE_URL configurada');
  process.exit(1);
}

// Parsear DATABASE_URL
function parseDatabaseUrl(url) {
  const regex = /postgresql:\/\/([^:]+):?([^@]*)@([^:\/]+):?(\d*)\/([^?]+)/;
  const match = url.match(regex);

  if (!match) {
    throw new Error('DATABASE_URL no tiene un formato válido');
  }

  return {
    user: match[1],
    password: match[2] || '',
    host: match[3],
    port: match[4] || '5432',
    database: match[5],
  };
}

async function createBackup() {
  console.log('========================================');
  console.log('  BACKUP DE BASE DE DATOS');
  console.log('========================================\n');

  try {
    // Crear directorio de backups si no existe
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log(`Directorio de backups creado: ${BACKUP_DIR}`);
    }

    const db = parseDatabaseUrl(DB_URL);

    // Generar nombre de archivo con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${db.database}_${timestamp}.dump`;
    const filepath = path.join(BACKUP_DIR, filename);

    console.log(`Base de datos: ${db.database}`);
    console.log(`Host: ${db.host}:${db.port}`);
    console.log(`Archivo de backup: ${filepath}\n`);

    // Construir comando pg_dump
    const env = {
      ...process.env,
      PGPASSWORD: db.password,
    };

    const pgDumpCmd = [
      'pg_dump',
      `-h ${db.host}`,
      `-p ${db.port}`,
      `-U ${db.user}`,
      '-Fc', // Formato personalizado (comprimido)
      '-b', // Incluir blobs
      '-v', // Verbose
      `-f "${filepath}"`,
      db.database,
    ].join(' ');

    console.log('Ejecutando pg_dump...\n');

    execSync(pgDumpCmd, {
      env,
      stdio: 'inherit',
    });

    // Verificar que el archivo fue creado
    if (fs.existsSync(filepath)) {
      const stats = fs.statSync(filepath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      console.log('\n========================================');
      console.log('  BACKUP COMPLETADO EXITOSAMENTE');
      console.log('========================================');
      console.log(`Archivo: ${filepath}`);
      console.log(`Tamaño: ${sizeMB} MB`);
      console.log(`Fecha: ${new Date().toLocaleString()}`);
      console.log('\nPara restaurar este backup:');
      console.log(`  pg_restore -d ${db.database} "${filepath}"`);
      console.log('========================================\n');

      // Limpiar backups antiguos (mantener últimos 10)
      cleanOldBackups(BACKUP_DIR, 10);

      return filepath;
    } else {
      throw new Error('El archivo de backup no fue creado');
    }
  } catch (error) {
    console.error('\n========================================');
    console.error('  ERROR EN EL BACKUP');
    console.error('========================================');
    console.error(error.message);
    console.error('\nAsegúrate de que:');
    console.error('  1. pg_dump está instalado');
    console.error('  2. DATABASE_URL es correcta');
    console.error('  3. Tienes permisos de escritura en el directorio de backups');
    console.error('========================================\n');
    process.exit(1);
  }
}

function cleanOldBackups(dir, keepCount) {
  try {
    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith('backup_') && f.endsWith('.dump'))
      .map(f => ({
        name: f,
        path: path.join(dir, f),
        time: fs.statSync(path.join(dir, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time); // Más reciente primero

    if (files.length > keepCount) {
      const toDelete = files.slice(keepCount);
      console.log(`\nLimpiando ${toDelete.length} backups antiguos...`);

      toDelete.forEach(f => {
        fs.unlinkSync(f.path);
        console.log(`  Eliminado: ${f.name}`);
      });
    }
  } catch (error) {
    console.warn('Advertencia: No se pudieron limpiar backups antiguos', error.message);
  }
}

// Ejecutar
createBackup();
