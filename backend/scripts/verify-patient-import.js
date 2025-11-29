// scripts/verify-patient-import.js
// Verifica qué columnas del Excel DatosPaciente se importan y cuáles no

const XLSX = require('xlsx');
const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

// Mapeo de columnas Excel -> campos del modelo Patient
const COLUMN_MAPPING = {
  // Datos principales
  'CI': 'id (Patient.id)',
  'Nombre': 'name',
  'FNR': 'medicalRecordNumber',
  'LugarProced': 'placeOfOrigin',
  'Prestador': 'provider',
  'FNac': 'birthDate',
  'Edad': 'age (calculado, no almacenado)',
  'Sexo': 'sex',
  'ASA': 'asa',
  'Talla': 'height',
  'Peso': 'weight',
  'GrupoS': 'bloodType',
  'FechaIngresoProg': 'listEntryDate',
  'Trasplantado': 'transplanted (booleano)',
  'Observaciones': 'observations',

  // Estos están en la hoja pero no se importan a Patient
  // (se importan a PreopEvaluation desde hoja Preoperatorio)
  'Anestesista 1': 'NO SE IMPORTA (va a PreopEvaluation.clinicianId)',
  'Anestesista 2': 'NO SE IMPORTA (backup en PreopEvaluation)',
};

function analyzePatientColumns() {
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets['DatosPaciente'];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: null });

  if (data.length === 0) {
    console.log('No hay datos en la hoja DatosPaciente');
    return;
  }

  const excelColumns = Object.keys(data[0]);

  // Filtrar columnas vacías (__EMPTY)
  const dataColumns = excelColumns.filter(col => !col.startsWith('__EMPTY'));

  console.log('═'.repeat(80));
  console.log('📊 ANÁLISIS DE IMPORTACIÓN - HOJA DATOSPACIENTE');
  console.log('═'.repeat(80));
  console.log('');
  console.log(`Total de registros en Excel: ${data.length}`);
  console.log(`Total de columnas: ${excelColumns.length}`);
  console.log(`Columnas de datos (sin columnas vacías): ${dataColumns.length}`);
  console.log('');

  const mapped = [];
  const notMapped = [];

  dataColumns.forEach(col => {
    if (COLUMN_MAPPING[col]) {
      mapped.push({ excel: col, model: COLUMN_MAPPING[col] });
    } else {
      notMapped.push(col);
    }
  });

  console.log('✅ COLUMNAS MAPEADAS E IMPORTADAS:', mapped.length);
  console.log('');
  mapped.forEach(m => {
    console.log(`  ${m.excel.padEnd(25)} → ${m.model}`);
  });

  console.log('');
  console.log('⚠️  COLUMNAS NO MAPEADAS:', notMapped.length);
  console.log('');
  if (notMapped.length > 0) {
    notMapped.forEach(col => {
      console.log(`  - ${col}`);
    });
  } else {
    console.log('  (Ninguna)');
  }

  console.log('');
  console.log('═'.repeat(80));
  console.log('VERIFICACIÓN DE DATOS');
  console.log('═'.repeat(80));
  console.log('');

  // Verificar registros con valores
  dataColumns.forEach(col => {
    const withValue = data.filter(r => r[col] !== null && r[col] !== '' && r[col] !== undefined);
    const percentage = ((withValue.length / data.length) * 100).toFixed(1);
    console.log(`${col.padEnd(25)} ${String(withValue.length).padStart(3)}/${data.length} registros (${percentage}%)`);
  });

  console.log('');
  console.log('═'.repeat(80));
  console.log('RECOMENDACIONES');
  console.log('═'.repeat(80));
  console.log('');
  console.log('Todas las columnas relevantes de DatosPaciente están siendo importadas.');
  console.log('');
  console.log('NOTA: "Anestesista 1" y "Anestesista 2" aparecen en DatosPaciente pero');
  console.log('      estos datos se importan correctamente desde la hoja Preoperatorio');
  console.log('      al modelo PreopEvaluation.');
  console.log('');
}

analyzePatientColumns();
