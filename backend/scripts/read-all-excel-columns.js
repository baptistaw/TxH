// scripts/read-all-excel-columns.js
// Leer TODAS las columnas del Excel, incluso las que están muy a la derecha
const XLSX = require('xlsx');

const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

function readAllColumns() {
  console.log('\n📊 LEYENDO TODAS LAS COLUMNAS DEL EXCEL (INCLUYENDO COLUMNAS LEJANAS)\n');
  console.log('='.repeat(80));

  try {
    const workbook = XLSX.readFile(excelPath);

    // Analizar IntraopAnhep (donde mencionaste que hay datos desde columna BO)
    console.log('\n📄 HOJA: IntraopAnhep\n');

    const sheet = workbook.Sheets['IntraopAnhep'];

    if (!sheet) {
      console.log('❌ Hoja no encontrada\n');
      return;
    }

    // Obtener el rango completo de la hoja
    const range = XLSX.utils.decode_range(sheet['!ref']);
    console.log(`Rango de la hoja: ${sheet['!ref']}`);
    console.log(`Columnas: de ${XLSX.utils.encode_col(range.s.c)} a ${XLSX.utils.encode_col(range.e.c)}`);
    console.log(`Filas: ${range.s.r + 1} a ${range.e.r + 1}\n`);

    // Leer encabezados (fila 1)
    console.log('📋 ENCABEZADOS DE TODAS LAS COLUMNAS:\n');

    const headers = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
      const cell = sheet[cellAddress];
      const header = cell ? cell.v : '(vacío)';
      headers.push({ col: XLSX.utils.encode_col(col), header });

      // Mostrar todas las columnas
      if (col < 70 || col >= range.e.c - 10) {
        console.log(`   ${XLSX.utils.encode_col(col).padEnd(4)} : ${header}`);
      } else if (col === 70) {
        console.log(`   ... (columnas intermedias omitidas) ...`);
      }
    }

    // Buscar la columna "Paraclinica"
    console.log('\n' + '='.repeat(80));
    console.log('\n🔍 BUSCANDO COLUMNA "Paraclinica":\n');

    const paraclinicaCol = headers.find(h =>
      h.header && h.header.toString().toLowerCase().includes('paraclinica')
    );

    if (paraclinicaCol) {
      console.log(`✓ Encontrada en columna: ${paraclinicaCol.col}`);

      // Buscar qué columnas vienen después
      const colIndex = headers.findIndex(h => h.col === paraclinicaCol.col);
      console.log(`\n📊 Columnas DESPUÉS de "Paraclinica":\n`);

      for (let i = colIndex; i < Math.min(colIndex + 30, headers.length); i++) {
        const h = headers[i];
        if (h.header && h.header !== '(vacío)') {
          console.log(`   ${h.col.padEnd(4)} : ${h.header}`);
        }
      }
    } else {
      console.log('❌ No se encontró columna "Paraclinica"');
    }

    // Leer un registro de ejemplo con TODAS las columnas
    console.log('\n' + '='.repeat(80));
    console.log('\n📋 EJEMPLO DE REGISTRO (fila 2) - TODAS LAS COLUMNAS:\n');

    if (range.e.r >= 1) {
      const ejemplo = {};
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 1, c: col });
        const cell = sheet[cellAddress];
        const header = headers[col - range.s.c].header;
        const value = cell ? cell.v : null;

        if (value !== null && header !== '(vacío)') {
          ejemplo[header] = value;
        }
      }

      // Mostrar solo campos de laboratorio
      console.log('Campos de laboratorio encontrados:');
      Object.entries(ejemplo).forEach(([key, value]) => {
        const keyLower = key.toLowerCase();
        if (keyLower.includes('hb') || keyLower.includes('hto') || keyLower.includes('plaq') ||
            keyLower.includes('na') || keyLower.includes('k') || keyLower.includes('ca') ||
            keyLower.includes('ph') || keyLower.includes('pao2') || keyLower.includes('paco2') ||
            keyLower.includes('gluc') || keyLower.includes('lact') || keyLower.includes('creat') ||
            keyLower.includes('inr') || keyLower.includes('tp') || keyLower.includes('fibri')) {
          console.log(`   ${key.padEnd(30)} : ${value}`);
        }
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✓ Análisis completado\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  }
}

readAllColumns();
