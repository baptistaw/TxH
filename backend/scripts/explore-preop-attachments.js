// Script para explorar columnas de archivos adjuntos en hoja Preoperatorio
const XLSX = require('xlsx');

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

const workbook = XLSX.readFile(excelPath);
const sheet = workbook.Sheets['Preoperatorio'];
const data = XLSX.utils.sheet_to_json(sheet);

console.log(`📊 Total de registros en Preoperatorio: ${data.length}`);

// Columnas de archivos/estudios
const attachmentColumns = [
  'ECG',
  'ECoCardio',
  'Informe Eco',
  'EstudioFuncional',
  'Informe Est Funcional',
  'RxTx',
  'Fresp',
  'Informe F.Resp',
  'Informe CACG 1',
  'Informe CACG 2',
  'Informe AngioTAC C 1',
  'Informe AngioTAC C 2',
  'ExamCompOtros',
  'Informes Otros 1',
  'Informes Otros 2'
];

console.log('\n📋 Analizando columnas de archivos adjuntos:\n');

// Estadísticas por columna
attachmentColumns.forEach(col => {
  const withData = data.filter(row => row[col] && String(row[col]).trim() !== '');
  console.log(`${col}: ${withData.length} registros con datos`);

  // Mostrar 2 ejemplos si existen
  if (withData.length > 0) {
    console.log(`  Ejemplos:`);
    withData.slice(0, 2).forEach(row => {
      const value = String(row[col]);
      const preview = value.length > 80 ? value.substring(0, 80) + '...' : value;
      console.log(`    - CI ${row['CI']}: ${preview}`);
    });
  }
  console.log('');
});

// Contar total de archivos por paciente
console.log('\n📊 Registros con adjuntos:');
const withAttachments = data.filter(row => {
  return attachmentColumns.some(col => row[col] && String(row[col]).trim() !== '');
});

console.log(`Total de registros con al menos un archivo: ${withAttachments.length} de ${data.length}`);

// Mostrar distribución de tipos de archivos
console.log('\n📈 Distribución de archivos:');
const distribution = {};
data.forEach(row => {
  let count = 0;
  attachmentColumns.forEach(col => {
    if (row[col] && String(row[col]).trim() !== '') {
      count++;
    }
  });
  if (count > 0) {
    distribution[count] = (distribution[count] || 0) + 1;
  }
});

Object.entries(distribution)
  .sort((a, b) => Number(a[0]) - Number(b[0]))
  .forEach(([count, total]) => {
    console.log(`  ${count} archivos: ${total} registros`);
  });

// Analizar formato de URLs
console.log('\n🔗 Analizando formato de URLs:');
const sampleUrls = [];
data.forEach(row => {
  attachmentColumns.forEach(col => {
    if (row[col] && String(row[col]).trim() !== '' && sampleUrls.length < 5) {
      sampleUrls.push({
        ci: row['CI'],
        type: col,
        url: String(row[col])
      });
    }
  });
});

sampleUrls.forEach((sample, idx) => {
  console.log(`\n${idx + 1}. CI: ${sample.ci}`);
  console.log(`   Tipo: ${sample.type}`);
  console.log(`   URL: ${sample.url}`);

  // Detectar tipo de URL
  if (sample.url.includes('drive.google.com')) {
    console.log(`   🔍 Formato: Google Drive`);
  } else if (sample.url.includes('appsheet.com')) {
    console.log(`   🔍 Formato: AppSheet`);
  } else if (sample.url.includes('http')) {
    console.log(`   🔍 Formato: URL HTTP genérica`);
  } else {
    console.log(`   🔍 Formato: Texto/Otro (no es URL)`);
  }
});
