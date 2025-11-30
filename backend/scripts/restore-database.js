#!/usr/bin/env node
/**
 * Script de restauración de base de datos PostgreSQL
 *
 * Uso:
 *   node scripts/restore-database.js path/to/backup.dump
 *
 * ADVERTENCIA: Este script sobrescribirá los datos actuales de la base de datos.
 * Asegúrate de tener un backup reciente antes de restaurar.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Configuración
const DB_URL = process.env.DATABASE_URL;
const BACKUP_FILE = process.argv[2];

if (!DB_URL) {
  console.error('ERROR: DATABASE_URL no está definida');
  process.exit(1);
}

if (!BACKUP_FILE) {
  console.error('ERROR: Debes especificar el archivo de backup a restaurar');
  console.error('Uso: node scripts/restore-database.js path/to/backup.dump');

  // Listar backups disponibles
  const backupDir = path.join(__dirname, '../backups');
  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.dump'))
      .sort()
      .reverse();

    if (files.length > 0) {
      console.error('\nBackups disponibles:');
      files.forEach(f => console.error(`  ${path.join(backupDir, f)}`));
    }
  }

  process.exit(1);
}

if (!fs.existsSync(BACKUP_FILE)) {
  console.error(`ERROR: El archivo de backup no existe: ${BACKUP_FILE}`);
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

async function confirmRestore() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      '\n⚠️  ADVERTENCIA: Esta operación sobrescribirá los datos actuales.\n' +
      '¿Estás seguro de que deseas continuar? (escribe "RESTAURAR" para confirmar): ',
      (answer) => {
        rl.close();
        resolve(answer === 'RESTAURAR');
      }
    );
  });
}

async function restoreBackup() {
  console.log('========================================');
  console.log('  RESTAURACIÓN DE BASE DE DATOS');
  console.log('========================================\n');

  const db = parseDatabaseUrl(DB_URL);
  const stats = fs.statSync(BACKUP_FILE);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(`Base de datos: ${db.database}`);
  console.log(`Host: ${db.host}:${db.port}`);
  console.log(`Archivo de backup: ${BACKUP_FILE}`);
  console.log(`Tamaño del backup: ${sizeMB} MB`);

  // Solicitar confirmación
  const confirmed = await confirmRestore();

  if (!confirmed) {
    console.log('\nRestauración cancelada.');
    process.exit(0);
  }

  try {
    const env = {
      ...process.env,
      PGPASSWORD: db.password,
    };

    console.log('\nRestaurando base de datos...\n');

    // Opción 1: Usar pg_restore con --clean para eliminar objetos antes de recrearlos
    const pgRestoreCmd = [
      'pg_restore',
      `-h ${db.host}`,
      `-p ${db.port}`,
      `-U ${db.user}`,
      '-d', db.database,
      '--clean', // Eliminar objetos antes de recrearlos
      '--if-exists', // No fallar si los objetos no existen
      '-v', // Verbose
      `"${BACKUP_FILE}"`,
    ].join(' ');

    execSync(pgRestoreCmd, {
      env,
      stdio: 'inherit',
    });

    console.log('\n========================================');
    console.log('  RESTAURACIÓN COMPLETADA');
    console.log('========================================');
    console.log(`Base de datos restaurada desde: ${BACKUP_FILE}`);
    console.log(`Fecha: ${new Date().toLocaleString()}`);
    console.log('========================================\n');
  } catch (error) {
    // pg_restore puede devolver código de error incluso con advertencias
    if (error.status === 1) {
      console.log('\n========================================');
      console.log('  RESTAURACIÓN COMPLETADA CON ADVERTENCIAS');
      console.log('========================================');
      console.log('Algunas advertencias pueden ser normales (ej: objetos que no existían).');
      console.log('Verifica que los datos fueron restaurados correctamente.');
      console.log('========================================\n');
    } else {
      console.error('\n========================================');
      console.error('  ERROR EN LA RESTAURACIÓN');
      console.error('========================================');
      console.error(error.message);
      console.error('========================================\n');
      process.exit(1);
    }
  }
}

// Ejecutar
restoreBackup();
