// scripts/verify-preop-import.js
// Verifica qué columnas del Excel Preoperatorio se importan y cuáles no

const XLSX = require('xlsx');
const excelPath = '/home/william-baptista/TxH/Documentacion desarrollo/Tablas Sistema Registro.xlsx';

// Mapeo de columnas Excel -> campos del modelo
const COLUMN_MAPPING = {
  // Datos principales
  'CI': 'patientId',
  'Fecha': 'evaluationDate',
  'MELD': 'meld',
  'MELDe': 'meldNa',
  'Child': 'child',
  'Etiologia1': 'etiology1',
  'Etiologia2': 'etiology2',
  'Fulminante': 'isFulminant',
  'Anestesista 1': 'clinicianId',
  'Anestesista 2': 'clinicianId (backup)',

  // Examen físico
  'MPT': 'mpt',
  'AperturaBucal': 'mouthOpening',
  'ExFisicoObs': 'physicalExamObs',

  // Complicaciones de cirrosis
  'SndHepatorenal': 'hepatoRenalSyndrome',
  'SindHepatoPulmonar': 'hepatoPulmonarySyndr',
  'HTPulmonar': 'pulmonaryHypertension',
  'HTPortal': 'portalHypertension',
  'Ascitis': 'ascites',
  'Hidrotorax': 'hydrothorax',
  'PBE': 'sbe',
  'TrobosisP': 'portalThrombosis',
  'VaricesEsof': 'esophagealVarices',
  'Encefalopatia': 'encephalopathy',
  'Hepatocarcinoma': 'hepatocarcinoma',
  'Sangrado': 'bleeding',
  'Hiponatremia': 'hyponatremia',
  'ObsComplicaciones': 'complicationsObs',

  // Comorbilidades
  'Puerperio': 'pregnancy',
  'IRenal': 'renalFailure',
  'Monorreno': 'singleKidney',
  'EnfCoronaria': 'coronaryDisease',
  'HTA': 'hypertension',
  'Valvulopatia': 'valvulopathy',
  'Valvulopatia2': 'valvulopathy (concat)',
  'Valvulopatia3': 'valvulopathy (concat)',
  'ArritmiaMarcapaso': 'arrhythmia',
  'CardiopDilatada': 'dilatedCardio',
  'CardiopHTA': 'hypertensiveCardio',
  'Fumador/EPOC': 'smokerCOPD',
  'ASMA': 'asthma',
  'Diabetes': 'diabetes',
  'DisfTiroidea': 'thyroidDysfunction',
  'CirugiaAbdominal': 'previousAbdSurgery',
  'CirAbdominalDetalle': 'abdSurgeryDetail',
  'RGEUlcus': 'refluxUlcer',
  'Alergias': 'allergies',

  // Estado funcional
  'ARM': 'mechanicalVent',
  'MedicacionHabitual': 'habitualMeds',

  // Decisión
  'IngresaLista': 'inList',
  'CausaNoIngreso': 'reasonNotInList',
  'Problemas': 'problems',

  // Laboratorios (tabla separada PreopLabs)
  'FechaLaboratorio': 'PreopLabs.labDate',
  'Hb': 'PreopLabs.hb',
  'Hto': 'PreopLabs.hto',
  'Plaquetas': 'PreopLabs.platelets',
  'TP': 'PreopLabs.pt',
  'INR': 'PreopLabs.inr',
  'Fib': 'PreopLabs.fibrinogen',
  'Glicemia': 'PreopLabs.glucose',
  'Na': 'PreopLabs.sodium',
  'K': 'PreopLabs.potassium',
  'CaIonico': 'PreopLabs.ionicCalcium',
  'Mg': 'PreopLabs.magnesium',
  'Azo': 'PreopLabs.azotemia',
  'Crea': 'PreopLabs.creatinine',
  'IFG': 'PreopLabs.gfr',
  'TGO': 'PreopLabs.sgot',
  'TGP': 'PreopLabs.sgpt',
  'Btotal': 'PreopLabs.totalBili',
  'Albumina': 'PreopLabs.albumin',
  'TSH': 'PreopLabs.tsh',

  // Estudios (tabla separada PreopAttachment)
  'ECG': 'PreopAttachment',
  'ECoCardio': 'PreopAttachment',
  'Informe Eco': 'PreopAttachment',
  'EstudioFuncional': 'PreopAttachment',
  'Informe Est Funcional': 'PreopAttachment',
  'RxTx': 'PreopAttachment',
  'Fresp': 'PreopAttachment',
  'Informe F.Resp': 'PreopAttachment',
  'Informe CACG 1': 'PreopAttachment',
  'Informe CACG 2': 'PreopAttachment',
  'Informe AngioTAC C 1': 'PreopAttachment',
  'Informe AngioTAC C 2': 'PreopAttachment',
  'ExamCompOtros': 'PreopAttachment',
  'Informes Otros 1': 'PreopAttachment',
  'Informes Otros 2': 'PreopAttachment',
};

function analyzePreopColumns() {
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets['Preoperatorio'];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: null });

  if (data.length === 0) {
    console.log('No hay datos en la hoja Preoperatorio');
    return;
  }

  const excelColumns = Object.keys(data[0]);

  // Filtrar columnas de "Página X"
  const dataColumns = excelColumns.filter(col => !col.startsWith('Pagina') && !col.startsWith('Página'));

  console.log('═'.repeat(80));
  console.log('📊 ANÁLISIS DE IMPORTACIÓN - HOJA PREOPERATORIO');
  console.log('═'.repeat(80));
  console.log('');
  console.log(`Total de columnas: ${excelColumns.length}`);
  console.log(`Columnas de datos (sin "Página"): ${dataColumns.length}`);
  console.log('');

  const mapped = [];
  const notMapped = [];
  const missingInModel = [];

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
    console.log(`  ${m.excel.padEnd(30)} → ${m.model}`);
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

  // Campos en el modelo que no están en el Excel
  const modelFields = [
    'functionalClass', // ClaseFuncional existe en Excel pero no está mapeado
  ];

  console.log('');
  console.log('❌ CAMPOS DEL MODELO SIN MAPEAR DESDE EXCEL:');
  console.log('');
  console.log('  - functionalClass (existe como "ClaseFuncional" en Excel pero NO SE IMPORTA)');

  console.log('');
  console.log('═'.repeat(80));
  console.log('RECOMENDACIONES:');
  console.log('═'.repeat(80));
  console.log('');

  if (notMapped.includes('ClaseFuncional')) {
    console.log('1. FALTA IMPORTAR: ClaseFuncional → functionalClass');
    console.log('   Esta columna existe en el Excel pero no se está importando.');
  }

  if (notMapped.includes('ObsComorbilidades')) {
    console.log('2. COLUMNA SIN CAMPO EN MODELO: ObsComorbilidades');
    console.log('   Considerar agregar un campo "comorbiditiesObs" al modelo.');
  }

  if (notMapped.includes('Retraspalnte')) {
    console.log('3. COLUMNA LEGACY: Retraspalnte (probablemente mal escrito)');
    console.log('   Revisar si debe importarse o es dato legacy.');
  }

  console.log('');
}

analyzePreopColumns();
