// Script para explorar el Excel histórico y encontrar datos de laboratorio
const XLSX = require('xlsx');
const path = require('path');

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

console.log('📖 Leyendo archivo Excel:', excelPath);

try {
  const workbook = XLSX.readFile(excelPath);

  console.log('\n📊 Hojas disponibles:');
  workbook.SheetNames.forEach((name, index) => {
    const sheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const rowCount = data.filter(row => row.some(cell => cell !== undefined && cell !== '')).length;
    console.log(`  ${index + 1}. ${name} (${rowCount} filas)`);
  });

  // Buscar hojas relacionadas con laboratorio o evaluación preop
  const labRelatedSheets = workbook.SheetNames.filter(name =>
    name.toLowerCase().includes('lab') ||
    name.toLowerCase().includes('preop') ||
    name.toLowerCase().includes('evaluacion') ||
    name.toLowerCase().includes('hemograma') ||
    name.toLowerCase().includes('bioquimica')
  );

  if (labRelatedSheets.length > 0) {
    console.log('\n🔬 Hojas relacionadas con laboratorio:');
    labRelatedSheets.forEach(name => {
      console.log(`\n  📋 Hoja: ${name}`);
      const sheet = workbook.Sheets[name];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // Mostrar primeras filas (headers)
      if (data.length > 0) {
        console.log('    Columnas:', data[0]);
        console.log(`    Total de filas de datos: ${data.length - 1}`);

        // Mostrar primera fila de datos
        if (data.length > 1) {
          console.log('    Primera fila de datos:');
          data[0].forEach((header, idx) => {
            if (data[1][idx]) {
              console.log(`      ${header}: ${data[1][idx]}`);
            }
          });
        }
      }
    });
  }

  // Explorar todas las hojas para encontrar columnas relacionadas con labs
  console.log('\n🔍 Buscando columnas relacionadas con laboratorio en todas las hojas:');
  const labKeywords = ['hemoglobin', 'hematocrito', 'plaquetas', 'inr', 'creatinin', 'bilirrub',
                       'albumin', 'sodio', 'potasio', 'glucos', 'sgot', 'sgpt', 'ast', 'alt',
                       'fibrinog', 'azotemia', 'hb', 'hto', 'plt', 'ecg', 'tomografia', 'peg'];

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (data.length > 0) {
      const headers = data[0].map(h => String(h).toLowerCase());
      const matchedCols = headers.filter(h =>
        labKeywords.some(keyword => h.includes(keyword))
      );

      if (matchedCols.length > 0) {
        console.log(`\n  ${sheetName}:`);
        console.log(`    Columnas encontradas: ${matchedCols.join(', ')}`);
      }
    }
  });

  // Buscar hojas con URLs de archivos adjuntos
  console.log('\n🖼️  Buscando columnas con URLs de archivos/imágenes:');
  const urlKeywords = ['url', 'imagen', 'image', 'archivo', 'file', 'adjunto', 'attach', 'link'];

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (data.length > 0) {
      const headers = data[0];
      const urlCols = headers.filter((h, idx) => {
        const headerStr = String(h).toLowerCase();
        return urlKeywords.some(keyword => headerStr.includes(keyword));
      });

      if (urlCols.length > 0) {
        console.log(`\n  ${sheetName}:`);
        console.log(`    Columnas con URLs: ${urlCols.join(', ')}`);

        // Mostrar ejemplo de URL si existe
        const urlColIndices = urlCols.map(col => headers.indexOf(col));
        if (data.length > 1 && urlColIndices.length > 0) {
          urlColIndices.forEach(idx => {
            if (data[1][idx]) {
              console.log(`      Ejemplo (${headers[idx]}): ${data[1][idx]}`);
            }
          });
        }
      }
    }
  });

} catch (error) {
  console.error('❌ Error al leer el archivo:', error.message);
  process.exit(1);
}
