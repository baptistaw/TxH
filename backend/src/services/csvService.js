// backend/src/services/csvService.js
/**
 * CSV Export Service
 * Exports case data to CSV format for analysis and reporting
 * Includes data dictionary generation
 */

const prisma = require('../lib/prisma');
const { Parser } = require('json2csv');

// ============================================================================
// DATA DICTIONARY - Definitions for all exported variables
// ============================================================================

const DATA_DICTIONARY = {
  // ============================================================================
  // PATIENT - Datos del Paciente
  // ============================================================================
  'CI': {
    category: 'Paciente',
    description: 'Cédula de Identidad uruguaya (formato: X.XXX.XXX-X)',
    type: 'String',
    example: '1.234.567-8',
  },
  'CI_Raw': {
    category: 'Paciente',
    description: 'Cédula de Identidad en formato original (sin formatear)',
    type: 'String',
    example: '12345678',
  },
  'Nombre_Completo': {
    category: 'Paciente',
    description: 'Nombre completo del paciente',
    type: 'String',
    example: 'Juan Pérez García',
  },
  'Fecha_Nacimiento': {
    category: 'Paciente',
    description: 'Fecha de nacimiento del paciente',
    type: 'Date (YYYY-MM-DD)',
    example: '1965-03-15',
  },
  'Edad': {
    category: 'Paciente',
    description: 'Edad del paciente en años al momento del trasplante',
    type: 'Integer',
    unit: 'años',
    example: '58',
  },
  'Sexo': {
    category: 'Paciente',
    description: 'Sexo biológico del paciente',
    type: 'Enum',
    values: ['M = Masculino', 'F = Femenino', 'O = Otro/No especificado'],
    example: 'M',
  },
  'Prestador': {
    category: 'Paciente',
    description: 'Institución de salud (mutualista o ASSE)',
    type: 'Enum',
    values: ['ASSE', 'CASMU', 'SMI', 'MUCAM', 'etc.'],
    example: 'CASMU',
  },
  'Procedencia': {
    category: 'Paciente',
    description: 'Lugar de procedencia del paciente (departamento/localidad)',
    type: 'String',
    example: 'Montevideo',
  },
  'Grupo_Sanguineo': {
    category: 'Paciente',
    description: 'Grupo sanguíneo y factor Rh',
    type: 'String',
    values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    example: 'O+',
  },
  'Peso_kg': {
    category: 'Paciente',
    description: 'Peso corporal del paciente',
    type: 'Float',
    unit: 'kg',
    example: '72.5',
  },
  'Talla_cm': {
    category: 'Paciente',
    description: 'Altura del paciente',
    type: 'Float',
    unit: 'cm',
    example: '175',
  },
  'ASA': {
    category: 'Paciente',
    description: 'Clasificación ASA (American Society of Anesthesiologists)',
    type: 'Enum',
    values: ['I = Paciente sano', 'II = Enfermedad sistémica leve', 'III = Enfermedad sistémica grave', 'IV = Enfermedad sistémica que amenaza la vida', 'V = Paciente moribundo', 'VI = Muerte cerebral (donante)'],
    example: 'III',
  },

  // ============================================================================
  // CASE - Datos del Caso/Trasplante
  // ============================================================================
  'ID_Caso': {
    category: 'Caso',
    description: 'Identificador único del caso de trasplante',
    type: 'String (CUID)',
    example: 'clxx123abc456',
  },
  'Fecha_Inicio': {
    category: 'Caso',
    description: 'Fecha y hora de inicio del procedimiento quirúrgico',
    type: 'DateTime',
    example: '2024-01-15',
  },
  'Hora_Inicio': {
    category: 'Caso',
    description: 'Hora de inicio del procedimiento',
    type: 'Time (HH:MM)',
    example: '08:30',
  },
  'Fecha_Fin': {
    category: 'Caso',
    description: 'Fecha y hora de fin del procedimiento quirúrgico',
    type: 'DateTime',
    example: '2024-01-15',
  },
  'Hora_Fin': {
    category: 'Caso',
    description: 'Hora de finalización del procedimiento',
    type: 'Time (HH:MM)',
    example: '18:45',
  },
  'Anio': {
    category: 'Caso',
    description: 'Año del trasplante',
    type: 'Integer',
    example: '2024',
  },
  'Duracion_min': {
    category: 'Caso',
    description: 'Duración total del procedimiento quirúrgico',
    type: 'Integer',
    unit: 'minutos',
    example: '615',
  },
  'Es_Retrasplante': {
    category: 'Caso',
    description: 'Indica si es un retrasplante (segundo o más trasplante)',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Hepato_Renal': {
    category: 'Caso',
    description: 'Trasplante hepato-renal simultáneo',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Donante_Optimo': {
    category: 'Caso',
    description: 'Indica si el donante cumple criterios de donante óptimo',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'Procedencia_Caso': {
    category: 'Caso',
    description: 'Lugar de procedencia del paciente al momento del trasplante',
    type: 'String',
    values: ['Domicilio', 'CTI', 'Sala', 'Block quirúrgico'],
    example: 'Domicilio',
  },
  'Tiempo_Isquemia_Fria_min': {
    category: 'Caso',
    description: 'Tiempo de isquemia fría del injerto (desde clampeo en donante hasta reperfusión)',
    type: 'Integer',
    unit: 'minutos',
    example: '420',
  },
  'Tiempo_Isquemia_Caliente_min': {
    category: 'Caso',
    description: 'Tiempo de isquemia caliente (fase anhepática)',
    type: 'Integer',
    unit: 'minutos',
    example: '45',
  },
  'Origen_Datos': {
    category: 'Caso',
    description: 'Origen de los datos para estudios retrospectivos',
    type: 'Enum',
    values: ['EXCEL_PRE_2019 = Datos precarios', 'APPSHEET = Datos 2019-2024', 'PLATFORM = Datos completos 2024+'],
    example: 'PLATFORM',
  },

  // ============================================================================
  // PREOP - Evaluación Preoperatoria
  // ============================================================================
  'MELD': {
    category: 'Preoperatorio',
    description: 'Model for End-Stage Liver Disease - Score de gravedad de hepatopatía',
    type: 'Integer',
    range: '6-40',
    interpretation: 'Mayor valor = mayor gravedad y prioridad en lista',
    example: '25',
  },
  'MELD_Na': {
    category: 'Preoperatorio',
    description: 'MELD con corrección por sodio sérico',
    type: 'Integer',
    range: '6-40',
    interpretation: 'Incluye hiponatremia como factor pronóstico',
    example: '28',
  },
  'Child_Pugh': {
    category: 'Preoperatorio',
    description: 'Clasificación Child-Pugh de cirrosis',
    type: 'Enum',
    values: ['A = Cirrosis compensada (5-6 puntos)', 'B = Compromiso funcional significativo (7-9 puntos)', 'C = Cirrosis descompensada (10-15 puntos)'],
    example: 'C',
  },
  'Etiologia_1': {
    category: 'Preoperatorio',
    description: 'Etiología primaria de la hepatopatía',
    type: 'String',
    values: ['HVC = Hepatitis C', 'HVB = Hepatitis B', 'OH = Alcohólica', 'NASH = Esteatohepatitis no alcohólica', 'HAI = Hepatitis autoinmune', 'CBP = Cirrosis biliar primaria', 'CEP = Colangitis esclerosante primaria', 'Criptogénica', 'Wilson', 'Hemocromatosis'],
    example: 'HVC',
  },
  'Etiologia_2': {
    category: 'Preoperatorio',
    description: 'Etiología secundaria de la hepatopatía (si existe)',
    type: 'String',
    example: 'Hepatocarcinoma',
  },
  'Fecha_Evaluacion_Preop': {
    category: 'Preoperatorio',
    description: 'Fecha de la evaluación preoperatoria anestésica',
    type: 'Date',
    example: '2024-01-10',
  },
  'Falla_Hepatica_Fulminante': {
    category: 'Preoperatorio',
    description: 'Insuficiencia hepática aguda fulminante',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },

  // Complicaciones de la cirrosis
  'Sindrome_Hepatorenal': {
    category: 'Preoperatorio - Complicaciones',
    description: 'Síndrome hepatorenal (insuficiencia renal funcional)',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'Sindrome_Hepatopulmonar': {
    category: 'Preoperatorio - Complicaciones',
    description: 'Síndrome hepatopulmonar (shunt intrapulmonar)',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'HT_Pulmonar': {
    category: 'Preoperatorio - Complicaciones',
    description: 'Hipertensión pulmonar portopulmonar',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'HT_Portal': {
    category: 'Preoperatorio - Complicaciones',
    description: 'Hipertensión portal',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'Ascitis': {
    category: 'Preoperatorio - Complicaciones',
    description: 'Presencia de ascitis',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'Hidrotorax': {
    category: 'Preoperatorio - Complicaciones',
    description: 'Hidrotórax hepático',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Varices_Esofagicas': {
    category: 'Preoperatorio - Complicaciones',
    description: 'Várices esofágicas por hipertensión portal',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'Encefalopatia': {
    category: 'Preoperatorio - Complicaciones',
    description: 'Encefalopatía hepática',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'Sangrado_Previo': {
    category: 'Preoperatorio - Complicaciones',
    description: 'Antecedente de sangrado digestivo',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Hiponatremia': {
    category: 'Preoperatorio - Complicaciones',
    description: 'Hiponatremia (Na < 135 mEq/L)',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'PBE': {
    category: 'Preoperatorio - Complicaciones',
    description: 'Peritonitis bacteriana espontánea',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Trombosis_Portal': {
    category: 'Preoperatorio - Complicaciones',
    description: 'Trombosis de vena porta',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Hepatocarcinoma': {
    category: 'Preoperatorio - Complicaciones',
    description: 'Hepatocarcinoma (CHC)',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },

  // Comorbilidades
  'Cardiopatia_Coronaria': {
    category: 'Preoperatorio - Comorbilidades',
    description: 'Enfermedad coronaria',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'HTA': {
    category: 'Preoperatorio - Comorbilidades',
    description: 'Hipertensión arterial sistémica',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'Valvulopatia': {
    category: 'Preoperatorio - Comorbilidades',
    description: 'Tipo de valvulopatía cardíaca',
    type: 'String',
    example: 'Insuficiencia mitral leve',
  },
  'Arritmia': {
    category: 'Preoperatorio - Comorbilidades',
    description: 'Antecedente de arritmia cardíaca',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Miocardiopatia_Dilatada': {
    category: 'Preoperatorio - Comorbilidades',
    description: 'Miocardiopatía dilatada',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Cardiopatia_Hipertensiva': {
    category: 'Preoperatorio - Comorbilidades',
    description: 'Cardiopatía hipertensiva',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'EPOC_Tabaquismo': {
    category: 'Preoperatorio - Comorbilidades',
    description: 'EPOC o tabaquismo activo',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Asma': {
    category: 'Preoperatorio - Comorbilidades',
    description: 'Asma bronquial',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Insuficiencia_Renal': {
    category: 'Preoperatorio - Comorbilidades',
    description: 'Insuficiencia renal crónica previa',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Monorreno': {
    category: 'Preoperatorio - Comorbilidades',
    description: 'Paciente monorreno',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Diabetes': {
    category: 'Preoperatorio - Comorbilidades',
    description: 'Diabetes mellitus',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'Disfuncion_Tiroidea': {
    category: 'Preoperatorio - Comorbilidades',
    description: 'Disfunción tiroidea (hipo/hipertiroidismo)',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Cirugia_Abdominal_Previa': {
    category: 'Preoperatorio - Comorbilidades',
    description: 'Antecedente de cirugía abdominal',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'Detalle_Cirugia_Previa': {
    category: 'Preoperatorio - Comorbilidades',
    description: 'Detalle de cirugías abdominales previas',
    type: 'String',
    example: 'Colecistectomía 2015',
  },
  'RGE_Ulcera': {
    category: 'Preoperatorio - Comorbilidades',
    description: 'Reflujo gastroesofágico o úlcera péptica',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Alergias': {
    category: 'Preoperatorio - Comorbilidades',
    description: 'Alergias conocidas a medicamentos u otros',
    type: 'String',
    example: 'Penicilina',
  },
  'Clase_Funcional': {
    category: 'Preoperatorio',
    description: 'Clase funcional NYHA',
    type: 'Enum',
    values: ['I = Sin limitación', 'II = Limitación leve', 'III = Limitación marcada', 'IV = Incapacidad', 'No evaluable', 'Pendiente'],
    example: 'II',
  },
  'ARM_Previo': {
    category: 'Preoperatorio',
    description: 'Paciente en asistencia respiratoria mecánica previa al trasplante',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Medicacion_Habitual': {
    category: 'Preoperatorio',
    description: 'Medicación habitual del paciente',
    type: 'String',
    example: 'Furosemida, Espironolactona, Lactulosa',
  },

  // Examen físico preop
  'Mallampati': {
    category: 'Preoperatorio - Vía Aérea',
    description: 'Clasificación de Mallampati para vía aérea',
    type: 'Enum',
    values: ['I', 'II', 'III', 'IV'],
    example: 'II',
  },
  'Apertura_Bucal': {
    category: 'Preoperatorio - Vía Aérea',
    description: 'Apertura bucal (distancia interincisiva)',
    type: 'String',
    example: '>3cm',
  },

  // ============================================================================
  // PREOP LABS - Laboratorios Preoperatorios
  // ============================================================================
  'Preop_Hb': {
    category: 'Laboratorio Preoperatorio',
    description: 'Hemoglobina preoperatoria',
    type: 'Float',
    unit: 'g/dL',
    range: '12-16 (normal)',
    example: '10.5',
  },
  'Preop_Hto': {
    category: 'Laboratorio Preoperatorio',
    description: 'Hematocrito preoperatorio',
    type: 'Float',
    unit: '%',
    range: '36-48 (normal)',
    example: '32',
  },
  'Preop_Plaquetas': {
    category: 'Laboratorio Preoperatorio',
    description: 'Recuento de plaquetas preoperatorio',
    type: 'Float',
    unit: '10³/µL',
    range: '150-400 (normal)',
    example: '85',
  },
  'Preop_TP': {
    category: 'Laboratorio Preoperatorio',
    description: 'Tiempo de protrombina preoperatorio',
    type: 'Float',
    unit: 'segundos',
    range: '10-14 (normal)',
    example: '18.5',
  },
  'Preop_INR': {
    category: 'Laboratorio Preoperatorio',
    description: 'INR (International Normalized Ratio) preoperatorio',
    type: 'Float',
    range: '0.8-1.2 (normal)',
    example: '1.8',
  },
  'Preop_Fibrinogeno': {
    category: 'Laboratorio Preoperatorio',
    description: 'Fibrinógeno preoperatorio',
    type: 'Float',
    unit: 'mg/dL',
    range: '200-400 (normal)',
    example: '120',
  },
  'Preop_Glicemia': {
    category: 'Laboratorio Preoperatorio',
    description: 'Glicemia preoperatoria',
    type: 'Float',
    unit: 'mg/dL',
    range: '70-100 (normal ayunas)',
    example: '95',
  },
  'Preop_Sodio': {
    category: 'Laboratorio Preoperatorio',
    description: 'Sodio sérico preoperatorio',
    type: 'Float',
    unit: 'mEq/L',
    range: '135-145 (normal)',
    example: '132',
  },
  'Preop_Potasio': {
    category: 'Laboratorio Preoperatorio',
    description: 'Potasio sérico preoperatorio',
    type: 'Float',
    unit: 'mEq/L',
    range: '3.5-5.0 (normal)',
    example: '4.2',
  },
  'Preop_Calcio_Ionico': {
    category: 'Laboratorio Preoperatorio',
    description: 'Calcio iónico preoperatorio',
    type: 'Float',
    unit: 'mmol/L',
    range: '1.12-1.32 (normal)',
    example: '1.15',
  },
  'Preop_Magnesio': {
    category: 'Laboratorio Preoperatorio',
    description: 'Magnesio sérico preoperatorio',
    type: 'Float',
    unit: 'mEq/L',
    range: '1.5-2.5 (normal)',
    example: '1.8',
  },
  'Preop_Urea': {
    category: 'Laboratorio Preoperatorio',
    description: 'Urea/BUN preoperatorio',
    type: 'Float',
    unit: 'mg/dL',
    range: '7-20 (normal)',
    example: '45',
  },
  'Preop_Creatinina': {
    category: 'Laboratorio Preoperatorio',
    description: 'Creatinina sérica preoperatoria',
    type: 'Float',
    unit: 'mg/dL',
    range: '0.7-1.3 (normal)',
    example: '1.8',
  },
  'Preop_IFG': {
    category: 'Laboratorio Preoperatorio',
    description: 'Índice de filtrado glomerular preoperatorio',
    type: 'Float',
    unit: 'mL/min/1.73m²',
    range: '>90 (normal)',
    example: '45',
  },
  'Preop_TGO': {
    category: 'Laboratorio Preoperatorio',
    description: 'TGO/AST preoperatorio',
    type: 'Float',
    unit: 'U/L',
    range: '10-40 (normal)',
    example: '85',
  },
  'Preop_TGP': {
    category: 'Laboratorio Preoperatorio',
    description: 'TGP/ALT preoperatorio',
    type: 'Float',
    unit: 'U/L',
    range: '7-56 (normal)',
    example: '72',
  },
  'Preop_Bilirrubina_Total': {
    category: 'Laboratorio Preoperatorio',
    description: 'Bilirrubina total preoperatoria',
    type: 'Float',
    unit: 'mg/dL',
    range: '0.1-1.2 (normal)',
    example: '8.5',
  },
  'Preop_Albumina': {
    category: 'Laboratorio Preoperatorio',
    description: 'Albúmina sérica preoperatoria',
    type: 'Float',
    unit: 'g/dL',
    range: '3.5-5.0 (normal)',
    example: '2.8',
  },
  'Preop_TSH': {
    category: 'Laboratorio Preoperatorio',
    description: 'TSH preoperatorio',
    type: 'Float',
    unit: 'µUI/mL',
    range: '0.4-4.0 (normal)',
    example: '2.1',
  },

  // ============================================================================
  // LINES & MONITORING - Líneas y Monitoreo
  // ============================================================================
  'CVC_1': {
    category: 'Monitoreo - Accesos',
    description: 'Primer catéter venoso central',
    type: 'String',
    example: 'Yugular derecha 3 lúmenes',
  },
  'CVC_2': {
    category: 'Monitoreo - Accesos',
    description: 'Segundo catéter venoso central',
    type: 'String',
    example: 'Subclavia izquierda MAC',
  },
  'CVC_3': {
    category: 'Monitoreo - Accesos',
    description: 'Tercer catéter venoso central',
    type: 'String',
    example: 'Femoral derecha diálisis',
  },
  'Linea_Arterial_1': {
    category: 'Monitoreo - Accesos',
    description: 'Primera línea arterial',
    type: 'String',
    example: 'Radial derecha',
  },
  'Linea_Arterial_2': {
    category: 'Monitoreo - Accesos',
    description: 'Segunda línea arterial',
    type: 'String',
    example: 'Femoral izquierda',
  },
  'Swan_Ganz': {
    category: 'Monitoreo - Accesos',
    description: 'Catéter de arteria pulmonar (Swan-Ganz)',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'VVP': {
    category: 'Monitoreo - Accesos',
    description: 'Vía venosa periférica',
    type: 'String',
    example: '14G antebrazo derecho',
  },
  'Tipo_Via_Aerea': {
    category: 'Monitoreo - Vía Aérea',
    description: 'Tipo de vía aérea utilizada',
    type: 'Enum',
    values: ['IOT = Intubación orotraqueal', 'TQT = Traqueostomía', 'ML = Máscara laríngea', 'MF = Máscara facial'],
    example: 'IOT',
  },
  'Cormack_Lehane': {
    category: 'Monitoreo - Vía Aérea',
    description: 'Grado de Cormack-Lehane en laringoscopía',
    type: 'Enum',
    values: ['I = Glotis visible completamente', 'II = Glotis parcialmente visible', 'III = Solo epiglotis visible', 'IV = Epiglotis no visible'],
    example: 'II',
  },
  'Secuencia_Rapida': {
    category: 'Monitoreo - Vía Aérea',
    description: 'Secuencia rápida de intubación (estómago lleno)',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Tipo_Anestesia': {
    category: 'Monitoreo',
    description: 'Tipo de técnica anestésica',
    type: 'String',
    example: 'General balanceada',
  },
  'Premedicacion': {
    category: 'Monitoreo',
    description: 'Premedicación utilizada',
    type: 'String',
    example: 'Midazolam 2mg IV',
  },
  'ATB_Profilactico': {
    category: 'Monitoreo',
    description: 'Antibiótico profiláctico utilizado',
    type: 'String',
    example: 'PTZ 4.5g + Gentamicina 5mg/kg',
  },
  'Calentador': {
    category: 'Monitoreo - Equipamiento',
    description: 'Uso de calentador de fluidos (Level1, Hotline)',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'Cell_Saver': {
    category: 'Monitoreo - Equipamiento',
    description: 'Uso de recuperador de sangre (Cell Saver)',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'Vendaje_Elastico': {
    category: 'Monitoreo - Equipamiento',
    description: 'Vendaje elástico de miembros inferiores',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'Manta_Termica': {
    category: 'Monitoreo - Equipamiento',
    description: 'Uso de manta térmica',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },

  // ============================================================================
  // INTRAOP - Registros Intraoperatorios
  // ============================================================================
  'Fase': {
    category: 'Intraoperatorio',
    description: 'Fase del procedimiento quirúrgico',
    type: 'Enum',
    values: [
      'ESTADO_BASAL = Estado basal pre-quirúrgico',
      'INDUCCION = Inducción anestésica',
      'DISECCION = Disección hepática',
      'ANHEPATICA = Fase anhepática',
      'PRE_REPERFUSION = Pre-reperfusión del injerto',
      'POST_REPERFUSION = Post-reperfusión inmediata',
      'VIA_BILIAR = Anastomosis vía biliar',
      'CIERRE = Cierre de pared',
      'SALIDA_BQ = Salida de bloque quirúrgico',
    ],
    example: 'ANHEPATICA',
  },
  'Timestamp': {
    category: 'Intraoperatorio',
    description: 'Fecha y hora del registro',
    type: 'DateTime',
    example: '2024-01-15T12:30:00',
  },

  // Hemodinamia
  'FC': {
    category: 'Intraoperatorio - Hemodinamia',
    description: 'Frecuencia cardíaca',
    type: 'Integer',
    unit: 'lpm',
    range: '60-100 (normal)',
    example: '85',
  },
  'PAS': {
    category: 'Intraoperatorio - Hemodinamia',
    description: 'Presión arterial sistólica',
    type: 'Integer',
    unit: 'mmHg',
    range: '90-140 (normal)',
    example: '110',
  },
  'PAD': {
    category: 'Intraoperatorio - Hemodinamia',
    description: 'Presión arterial diastólica',
    type: 'Integer',
    unit: 'mmHg',
    range: '60-90 (normal)',
    example: '65',
  },
  'PAM': {
    category: 'Intraoperatorio - Hemodinamia',
    description: 'Presión arterial media (calculada: (PAS + 2*PAD)/3)',
    type: 'Integer',
    unit: 'mmHg',
    range: '70-105 (normal)',
    example: '80',
  },
  'PVC': {
    category: 'Intraoperatorio - Hemodinamia',
    description: 'Presión venosa central',
    type: 'Integer',
    unit: 'cmH₂O',
    range: '5-12 (normal)',
    example: '8',
  },
  'SpO2': {
    category: 'Intraoperatorio - Hemodinamia',
    description: 'Saturación de oxígeno por pulsioximetría',
    type: 'Integer',
    unit: '%',
    range: '95-100 (normal)',
    example: '98',
  },
  'EtCO2': {
    category: 'Intraoperatorio - Hemodinamia',
    description: 'CO2 al final de la espiración (End-tidal CO2)',
    type: 'Integer',
    unit: 'mmHg',
    range: '35-45 (normal)',
    example: '38',
  },
  'Temp_Periferica': {
    category: 'Intraoperatorio - Hemodinamia',
    description: 'Temperatura periférica/superficial',
    type: 'Float',
    unit: '°C',
    range: '36-37.5 (normal)',
    example: '35.8',
  },
  'Temp_Central': {
    category: 'Intraoperatorio - Hemodinamia',
    description: 'Temperatura central (esofágica/nasofaríngea)',
    type: 'Float',
    unit: '°C',
    range: '36-37.5 (normal)',
    example: '36.2',
  },

  // Swan-Ganz
  'PAPS': {
    category: 'Intraoperatorio - Swan-Ganz',
    description: 'Presión arterial pulmonar sistólica',
    type: 'Integer',
    unit: 'mmHg',
    range: '15-30 (normal)',
    example: '35',
  },
  'PAPD': {
    category: 'Intraoperatorio - Swan-Ganz',
    description: 'Presión arterial pulmonar diastólica',
    type: 'Integer',
    unit: 'mmHg',
    range: '5-15 (normal)',
    example: '18',
  },
  'PAPM': {
    category: 'Intraoperatorio - Swan-Ganz',
    description: 'Presión arterial pulmonar media',
    type: 'Integer',
    unit: 'mmHg',
    range: '10-20 (normal)',
    example: '24',
  },
  'PCP': {
    category: 'Intraoperatorio - Swan-Ganz',
    description: 'Presión capilar pulmonar (wedge)',
    type: 'Integer',
    unit: 'mmHg',
    range: '6-12 (normal)',
    example: '14',
  },
  'GC': {
    category: 'Intraoperatorio - Swan-Ganz',
    description: 'Gasto cardíaco',
    type: 'Float',
    unit: 'L/min',
    range: '4-8 (normal)',
    example: '5.2',
  },
  'SvO2': {
    category: 'Intraoperatorio - Swan-Ganz',
    description: 'Saturación venosa mixta',
    type: 'Integer',
    unit: '%',
    range: '65-75 (normal)',
    example: '68',
  },

  // Ventilación
  'Modo_Ventilatorio': {
    category: 'Intraoperatorio - Ventilación',
    description: 'Modo de ventilación mecánica',
    type: 'Enum',
    values: ['VC = Volumen controlado', 'PC = Presión controlada', 'SIMV = Ventilación sincronizada', 'PSV = Presión de soporte', 'CPAP = Presión positiva continua'],
    example: 'VC',
  },
  'FiO2': {
    category: 'Intraoperatorio - Ventilación',
    description: 'Fracción inspirada de oxígeno',
    type: 'Float',
    unit: '(0-1 o %)',
    range: '0.21-1.0',
    example: '0.5',
  },
  'Vt': {
    category: 'Intraoperatorio - Ventilación',
    description: 'Volumen tidal/corriente',
    type: 'Integer',
    unit: 'mL',
    range: '6-8 mL/kg peso ideal',
    example: '480',
  },
  'FR': {
    category: 'Intraoperatorio - Ventilación',
    description: 'Frecuencia respiratoria',
    type: 'Integer',
    unit: 'rpm',
    range: '12-20 (normal)',
    example: '14',
  },
  'PEEP': {
    category: 'Intraoperatorio - Ventilación',
    description: 'Presión positiva al final de la espiración',
    type: 'Integer',
    unit: 'cmH₂O',
    range: '5-10 (habitual)',
    example: '6',
  },
  'PVA': {
    category: 'Intraoperatorio - Ventilación',
    description: 'Presión de vía aérea pico',
    type: 'Integer',
    unit: 'cmH₂O',
    range: '<30 (deseable)',
    example: '22',
  },
  'P_Plateau': {
    category: 'Intraoperatorio - Ventilación',
    description: 'Presión plateau/meseta',
    type: 'Integer',
    unit: 'cmH₂O',
    range: '<28 (deseable)',
    example: '18',
  },
  'Relacion_IE': {
    category: 'Intraoperatorio - Ventilación',
    description: 'Relación inspiración:espiración',
    type: 'String',
    example: '1:2',
  },
  'Compliance': {
    category: 'Intraoperatorio - Ventilación',
    description: 'Compliance estática pulmonar',
    type: 'Float',
    unit: 'mL/cmH₂O',
    range: '50-100 (normal)',
    example: '45',
  },
  'Volumen_Minuto': {
    category: 'Intraoperatorio - Ventilación',
    description: 'Volumen minuto (Vt x FR)',
    type: 'Float',
    unit: 'L/min',
    range: '5-8 (normal)',
    example: '6.7',
  },

  // Agente inhalatorio
  'Agente_Inhalatorio': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Agente anestésico inhalatorio utilizado',
    type: 'Enum',
    values: ['Isoflurano', 'Sevoflurano', 'Desflurano'],
    example: 'Sevoflurano',
  },
  'Agente_Fi': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Fracción inspirada del agente inhalatorio',
    type: 'Float',
    unit: '%',
    example: '2.0',
  },
  'Agente_Et': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Fracción espirada del agente inhalatorio (end-tidal)',
    type: 'Float',
    unit: '%',
    example: '1.8',
  },
  'Agente_MAC': {
    category: 'Intraoperatorio - Fármacos',
    description: 'MAC (Concentración Alveolar Mínima) del agente',
    type: 'Float',
    interpretation: '1 MAC = 50% de pacientes no responden a estímulo quirúrgico',
    example: '0.9',
  },

  // Monitoreo avanzado
  'BIS': {
    category: 'Intraoperatorio - Monitoreo Avanzado',
    description: 'Índice biespectral (profundidad anestésica)',
    type: 'Integer',
    range: '0-100',
    interpretation: '40-60 = anestesia general adecuada',
    example: '45',
  },
  'EMG': {
    category: 'Intraoperatorio - Monitoreo Avanzado',
    description: 'EMG del monitor BIS (actividad muscular frontal)',
    type: 'Integer',
    unit: 'dB',
    example: '25',
  },
  'Segmento_ST': {
    category: 'Intraoperatorio - Monitoreo Avanzado',
    description: 'Desviación del segmento ST en ECG',
    type: 'Float',
    unit: 'mm',
    range: '-0.5 a +0.5 (normal)',
    example: '0.1',
  },
  'Ritmo_Cardiaco': {
    category: 'Intraoperatorio - Monitoreo Avanzado',
    description: 'Tipo de ritmo cardíaco',
    type: 'String',
    values: ['Sinusal', 'FA (Fibrilación auricular)', 'Flutter', 'BAV', 'Taquicardia ventricular'],
    example: 'Sinusal',
  },

  // Laboratorios intraoperatorios
  'Intraop_Hb': {
    category: 'Intraoperatorio - Laboratorio',
    description: 'Hemoglobina intraoperatoria',
    type: 'Float',
    unit: 'g/dL',
    example: '8.5',
  },
  'Intraop_Hto': {
    category: 'Intraoperatorio - Laboratorio',
    description: 'Hematocrito intraoperatorio',
    type: 'Float',
    unit: '%',
    example: '26',
  },
  'Intraop_Plaquetas': {
    category: 'Intraoperatorio - Laboratorio',
    description: 'Recuento de plaquetas intraoperatorio',
    type: 'Float',
    unit: '10³/µL',
    example: '65',
  },
  'Intraop_TP': {
    category: 'Intraoperatorio - Laboratorio',
    description: 'Tiempo de protrombina intraoperatorio',
    type: 'Float',
    unit: 'segundos',
    example: '22',
  },
  'Intraop_INR': {
    category: 'Intraoperatorio - Laboratorio',
    description: 'INR intraoperatorio',
    type: 'Float',
    example: '2.1',
  },
  'Intraop_Fibrinogeno': {
    category: 'Intraoperatorio - Laboratorio',
    description: 'Fibrinógeno intraoperatorio',
    type: 'Float',
    unit: 'mg/dL',
    example: '95',
  },
  'Intraop_APTT': {
    category: 'Intraoperatorio - Laboratorio',
    description: 'Tiempo de tromboplastina parcial activada intraoperatorio',
    type: 'Float',
    unit: 'segundos',
    range: '25-35 (normal)',
    example: '48',
  },
  'Intraop_Sodio': {
    category: 'Intraoperatorio - Laboratorio',
    description: 'Sodio sérico intraoperatorio',
    type: 'Float',
    unit: 'mEq/L',
    example: '138',
  },
  'Intraop_Potasio': {
    category: 'Intraoperatorio - Laboratorio',
    description: 'Potasio sérico intraoperatorio',
    type: 'Float',
    unit: 'mEq/L',
    example: '4.8',
  },
  'Intraop_Calcio_Ionico': {
    category: 'Intraoperatorio - Laboratorio',
    description: 'Calcio iónico intraoperatorio',
    type: 'Float',
    unit: 'mmol/L',
    example: '1.08',
  },
  'Intraop_Magnesio': {
    category: 'Intraoperatorio - Laboratorio',
    description: 'Magnesio intraoperatorio',
    type: 'Float',
    unit: 'mEq/L',
    example: '1.6',
  },
  'Intraop_Cloro': {
    category: 'Intraoperatorio - Laboratorio',
    description: 'Cloro sérico intraoperatorio',
    type: 'Float',
    unit: 'mEq/L',
    example: '105',
  },
  'Intraop_Fosforo': {
    category: 'Intraoperatorio - Laboratorio',
    description: 'Fósforo sérico intraoperatorio',
    type: 'Float',
    unit: 'mg/dL',
    example: '3.2',
  },

  // Gases arteriales
  'pH': {
    category: 'Intraoperatorio - Gases',
    description: 'pH arterial',
    type: 'Float',
    range: '7.35-7.45 (normal)',
    example: '7.32',
  },
  'PaO2': {
    category: 'Intraoperatorio - Gases',
    description: 'Presión parcial de oxígeno arterial',
    type: 'Float',
    unit: 'mmHg',
    range: '80-100 (normal con FiO2 0.21)',
    example: '185',
  },
  'PaCO2': {
    category: 'Intraoperatorio - Gases',
    description: 'Presión parcial de CO2 arterial',
    type: 'Float',
    unit: 'mmHg',
    range: '35-45 (normal)',
    example: '42',
  },
  'HCO3': {
    category: 'Intraoperatorio - Gases',
    description: 'Bicarbonato sérico',
    type: 'Float',
    unit: 'mEq/L',
    range: '22-26 (normal)',
    example: '18',
  },
  'BE': {
    category: 'Intraoperatorio - Gases',
    description: 'Exceso de base',
    type: 'Float',
    unit: 'mEq/L',
    range: '-2 a +2 (normal)',
    example: '-6',
  },
  'Lactato': {
    category: 'Intraoperatorio - Gases',
    description: 'Lactato arterial',
    type: 'Float',
    unit: 'mmol/L',
    range: '<2 (normal)',
    interpretation: '>4 = hipoperfusión tisular significativa',
    example: '3.5',
  },
  'Anion_Gap': {
    category: 'Intraoperatorio - Gases',
    description: 'Anion gap (Na - Cl - HCO3)',
    type: 'Float',
    unit: 'mEq/L',
    range: '8-12 (normal)',
    example: '14',
  },
  'Osmolaridad': {
    category: 'Intraoperatorio - Gases',
    description: 'Osmolaridad plasmática calculada',
    type: 'Float',
    unit: 'mOsm/kg',
    range: '275-295 (normal)',
    example: '288',
  },

  // Gases venosos
  'pvpH': {
    category: 'Intraoperatorio - Gases Venosos',
    description: 'pH venoso mixto',
    type: 'Float',
    range: '7.31-7.41 (normal)',
    example: '7.28',
  },
  'PvO2': {
    category: 'Intraoperatorio - Gases Venosos',
    description: 'Presión parcial de O2 venoso mixto',
    type: 'Float',
    unit: 'mmHg',
    range: '35-45 (normal)',
    example: '38',
  },
  'PvCO2': {
    category: 'Intraoperatorio - Gases Venosos',
    description: 'Presión parcial de CO2 venoso mixto',
    type: 'Float',
    unit: 'mmHg',
    range: '41-51 (normal)',
    example: '48',
  },

  // Función renal intraop
  'Intraop_Urea': {
    category: 'Intraoperatorio - Laboratorio',
    description: 'Urea/BUN intraoperatorio',
    type: 'Float',
    unit: 'mg/dL',
    example: '52',
  },
  'Intraop_Creatinina': {
    category: 'Intraoperatorio - Laboratorio',
    description: 'Creatinina sérica intraoperatoria',
    type: 'Float',
    unit: 'mg/dL',
    example: '2.1',
  },

  // Función hepática intraop
  'Intraop_TGO': {
    category: 'Intraoperatorio - Laboratorio',
    description: 'TGO/AST intraoperatorio',
    type: 'Float',
    unit: 'U/L',
    example: '250',
  },
  'Intraop_TGP': {
    category: 'Intraoperatorio - Laboratorio',
    description: 'TGP/ALT intraoperatorio',
    type: 'Float',
    unit: 'U/L',
    example: '180',
  },
  'Intraop_BT': {
    category: 'Intraoperatorio - Laboratorio',
    description: 'Bilirrubina total intraoperatoria',
    type: 'Float',
    unit: 'mg/dL',
    example: '12.5',
  },
  'Intraop_BD': {
    category: 'Intraoperatorio - Laboratorio',
    description: 'Bilirrubina directa intraoperatoria',
    type: 'Float',
    unit: 'mg/dL',
    example: '8.2',
  },
  'Intraop_Albumina': {
    category: 'Intraoperatorio - Laboratorio',
    description: 'Albúmina intraoperatoria',
    type: 'Float',
    unit: 'g/dL',
    example: '2.5',
  },

  // Metabólicos
  'Intraop_Glicemia': {
    category: 'Intraoperatorio - Laboratorio',
    description: 'Glicemia intraoperatoria',
    type: 'Float',
    unit: 'mg/dL',
    example: '145',
  },

  // ETE
  'ETE_VD': {
    category: 'Intraoperatorio - Ecocardiograma',
    description: 'Función del ventrículo derecho por ETE',
    type: 'String',
    values: ['Normal', 'Hipocinético', 'Severamente disfuncionante'],
    example: 'Hipocinético',
  },
  'ETE_TAPSE': {
    category: 'Intraoperatorio - Ecocardiograma',
    description: 'TAPSE (Tricuspid Annular Plane Systolic Excursion)',
    type: 'String',
    values: ['<16mm = disfunción VD', '16-20mm = limítrofe', '>20mm = normal'],
    example: '16-20mm',
  },
  'ETE_VI': {
    category: 'Intraoperatorio - Ecocardiograma',
    description: 'Función del ventrículo izquierdo / FEVI por ETE',
    type: 'String',
    values: ['Conservada (>55%)', 'Moderadamente reducida (40-55%)', 'Severamente reducida (<40%)'],
    example: 'Conservada',
  },
  'ETE_Dilatacion': {
    category: 'Intraoperatorio - Ecocardiograma',
    description: 'Dilatación de cavidades cardíacas',
    type: 'String',
    values: ['AI', 'VI', 'VD', 'AI+VI', 'AI+VD', 'VI+VD', 'AI+VI+VD', 'Normales'],
    example: 'AI',
  },
  'ETE_PSAP': {
    category: 'Intraoperatorio - Ecocardiograma',
    description: 'Presión sistólica de arteria pulmonar estimada por ETE',
    type: 'String',
    values: ['<40mmHg = normal', '40-60mmHg = moderada', '>60mmHg = severa'],
    example: '<40mmHg',
  },
  'ETE_Trombo': {
    category: 'Intraoperatorio - Ecocardiograma',
    description: 'Presencia de trombo intracardíaco',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'ETE_Derrame_Pericardico': {
    category: 'Intraoperatorio - Ecocardiograma',
    description: 'Derrame pericárdico',
    type: 'String',
    values: ['Sin derrame', 'Leve', 'Moderado', 'Severo'],
    example: 'Sin derrame',
  },
  'ETE_Volemia': {
    category: 'Intraoperatorio - Ecocardiograma',
    description: 'Evaluación cualitativa de volemia por ETE',
    type: 'String',
    values: ['Hipovolemia grave', 'Hipovolemia leve-moderada', 'Normovolemia', 'Hipervolemia'],
    example: 'Normovolemia',
  },
  'ETE_Observaciones': {
    category: 'Intraoperatorio - Ecocardiograma',
    description: 'Observaciones adicionales del ETE',
    type: 'String',
    example: 'Válvulas normales, sin vegetaciones',
  },

  // ROTEM
  'ROTEM_CT_EXTEM': {
    category: 'Intraoperatorio - ROTEM',
    description: 'Clotting Time del EXTEM - tiempo hasta inicio de coagulación',
    type: 'Integer',
    unit: 'segundos',
    range: '38-79 (normal)',
    interpretation: 'Prolongado: déficit de factores de coagulación',
    example: '85',
  },
  'ROTEM_CFT_EXTEM': {
    category: 'Intraoperatorio - ROTEM',
    description: 'Clot Formation Time del EXTEM - tiempo de formación del coágulo',
    type: 'Integer',
    unit: 'segundos',
    range: '34-159 (normal)',
    interpretation: 'Prolongado: déficit de fibrinógeno o plaquetas',
    example: '180',
  },
  'ROTEM_A5_EXTEM': {
    category: 'Intraoperatorio - ROTEM',
    description: 'Amplitud a los 5 minutos del EXTEM',
    type: 'Integer',
    unit: 'mm',
    range: '34-55 (normal)',
    interpretation: 'Predictor temprano de MCF',
    example: '42',
  },
  'ROTEM_A10_EXTEM': {
    category: 'Intraoperatorio - ROTEM',
    description: 'Amplitud a los 10 minutos del EXTEM',
    type: 'Integer',
    unit: 'mm',
    range: '43-65 (normal)',
    example: '55',
  },
  'ROTEM_MCF_EXTEM': {
    category: 'Intraoperatorio - ROTEM',
    description: 'Maximum Clot Firmness del EXTEM - firmeza máxima del coágulo',
    type: 'Integer',
    unit: 'mm',
    range: '50-72 (normal)',
    interpretation: 'Bajo: déficit de fibrinógeno y/o plaquetas',
    example: '58',
  },
  'ROTEM_CLI30': {
    category: 'Intraoperatorio - ROTEM',
    description: 'Índice de lisis a los 30 minutos',
    type: 'Integer',
    unit: '%',
    range: '94-100 (normal)',
    interpretation: '<94%: posible hiperfibrinólisis',
    example: '98',
  },
  'ROTEM_CLI60': {
    category: 'Intraoperatorio - ROTEM',
    description: 'Índice de lisis a los 60 minutos',
    type: 'Integer',
    unit: '%',
    range: '85-100 (normal)',
    example: '92',
  },
  'ROTEM_ML': {
    category: 'Intraoperatorio - ROTEM',
    description: 'Lisis máxima (Maximum Lysis)',
    type: 'Integer',
    unit: '%',
    range: '<15 (normal)',
    interpretation: '>15%: hiperfibrinólisis',
    example: '8',
  },
  'ROTEM_CT_FIBTEM': {
    category: 'Intraoperatorio - ROTEM',
    description: 'Clotting Time del FIBTEM',
    type: 'Integer',
    unit: 'segundos',
    range: '38-70 (normal)',
    example: '55',
  },
  'ROTEM_A5_FIBTEM': {
    category: 'Intraoperatorio - ROTEM',
    description: 'Amplitud a los 5 minutos del FIBTEM (refleja fibrinógeno)',
    type: 'Integer',
    unit: 'mm',
    range: '8-21 (normal)',
    interpretation: '<8mm: déficit de fibrinógeno',
    example: '12',
  },
  'ROTEM_A10_FIBTEM': {
    category: 'Intraoperatorio - ROTEM',
    description: 'Amplitud a los 10 minutos del FIBTEM',
    type: 'Integer',
    unit: 'mm',
    range: '9-24 (normal)',
    example: '14',
  },
  'ROTEM_MCF_FIBTEM': {
    category: 'Intraoperatorio - ROTEM',
    description: 'Maximum Clot Firmness del FIBTEM',
    type: 'Integer',
    unit: 'mm',
    range: '9-25 (normal)',
    interpretation: 'Refleja contribución del fibrinógeno al coágulo',
    example: '16',
  },
  'ROTEM_CT_INTEM': {
    category: 'Intraoperatorio - ROTEM',
    description: 'Clotting Time del INTEM (vía intrínseca)',
    type: 'Integer',
    unit: 'segundos',
    range: '100-240 (normal)',
    example: '165',
  },
  'ROTEM_CT_HEPTEM': {
    category: 'Intraoperatorio - ROTEM',
    description: 'Clotting Time del HEPTEM (con heparinasa)',
    type: 'Integer',
    unit: 'segundos',
    interpretation: 'CT INTEM > CT HEPTEM: efecto de heparina',
    example: '140',
  },
  'ROTEM_A5_APTEM': {
    category: 'Intraoperatorio - ROTEM',
    description: 'Amplitud a los 5 minutos del APTEM (con antifibrinolítico)',
    type: 'Integer',
    unit: 'mm',
    interpretation: 'A5 APTEM > A5 EXTEM: confirma hiperfibrinólisis',
    example: '45',
  },

  // Fármacos intraoperatorios
  'Opioide_Bolo': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Opioide administrado en bolo',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'Opioide_Infusion': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Opioide en infusión continua',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'Hipnotico_Bolo': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Hipnótico administrado en bolo',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'Hipnotico_Infusion': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Hipnótico en infusión continua',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Relajante_Bolo': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Relajante muscular en bolo',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'Relajante_Infusion': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Relajante muscular en infusión',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Lidocaina_Bolo': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Lidocaína en bolo',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Lidocaina_Infusion': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Lidocaína en infusión',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Adrenalina_Bolo': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Adrenalina en bolo',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Adrenalina_Infusion': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Adrenalina en infusión',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Noradrenalina': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Noradrenalina en infusión',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'Dobutamina': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Dobutamina en infusión',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Dopamina': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Dopamina en infusión',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Fenilefrina': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Fenilefrina administrada',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Insulina_Bolo': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Insulina en bolo',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'Insulina_Infusion': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Insulina en infusión',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Furosemida': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Furosemida administrada',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'Ac_Tranexamico_Bolo': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Ácido tranexámico en bolo',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Ac_Tranexamico_Infusion': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Ácido tranexámico en infusión',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Gluconato_Calcio_Bolo': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Gluconato de calcio en bolo',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'Gluconato_Calcio_Infusion': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Gluconato de calcio en infusión',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Bicarbonato_Sodio': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Bicarbonato de sodio administrado',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'ATB_Intraop': {
    category: 'Intraoperatorio - Fármacos',
    description: 'Antibióticos administrados intraoperatorio',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },

  // ============================================================================
  // FLUIDS & BLOOD - Fluidos y Hemoderivados
  // ============================================================================
  'Plasmalyte_ml': {
    category: 'Fluidos - Cristaloides',
    description: 'Volumen de Plasmalyte administrado',
    type: 'Integer',
    unit: 'mL',
    example: '3500',
  },
  'Ringer_ml': {
    category: 'Fluidos - Cristaloides',
    description: 'Volumen de Ringer Lactato administrado',
    type: 'Integer',
    unit: 'mL',
    example: '2000',
  },
  'SF_ml': {
    category: 'Fluidos - Cristaloides',
    description: 'Volumen de Suero Fisiológico administrado',
    type: 'Integer',
    unit: 'mL',
    example: '500',
  },
  'Dextrosa_ml': {
    category: 'Fluidos - Cristaloides',
    description: 'Volumen de Dextrosa administrada',
    type: 'Integer',
    unit: 'mL',
    example: '500',
  },
  'Coloides_ml': {
    category: 'Fluidos - Coloides',
    description: 'Volumen de coloides administrado',
    type: 'Integer',
    unit: 'mL',
    example: '500',
  },
  'Albumina_ml': {
    category: 'Fluidos - Coloides',
    description: 'Volumen de albúmina administrada',
    type: 'Integer',
    unit: 'mL',
    example: '400',
  },
  'GR_Unidades': {
    category: 'Fluidos - Hemoderivados',
    description: 'Unidades de glóbulos rojos transfundidas',
    type: 'Integer',
    unit: 'unidades',
    example: '6',
  },
  'PFC_Unidades': {
    category: 'Fluidos - Hemoderivados',
    description: 'Unidades de plasma fresco congelado transfundidas',
    type: 'Integer',
    unit: 'unidades',
    example: '8',
  },
  'Plaquetas_Unidades': {
    category: 'Fluidos - Hemoderivados',
    description: 'Concentrados de plaquetas transfundidos',
    type: 'Integer',
    unit: 'concentrados',
    example: '2',
  },
  'Crioprecipitado_ml': {
    category: 'Fluidos - Hemoderivados',
    description: 'Volumen de crioprecipitado transfundido',
    type: 'Integer',
    unit: 'mL',
    example: '200',
  },
  'Cell_Saver_ml': {
    category: 'Fluidos - Hemoderivados',
    description: 'Volumen reinfundido por Cell Saver',
    type: 'Integer',
    unit: 'mL',
    example: '800',
  },
  'Fibrinogeno_g': {
    category: 'Fluidos - Hemoderivados',
    description: 'Gramos de fibrinógeno concentrado administrado',
    type: 'Integer',
    unit: 'gramos',
    example: '4',
  },
  'CCP_Unidades': {
    category: 'Fluidos - Hemoderivados',
    description: 'Unidades de Concentrado de Complejo Protrombínico',
    type: 'Integer',
    unit: 'UI',
    example: '2000',
  },
  'Factor_VII_mg': {
    category: 'Fluidos - Hemoderivados',
    description: 'Miligramos de Factor VII recombinante',
    type: 'Integer',
    unit: 'mg',
    example: '5',
  },

  // Pérdidas
  'Perdidas_Insensibles_ml': {
    category: 'Fluidos - Pérdidas',
    description: 'Pérdidas insensibles estimadas',
    type: 'Integer',
    unit: 'mL',
    example: '1500',
  },
  'Ascitis_Drenada_ml': {
    category: 'Fluidos - Pérdidas',
    description: 'Volumen de ascitis drenada',
    type: 'Integer',
    unit: 'mL',
    example: '3000',
  },
  'Aspirador_ml': {
    category: 'Fluidos - Pérdidas',
    description: 'Volumen en aspirador (incluye sangrado)',
    type: 'Integer',
    unit: 'mL',
    example: '2500',
  },
  'Gasas_ml': {
    category: 'Fluidos - Pérdidas',
    description: 'Pérdidas estimadas en gasas',
    type: 'Integer',
    unit: 'mL',
    example: '500',
  },
  'Diuresis_ml': {
    category: 'Fluidos - Pérdidas',
    description: 'Diuresis total intraoperatoria',
    type: 'Integer',
    unit: 'mL',
    example: '1200',
  },
  'Balance_ml': {
    category: 'Fluidos - Balance',
    description: 'Balance hídrico neto (ingresos - egresos)',
    type: 'Integer',
    unit: 'mL',
    example: '+2500',
  },

  // ============================================================================
  // POSTOP - Resultados Postoperatorios
  // ============================================================================
  'Extubado_en_BQ': {
    category: 'Postoperatorio',
    description: 'Paciente extubado en bloque quirúrgico',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Horas_ARM': {
    category: 'Postoperatorio',
    description: 'Horas de asistencia respiratoria mecánica postoperatoria',
    type: 'Integer',
    unit: 'horas',
    example: '18',
  },
  'Dias_ARM': {
    category: 'Postoperatorio',
    description: 'Días de asistencia respiratoria mecánica postoperatoria',
    type: 'Integer',
    unit: 'días',
    example: '1',
  },
  'Falla_Extubacion_24h': {
    category: 'Postoperatorio',
    description: 'Falla de extubación en las primeras 24 horas (reintubación)',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Reoperacion': {
    category: 'Postoperatorio',
    description: 'Requirió reoperación',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Causa_Reoperacion': {
    category: 'Postoperatorio',
    description: 'Causa de la reoperación',
    type: 'String',
    example: 'Sangrado',
  },
  'Falla_Primaria_Injerto': {
    category: 'Postoperatorio - Complicaciones',
    description: 'Falla primaria del injerto (PNF)',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'IRA': {
    category: 'Postoperatorio - Complicaciones',
    description: 'Insuficiencia renal aguda postoperatoria',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'Edema_Pulmonar': {
    category: 'Postoperatorio - Complicaciones',
    description: 'Edema pulmonar postoperatorio',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Neurotoxicidad': {
    category: 'Postoperatorio - Complicaciones',
    description: 'Neurotoxicidad por inmunosupresores',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Rechazo': {
    category: 'Postoperatorio - Complicaciones',
    description: 'Rechazo del injerto',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Complicaciones_Biliares': {
    category: 'Postoperatorio - Complicaciones',
    description: 'Complicaciones de la vía biliar',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Complicaciones_Vasculares': {
    category: 'Postoperatorio - Complicaciones',
    description: 'Complicaciones vasculares',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Sangrado_Quirurgico': {
    category: 'Postoperatorio - Complicaciones',
    description: 'Sangrado quirúrgico postoperatorio significativo',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'APACHE_II': {
    category: 'Postoperatorio',
    description: 'Score APACHE II al ingreso a CTI',
    type: 'Integer',
    range: '0-71',
    interpretation: 'Mayor valor = mayor gravedad',
    example: '18',
  },
  'Otras_Complicaciones': {
    category: 'Postoperatorio - Complicaciones',
    description: 'Otras complicaciones postoperatorias',
    type: 'String',
    example: 'Infección de herida operatoria',
  },
  'Dias_UCI': {
    category: 'Postoperatorio - Estancia',
    description: 'Días de internación en UCI/CTI',
    type: 'Integer',
    unit: 'días',
    example: '5',
  },
  'Dias_Sala': {
    category: 'Postoperatorio - Estancia',
    description: 'Días de internación en sala general',
    type: 'Integer',
    unit: 'días',
    example: '12',
  },
  'Fecha_Alta': {
    category: 'Postoperatorio - Estancia',
    description: 'Fecha de alta hospitalaria del trasplante',
    type: 'Date',
    example: '2024-02-01',
  },

  // ============================================================================
  // MORTALITY - Mortalidad y Seguimiento
  // ============================================================================
  'Muerte_Precoz': {
    category: 'Mortalidad',
    description: 'Muerte precoz (<30 días post-trasplante)',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Fecha_Muerte': {
    category: 'Mortalidad',
    description: 'Fecha de fallecimiento',
    type: 'Date',
    example: '2024-03-15',
  },
  'Causa_Muerte_Precoz': {
    category: 'Mortalidad',
    description: 'Causa de muerte precoz',
    type: 'String',
    example: 'Sepsis',
  },
  'Vivo_al_Alta': {
    category: 'Mortalidad - Seguimiento',
    description: 'Paciente vivo al momento del alta',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'Sí',
  },
  'Vivo_1_Anio': {
    category: 'Mortalidad - Seguimiento',
    description: 'Paciente vivo al año del trasplante',
    type: 'Boolean',
    values: ['Sí', 'No', ''],
    example: 'Sí',
  },
  'Vivo_3_Anios': {
    category: 'Mortalidad - Seguimiento',
    description: 'Paciente vivo a los 3 años del trasplante',
    type: 'Boolean',
    values: ['Sí', 'No', ''],
    example: '',
  },
  'Vivo_5_Anios': {
    category: 'Mortalidad - Seguimiento',
    description: 'Paciente vivo a los 5 años del trasplante',
    type: 'Boolean',
    values: ['Sí', 'No', ''],
    example: '',
  },
  'Causa_Muerte_Tardia': {
    category: 'Mortalidad',
    description: 'Causa de muerte tardía (>30 días)',
    type: 'String',
    example: 'Recidiva tumoral',
  },
  'Reingreso_6m': {
    category: 'Mortalidad - Reingresos',
    description: 'Reingreso hospitalario en los primeros 6 meses',
    type: 'Boolean',
    values: ['Sí', 'No'],
    example: 'No',
  },
  'Dias_1er_Reingreso': {
    category: 'Mortalidad - Reingresos',
    description: 'Días hasta el primer reingreso',
    type: 'Integer',
    unit: 'días',
    example: '45',
  },
  'Dias_2do_Reingreso': {
    category: 'Mortalidad - Reingresos',
    description: 'Días hasta el segundo reingreso',
    type: 'Integer',
    unit: 'días',
    example: '120',
  },
  'Causa_Reingreso': {
    category: 'Mortalidad - Reingresos',
    description: 'Causa del reingreso',
    type: 'String',
    example: 'Colangitis',
  },

  // ============================================================================
  // TEAM - Equipo Quirúrgico
  // ============================================================================
  'Equipo_Anestesiologos': {
    category: 'Equipo',
    description: 'Anestesiólogos participantes',
    type: 'String',
    example: 'Dr. García; Dra. López',
  },
  'Equipo_Cirujanos': {
    category: 'Equipo',
    description: 'Cirujanos participantes',
    type: 'String',
    example: 'Dr. Pérez; Dr. Rodríguez',
  },
  'Observaciones_Caso': {
    category: 'Caso',
    description: 'Observaciones generales del caso',
    type: 'String',
    example: 'Procedimiento sin incidentes',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format CI with dots and dash: 12345678 -> 1.234.567-8
 */
function formatCI(ci) {
  if (!ci) return '';
  const str = ci.toString();
  if (str.length !== 8) return ci;
  return `${str[0]}.${str.slice(1, 4)}.${str.slice(4, 7)}-${str[7]}`;
}

/**
 * Format date to ISO string
 */
function formatDate(date) {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
}

/**
 * Format time from datetime
 */
function formatTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Boolean to Sí/No
 */
function boolToSiNo(val) {
  if (val === null || val === undefined) return '';
  return val ? 'Sí' : 'No';
}

/**
 * Get case data formatted for CSV export (complete)
 */
async function getCaseDataComplete(caseId) {
  const caseData = await prisma.transplantCase.findUnique({
    where: { id: caseId },
    include: {
      patient: true,
      team: {
        include: {
          clinician: true,
        },
      },
      linesMonitoring: {
        include: {
          vascularLines: true,
        },
      },
      fluidsBlood: {
        orderBy: [{ phase: 'asc' }, { timestamp: 'asc' }],
      },
      drugs: {
        orderBy: [{ phase: 'asc' }, { timestamp: 'asc' }],
      },
    },
  });

  if (!caseData) {
    throw new Error(`Case ${caseId} not found`);
  }

  // Fetch preop with labs
  const preop = await prisma.preopEvaluation.findFirst({
    where: { caseId },
    orderBy: { evaluationDate: 'desc' },
    include: {
      labs: {
        orderBy: { labDate: 'desc' },
        take: 1,
      },
    },
  });

  // Fetch intraop records
  const intraopRecords = await prisma.intraopRecord.findMany({
    where: { caseId },
    orderBy: [{ phase: 'asc' }, { timestamp: 'asc' }],
  });

  // Fetch postop
  const postop = await prisma.postOpOutcome.findFirst({
    where: { caseId },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch mortality data
  const mortality = await prisma.mortality.findUnique({
    where: { patientId: caseData.patientId },
  });

  return {
    case: caseData,
    patient: caseData.patient,
    preop,
    preopLabs: preop?.labs?.[0] || null,
    intraop: intraopRecords,
    linesMonitoring: caseData.linesMonitoring,
    fluidsBlood: caseData.fluidsBlood,
    drugs: caseData.drugs,
    postop,
    mortality,
    team: caseData.team,
  };
}

/**
 * Aggregate fluids and blood by summing across all phases
 */
function aggregateFluidsBlood(fluidsBlood) {
  const totals = {
    plasmalyte: 0,
    ringer: 0,
    saline: 0,
    dextrose: 0,
    colloids: 0,
    albumin: 0,
    redBloodCells: 0,
    plasma: 0,
    platelets: 0,
    cryoprecip: 0,
    cellSaver: 0,
    fibrinogen: 0,
    pcc: 0,
    factorVII: 0,
    insensibleLoss: 0,
    ascites: 0,
    suction: 0,
    gauze: 0,
    urine: 0,
  };

  for (const fb of fluidsBlood) {
    totals.plasmalyte += fb.plasmalyte || 0;
    totals.ringer += fb.ringer || 0;
    totals.saline += fb.saline || 0;
    totals.dextrose += fb.dextrose || 0;
    totals.colloids += fb.colloids || 0;
    totals.albumin += fb.albumin || 0;
    totals.redBloodCells += fb.redBloodCells || 0;
    totals.plasma += fb.plasma || 0;
    totals.platelets += fb.platelets || 0;
    totals.cryoprecip += fb.cryoprecip || 0;
    totals.cellSaver += fb.cellSaver || 0;
    totals.fibrinogen += fb.fibrinogen || 0;
    totals.pcc += fb.pcc || 0;
    totals.factorVII += fb.factorVII || 0;
    totals.insensibleLoss += fb.insensibleLoss || 0;
    totals.ascites += fb.ascites || 0;
    totals.suction += fb.suction || 0;
    totals.gauze += fb.gauze || 0;
    totals.urine += fb.urine || 0;
  }

  // Calculate balance
  const ingresos = totals.plasmalyte + totals.ringer + totals.saline + totals.dextrose +
                   totals.colloids + totals.albumin + (totals.redBloodCells * 280) +
                   (totals.plasma * 250) + totals.cryoprecip + totals.cellSaver;
  const egresos = totals.insensibleLoss + totals.ascites + totals.suction +
                  totals.gauze + totals.urine;
  totals.balance = ingresos - egresos;

  return totals;
}

/**
 * Get team members by role
 */
function getTeamByRole(team, role) {
  return team
    .filter(t => t.role === role)
    .map(t => t.clinician.name)
    .join('; ');
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Generate comprehensive case summary CSV (one row per case with ALL fields)
 */
async function generateCaseSummaryCSV(caseId) {
  const data = await getCaseDataComplete(caseId);
  const { case: c, patient, preop, preopLabs, postop, mortality, team, linesMonitoring, fluidsBlood } = data;

  // Aggregate fluids - handle undefined/null fluidsBlood
  const fluids = aggregateFluidsBlood(fluidsBlood || []);

  // Calculate age at transplant
  const age = patient.birthDate && c.startAt
    ? Math.floor((new Date(c.startAt) - new Date(patient.birthDate)) / 31557600000)
    : '';

  const row = {
    // Patient
    'CI': formatCI(patient.id),
    'CI_Raw': patient.ciRaw || '',
    'Nombre_Completo': patient.name || '',
    'Fecha_Nacimiento': formatDate(patient.birthDate),
    'Edad': age,
    'Sexo': patient.sex || '',
    'Prestador': patient.provider || '',
    'Procedencia': patient.placeOfOrigin || '',
    'Grupo_Sanguineo': patient.bloodGroup || '',
    'Peso_kg': patient.weight || '',
    'Talla_cm': patient.height || '',
    'ASA': patient.asa || c.asa || '',

    // Case
    'ID_Caso': c.id,
    'Fecha_Inicio': formatDate(c.startAt),
    'Hora_Inicio': formatTime(c.startAt),
    'Fecha_Fin': formatDate(c.endAt),
    'Hora_Fin': formatTime(c.endAt),
    'Anio': c.startAt ? new Date(c.startAt).getFullYear() : '',
    'Duracion_min': c.duration || '',
    'Es_Retrasplante': boolToSiNo(c.isRetransplant),
    'Hepato_Renal': boolToSiNo(c.isHepatoRenal),
    'Donante_Optimo': boolToSiNo(c.optimalDonor),
    'Procedencia_Caso': c.provenance || '',
    'Tiempo_Isquemia_Fria_min': c.coldIschemiaTime || '',
    'Tiempo_Isquemia_Caliente_min': c.warmIschemiaTime || '',
    'Origen_Datos': c.dataSource || '',

    // Preop - Scores
    'MELD': preop?.meld || '',
    'MELD_Na': preop?.meldNa || '',
    'Child_Pugh': preop?.child || '',
    'Etiologia_1': preop?.etiology1 || '',
    'Etiologia_2': preop?.etiology2 || '',
    'Fecha_Evaluacion_Preop': formatDate(preop?.evaluationDate),
    'Falla_Hepatica_Fulminante': boolToSiNo(preop?.isFulminant),

    // Preop - Complicaciones cirrosis
    'Sindrome_Hepatorenal': boolToSiNo(preop?.hepatoRenalSyndrome),
    'Sindrome_Hepatopulmonar': boolToSiNo(preop?.hepatoPulmonarySyndr),
    'HT_Pulmonar': boolToSiNo(preop?.pulmonaryHypertension),
    'HT_Portal': boolToSiNo(preop?.portalHypertension),
    'Ascitis': boolToSiNo(preop?.ascites),
    'Hidrotorax': boolToSiNo(preop?.hydrothorax),
    'Varices_Esofagicas': boolToSiNo(preop?.esophagealVarices),
    'Encefalopatia': boolToSiNo(preop?.encephalopathy),
    'Sangrado_Previo': boolToSiNo(preop?.bleeding),
    'Hiponatremia': boolToSiNo(preop?.hyponatremia),
    'PBE': boolToSiNo(preop?.sbe),
    'Trombosis_Portal': boolToSiNo(preop?.portalThrombosis),
    'Hepatocarcinoma': boolToSiNo(preop?.hepatocarcinoma),

    // Preop - Comorbilidades
    'Cardiopatia_Coronaria': boolToSiNo(preop?.coronaryDisease),
    'HTA': boolToSiNo(preop?.hypertension),
    'Valvulopatia': preop?.valvulopathy || '',
    'Arritmia': boolToSiNo(preop?.arrhythmia),
    'Miocardiopatia_Dilatada': boolToSiNo(preop?.dilatedCardio),
    'Cardiopatia_Hipertensiva': boolToSiNo(preop?.hypertensiveCardio),
    'EPOC_Tabaquismo': boolToSiNo(preop?.smokerCOPD),
    'Asma': boolToSiNo(preop?.asthma),
    'Insuficiencia_Renal': boolToSiNo(preop?.renalFailure),
    'Monorreno': boolToSiNo(preop?.singleKidney),
    'Diabetes': boolToSiNo(preop?.diabetes),
    'Disfuncion_Tiroidea': boolToSiNo(preop?.thyroidDysfunction),
    'Cirugia_Abdominal_Previa': boolToSiNo(preop?.previousAbdSurgery),
    'Detalle_Cirugia_Previa': preop?.abdSurgeryDetail || '',
    'RGE_Ulcera': boolToSiNo(preop?.refluxUlcer),
    'Alergias': preop?.allergies || '',
    'Clase_Funcional': preop?.functionalClass || '',
    'ARM_Previo': boolToSiNo(preop?.mechanicalVent),
    'Medicacion_Habitual': preop?.habitualMeds || '',

    // Preop - Examen físico vía aérea
    'Mallampati': preop?.mpt || '',
    'Apertura_Bucal': preop?.mouthOpening || '',

    // Preop - Laboratorios
    'Preop_Hb': preopLabs?.hb || '',
    'Preop_Hto': preopLabs?.hto || '',
    'Preop_Plaquetas': preopLabs?.platelets || '',
    'Preop_TP': preopLabs?.pt || '',
    'Preop_INR': preopLabs?.inr || '',
    'Preop_Fibrinogeno': preopLabs?.fibrinogen || '',
    'Preop_Glicemia': preopLabs?.glucose || '',
    'Preop_Sodio': preopLabs?.sodium || '',
    'Preop_Potasio': preopLabs?.potassium || '',
    'Preop_Calcio_Ionico': preopLabs?.ionicCalcium || '',
    'Preop_Magnesio': preopLabs?.magnesium || '',
    'Preop_Urea': preopLabs?.azotemia || '',
    'Preop_Creatinina': preopLabs?.creatinine || '',
    'Preop_IFG': preopLabs?.gfr || '',
    'Preop_TGO': preopLabs?.sgot || '',
    'Preop_TGP': preopLabs?.sgpt || '',
    'Preop_Bilirrubina_Total': preopLabs?.totalBili || '',
    'Preop_Albumina': preopLabs?.albumin || '',
    'Preop_TSH': preopLabs?.tsh || '',

    // Lines & Monitoring
    'CVC_1': linesMonitoring?.cvc1 || '',
    'CVC_2': linesMonitoring?.cvc2 || '',
    'CVC_3': linesMonitoring?.cvc3 || '',
    'Linea_Arterial_1': linesMonitoring?.arterialLine1 || '',
    'Linea_Arterial_2': linesMonitoring?.arterialLine2 || '',
    'Swan_Ganz': boolToSiNo(linesMonitoring?.swanGanz),
    'VVP': linesMonitoring?.peripheralIV || '',
    'Tipo_Via_Aerea': linesMonitoring?.airwayType || '',
    'Cormack_Lehane': linesMonitoring?.laryngoscopy || '',
    'Secuencia_Rapida': boolToSiNo(linesMonitoring?.tubeSellick),
    'Tipo_Anestesia': linesMonitoring?.anesthesiaType || '',
    'Premedicacion': linesMonitoring?.premedication || '',
    'ATB_Profilactico': linesMonitoring?.prophylacticATB || '',
    'Calentador': boolToSiNo(linesMonitoring?.warmer),
    'Cell_Saver': boolToSiNo(linesMonitoring?.cellSaverUsed),
    'Vendaje_Elastico': boolToSiNo(linesMonitoring?.elasticBandages),
    'Manta_Termica': boolToSiNo(linesMonitoring?.thermalBlanket),

    // Fluids totals
    'Plasmalyte_ml': fluids.plasmalyte || '',
    'Ringer_ml': fluids.ringer || '',
    'SF_ml': fluids.saline || '',
    'Dextrosa_ml': fluids.dextrose || '',
    'Coloides_ml': fluids.colloids || '',
    'Albumina_ml': fluids.albumin || '',
    'GR_Unidades': fluids.redBloodCells || '',
    'PFC_Unidades': fluids.plasma || '',
    'Plaquetas_Unidades': fluids.platelets || '',
    'Crioprecipitado_ml': fluids.cryoprecip || '',
    'Cell_Saver_ml': fluids.cellSaver || '',
    'Fibrinogeno_g': fluids.fibrinogen || '',
    'CCP_Unidades': fluids.pcc || '',
    'Factor_VII_mg': fluids.factorVII || '',
    'Perdidas_Insensibles_ml': fluids.insensibleLoss || '',
    'Ascitis_Drenada_ml': fluids.ascites || '',
    'Aspirador_ml': fluids.suction || '',
    'Gasas_ml': fluids.gauze || '',
    'Diuresis_ml': fluids.urine || '',
    'Balance_ml': fluids.balance || '',

    // Postop
    'Extubado_en_BQ': boolToSiNo(postop?.extubatedInOR),
    'Horas_ARM': postop?.mechVentHours || '',
    'Dias_ARM': postop?.mechVentDays || '',
    'Falla_Extubacion_24h': boolToSiNo(postop?.reintubation24h),
    'Reoperacion': boolToSiNo(postop?.reoperation),
    'Causa_Reoperacion': postop?.reoperationCause || '',
    'Falla_Primaria_Injerto': boolToSiNo(postop?.primaryGraftFailure),
    'IRA': boolToSiNo(postop?.acuteRenalFailure),
    'Edema_Pulmonar': boolToSiNo(postop?.pulmonaryEdema),
    'Neurotoxicidad': boolToSiNo(postop?.neurotoxicity),
    'Rechazo': boolToSiNo(postop?.rejection),
    'Complicaciones_Biliares': boolToSiNo(postop?.biliaryComplications),
    'Complicaciones_Vasculares': boolToSiNo(postop?.vascularComplications),
    'Sangrado_Quirurgico': boolToSiNo(postop?.surgicalBleeding),
    'APACHE_II': postop?.apacheInitial || '',
    'Otras_Complicaciones': postop?.otherComplications || '',
    'Dias_UCI': postop?.icuDays || '',
    'Dias_Sala': postop?.wardDays || '',
    'Fecha_Alta': formatDate(postop?.dischargeDate),

    // Mortality
    'Muerte_Precoz': boolToSiNo(mortality?.earlyDeath),
    'Fecha_Muerte': formatDate(mortality?.deathDate),
    'Causa_Muerte_Precoz': mortality?.deathCause || '',
    'Vivo_al_Alta': boolToSiNo(mortality?.aliveAtDischarge),
    'Vivo_1_Anio': mortality?.aliveAt1Year !== null ? boolToSiNo(mortality?.aliveAt1Year) : '',
    'Vivo_3_Anios': mortality?.aliveAt3Years !== null ? boolToSiNo(mortality?.aliveAt3Years) : '',
    'Vivo_5_Anios': mortality?.aliveAt5Years !== null ? boolToSiNo(mortality?.aliveAt5Years) : '',
    'Causa_Muerte_Tardia': mortality?.lateDeathCause || '',
    'Reingreso_6m': boolToSiNo(mortality?.readmissionWithin6m),
    'Dias_1er_Reingreso': mortality?.daysToFirstReadm || '',
    'Dias_2do_Reingreso': mortality?.daysToSecondReadm || '',
    'Causa_Reingreso': mortality?.readmissionCause || '',

    // Team
    'Equipo_Anestesiologos': getTeamByRole(team, 'ANESTESIOLOGO'),
    'Equipo_Cirujanos': getTeamByRole(team, 'CIRUJANO'),

    // Observations
    'Observaciones_Caso': c.observations || '',
  };

  const parser = new Parser({
    fields: Object.keys(row),
    delimiter: ',',
    quote: '"',
    header: true,
  });

  return parser.parse([row]);
}

/**
 * Generate intraop records CSV (one row per snapshot with ALL fields)
 */
async function generateIntraopRecordsCSV(caseId) {
  const data = await getCaseDataComplete(caseId);
  const { case: c, patient, intraop } = data;

  if (intraop.length === 0) {
    // Return empty CSV with headers
    const emptyRow = {
      'CI': formatCI(patient.id),
      'ID_Caso': c.id,
      'Fase': '',
      'Timestamp': '',
      // ... all other fields empty
    };
    const parser = new Parser({ fields: Object.keys(emptyRow) });
    return parser.parse([emptyRow]);
  }

  const rows = intraop.map(r => ({
    // Identifiers
    'CI': formatCI(patient.id),
    'ID_Caso': c.id,
    'Fase': r.phase || '',
    'Timestamp': r.timestamp ? new Date(r.timestamp).toISOString() : '',

    // Hemodinamia
    'FC': r.heartRate || '',
    'PAS': r.pas || '',
    'PAD': r.pad || '',
    'PAM': r.pam || '',
    'PVC': r.cvp || '',
    'SpO2': r.satO2 || '',
    'EtCO2': r.etCO2 || '',
    'Temp_Periferica': r.temp || '',
    'Temp_Central': r.tempCentral || '',

    // Swan-Ganz
    'PAPS': r.paps || '',
    'PAPD': r.papd || '',
    'PAPM': r.papm || '',
    'PCP': r.pcwp || '',
    'GC': r.cardiacOutput || '',
    'SvO2': r.svO2 || '',

    // Ventilación
    'Modo_Ventilatorio': r.ventMode || '',
    'FiO2': r.fio2 || '',
    'Vt': r.tidalVolume || '',
    'FR': r.respRate || '',
    'PEEP': r.peep || '',
    'PVA': r.peakPressure || '',
    'P_Plateau': r.plateauPressure || '',
    'Relacion_IE': r.ieRatio || '',
    'Compliance': r.compliance || '',
    'Volumen_Minuto': r.minuteVolume || '',

    // Agente inhalatorio
    'Agente_Inhalatorio': r.inhalAgent || '',
    'Agente_Fi': r.inhalAgentFi || '',
    'Agente_Et': r.inhalAgentEt || '',
    'Agente_MAC': r.inhalAgentMAC || '',

    // Monitoreo avanzado
    'BIS': r.bis || '',
    'EMG': r.emg || '',
    'Segmento_ST': r.stSegment || '',
    'Ritmo_Cardiaco': r.rhythmType || '',

    // Labs - Hematología
    'Intraop_Hb': r.hb || '',
    'Intraop_Hto': r.hto || '',
    'Intraop_Plaquetas': r.platelets || '',

    // Labs - Coagulación
    'Intraop_TP': r.pt || '',
    'Intraop_INR': r.inr || '',
    'Intraop_Fibrinogeno': r.fibrinogen || '',
    'Intraop_APTT': r.aptt || '',

    // Labs - Electrolitos
    'Intraop_Sodio': r.sodium || '',
    'Intraop_Potasio': r.potassium || '',
    'Intraop_Calcio_Ionico': r.ionicCalcium || '',
    'Intraop_Magnesio': r.magnesium || '',
    'Intraop_Cloro': r.chloride || '',
    'Intraop_Fosforo': r.phosphorus || '',

    // Labs - Gases arteriales
    'pH': r.pH || '',
    'PaO2': r.paO2 || '',
    'PaCO2': r.paCO2 || '',
    'HCO3': r.hco3 || '',
    'BE': r.baseExcess || '',
    'Lactato': r.lactate || '',
    'Anion_Gap': r.anionGap || '',
    'Osmolaridad': r.osmolarity || '',

    // Labs - Gases venosos
    'pvpH': r.pvpH || '',
    'PvO2': r.pvO2 || '',
    'PvCO2': r.pvCO2 || '',

    // Labs - Función renal
    'Intraop_Urea': r.azotemia || '',
    'Intraop_Creatinina': r.creatinine || '',

    // Labs - Función hepática
    'Intraop_TGO': r.sgot || '',
    'Intraop_TGP': r.sgpt || '',
    'Intraop_BT': r.totalBili || '',
    'Intraop_BD': r.directBili || '',
    'Intraop_Albumina': r.albumin || '',

    // Labs - Metabólicos
    'Intraop_Glicemia': r.glucose || '',

    // ETE
    'ETE_VD': r.eteRightVentricle || '',
    'ETE_TAPSE': r.eteTapse || '',
    'ETE_VI': r.eteLeftVentricle || '',
    'ETE_Dilatacion': r.eteChamberDilation || '',
    'ETE_PSAP': r.etePsap || '',
    'ETE_Trombo': r.eteThrombus || '',
    'ETE_Derrame_Pericardico': r.etePericardial || '',
    'ETE_Volemia': r.eteVolumeStatus || '',
    'ETE_Observaciones': r.eteObservations || '',

    // ROTEM
    'ROTEM_CT_EXTEM': r.rotemCtExtem || '',
    'ROTEM_CFT_EXTEM': r.rotemCftExtem || '',
    'ROTEM_A5_EXTEM': r.rotemA5Extem || '',
    'ROTEM_A10_EXTEM': r.rotemA10Extem || '',
    'ROTEM_MCF_EXTEM': r.rotemMcfExtem || '',
    'ROTEM_CLI30': r.rotemCli30 || '',
    'ROTEM_CLI60': r.rotemCli60 || '',
    'ROTEM_ML': r.rotemMl || '',
    'ROTEM_CT_FIBTEM': r.rotemCtFibtem || '',
    'ROTEM_A5_FIBTEM': r.rotemA5Fibtem || '',
    'ROTEM_A10_FIBTEM': r.rotemA10Fibtem || '',
    'ROTEM_MCF_FIBTEM': r.rotemMcfFibtem || '',
    'ROTEM_CT_INTEM': r.rotemCtIntem || '',
    'ROTEM_CT_HEPTEM': r.rotemCtHeptem || '',
    'ROTEM_A5_APTEM': r.rotemA5Aptem || '',

    // Fármacos
    'Opioide_Bolo': boolToSiNo(r.opioidBolus),
    'Opioide_Infusion': boolToSiNo(r.opioidInfusion),
    'Hipnotico_Bolo': boolToSiNo(r.hypnoticBolus),
    'Hipnotico_Infusion': boolToSiNo(r.hypnoticInfusion),
    'Relajante_Bolo': boolToSiNo(r.relaxantBolus),
    'Relajante_Infusion': boolToSiNo(r.relaxantInfusion),
    'Lidocaina_Bolo': boolToSiNo(r.lidocaineBolus),
    'Lidocaina_Infusion': boolToSiNo(r.lidocaineInfusion),
    'Adrenalina_Bolo': boolToSiNo(r.adrenalineBolus),
    'Adrenalina_Infusion': boolToSiNo(r.adrenalineInfusion),
    'Noradrenalina': boolToSiNo(r.noradrenaline),
    'Dobutamina': boolToSiNo(r.dobutamine),
    'Dopamina': boolToSiNo(r.dopamine),
    'Fenilefrina': boolToSiNo(r.phenylephrine),
    'Insulina_Bolo': boolToSiNo(r.insulinBolus),
    'Insulina_Infusion': boolToSiNo(r.insulinInfusion),
    'Furosemida': boolToSiNo(r.furosemide),
    'Ac_Tranexamico_Bolo': boolToSiNo(r.tranexamicBolus),
    'Ac_Tranexamico_Infusion': boolToSiNo(r.tranexamicInfusion),
    'Gluconato_Calcio_Bolo': boolToSiNo(r.calciumGluconBolus),
    'Gluconato_Calcio_Infusion': boolToSiNo(r.calciumGluconInfusion),
    'Bicarbonato_Sodio': boolToSiNo(r.sodiumBicarb),
    'ATB_Intraop': boolToSiNo(r.antibiotics),
  }));

  const parser = new Parser({
    fields: Object.keys(rows[0]),
    delimiter: ',',
    quote: '"',
    header: true,
  });

  return parser.parse(rows);
}

/**
 * Generate complete case CSV (summary + intraop combined)
 */
async function generateCompleteCaseCSV(caseId) {
  const summaryCSV = await generateCaseSummaryCSV(caseId);
  const intraopCSV = await generateIntraopRecordsCSV(caseId);

  return `=== RESUMEN DEL CASO ===\n${summaryCSV}\n\n=== REGISTROS INTRAOPERATORIOS ===\n${intraopCSV}`;
}

/**
 * Generate data dictionary as CSV
 */
function generateDataDictionaryCSV() {
  const rows = Object.entries(DATA_DICTIONARY).map(([variable, info]) => ({
    'Variable': variable,
    'Categoría': info.category || '',
    'Descripción': info.description || '',
    'Tipo': info.type || '',
    'Unidad': info.unit || '',
    'Rango_Normal': info.range || '',
    'Valores_Posibles': Array.isArray(info.values) ? info.values.join(' | ') : '',
    'Interpretación': info.interpretation || '',
    'Ejemplo': info.example || '',
  }));

  const parser = new Parser({
    fields: ['Variable', 'Categoría', 'Descripción', 'Tipo', 'Unidad', 'Rango_Normal', 'Valores_Posibles', 'Interpretación', 'Ejemplo'],
    delimiter: ',',
    quote: '"',
    header: true,
  });

  return parser.parse(rows);
}

/**
 * Generate data dictionary as Markdown
 */
function generateDataDictionaryMarkdown() {
  let md = `# Diccionario de Datos - Sistema de Registro Anestesiológico TxH

## Información General
- **Fecha de generación**: ${new Date().toLocaleDateString('es-UY')}
- **Total de variables**: ${Object.keys(DATA_DICTIONARY).length}

---

`;

  // Group by category
  const byCategory = {};
  for (const [variable, info] of Object.entries(DATA_DICTIONARY)) {
    const cat = info.category || 'Sin categoría';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push({ variable, ...info });
  }

  // Sort categories
  const sortedCategories = Object.keys(byCategory).sort();

  for (const category of sortedCategories) {
    md += `## ${category}\n\n`;
    md += `| Variable | Descripción | Tipo | Unidad | Rango/Valores |\n`;
    md += `|----------|-------------|------|--------|---------------|\n`;

    for (const item of byCategory[category]) {
      const range = item.range || (Array.isArray(item.values) ? item.values.slice(0, 3).join(', ') + (item.values.length > 3 ? '...' : '') : '');
      md += `| ${item.variable} | ${item.description} | ${item.type || ''} | ${item.unit || '-'} | ${range || '-'} |\n`;
    }

    md += '\n';
  }

  return md;
}

// ============================================================================
// SPSS EXPORT PROFILES
// Variables optimizadas para análisis estadístico
// ============================================================================

/**
 * SPSS Export Profiles
 * Cada perfil define un subconjunto de variables optimizado para un tipo de análisis
 */
const SPSS_PROFILES = {
  // Perfil Demográfico - Características del paciente
  demographic: {
    name: 'Demográfico',
    description: 'Datos demográficos y características basales del paciente',
    variables: [
      'ID_Caso', 'CI_Raw', 'Edad', 'Sexo', 'Peso_kg', 'Talla_cm', 'ASA',
      'Prestador', 'Grupo_Sanguineo', 'Anio', 'MELD', 'MELD_Na', 'Child_Pugh',
      'Es_Retrasplante', 'Hepato_Renal', 'Etiologia_1', 'Etiologia_2',
      'Falla_Hepatica_Fulminante', 'Hepatocarcinoma', 'Clase_Funcional'
    ],
  },

  // Perfil Comorbilidades - Antecedentes y complicaciones
  comorbidities: {
    name: 'Comorbilidades',
    description: 'Antecedentes patológicos y complicaciones de la cirrosis',
    variables: [
      'ID_Caso', 'CI_Raw', 'Edad', 'MELD', 'Child_Pugh',
      // Complicaciones cirrosis
      'Sindrome_Hepatorenal', 'Sindrome_Hepatopulmonar', 'HT_Pulmonar',
      'HT_Portal', 'Ascitis', 'Hidrotorax', 'Varices_Esofagicas',
      'Encefalopatia', 'Sangrado_Previo', 'Hiponatremia', 'PBE',
      'Trombosis_Portal', 'Hepatocarcinoma',
      // Comorbilidades
      'Cardiopatia_Coronaria', 'HTA', 'Valvulopatia', 'Arritmia',
      'Miocardiopatia_Dilatada', 'Cardiopatia_Hipertensiva',
      'EPOC_Tabaquismo', 'Asma', 'Insuficiencia_Renal', 'Monorreno',
      'Diabetes', 'Disfuncion_Tiroidea', 'Cirugia_Abdominal_Previa'
    ],
  },

  // Perfil Laboratorio - Valores de laboratorio preoperatorio
  laboratory: {
    name: 'Laboratorio',
    description: 'Valores de laboratorio preoperatorio',
    variables: [
      'ID_Caso', 'CI_Raw', 'Edad', 'MELD', 'Child_Pugh',
      'Preop_Hb', 'Preop_Hto', 'Preop_Plaquetas',
      'Preop_TP', 'Preop_INR', 'Preop_Fibrinogeno',
      'Preop_Glicemia', 'Preop_Sodio', 'Preop_Potasio',
      'Preop_Calcio_Ionico', 'Preop_Magnesio',
      'Preop_Urea', 'Preop_Creatinina', 'Preop_IFG',
      'Preop_TGO', 'Preop_TGP', 'Preop_Bilirrubina_Total',
      'Preop_Albumina', 'Preop_TSH'
    ],
  },

  // Perfil Quirúrgico - Tiempos y técnica quirúrgica
  surgical: {
    name: 'Quirúrgico',
    description: 'Variables relacionadas con el procedimiento quirúrgico',
    variables: [
      'ID_Caso', 'CI_Raw', 'Fecha_Inicio', 'Hora_Inicio', 'Hora_Fin',
      'Duracion_min', 'Tiempo_Isquemia_Fria_min', 'Tiempo_Isquemia_Caliente_min',
      'Donante_Optimo', 'Es_Retrasplante', 'Hepato_Renal',
      'Tipo_Anestesia', 'Tipo_Via_Aerea', 'Cormack_Lehane', 'Secuencia_Rapida',
      'CVC_1', 'CVC_2', 'Linea_Arterial_1', 'Swan_Ganz',
      'Cell_Saver', 'Calentador', 'Manta_Termica'
    ],
  },

  // Perfil Fluidos - Balance de fluidos y hemoderivados
  fluids: {
    name: 'Fluidos',
    description: 'Balance de fluidos, cristaloides, coloides y hemoderivados',
    variables: [
      'ID_Caso', 'CI_Raw', 'Duracion_min', 'Peso_kg',
      'Plasmalyte_ml', 'Ringer_ml', 'SF_ml', 'Dextrosa_ml',
      'Coloides_ml', 'Albumina_ml',
      'GR_Unidades', 'PFC_Unidades', 'Plaquetas_Unidades',
      'Crioprecipitados_Unidades', 'Fibrinogeno_Unidades',
      'Cell_Saver_ml', 'Diuresis_ml'
    ],
  },

  // Perfil Desenlaces - Outcomes y mortalidad
  outcomes: {
    name: 'Desenlaces',
    description: 'Complicaciones postoperatorias y mortalidad',
    variables: [
      'ID_Caso', 'CI_Raw', 'Edad', 'MELD', 'Child_Pugh', 'ASA',
      'Duracion_min', 'Es_Retrasplante',
      // Postoperatorio
      'CTI_Post', 'Complicaciones_Post', 'Reintervencion', 'Rechazo',
      'Fallo_Primario', 'Infeccion_Post', 'Dialisis_Post',
      // Mortalidad
      'Fallecido', 'Fecha_Fallecimiento', 'Dias_Hasta_Fallecimiento',
      'Mortalidad_30d', 'Mortalidad_90d', 'Mortalidad_1a',
      'Causa_Muerte'
    ],
  },

  // Perfil Completo - Todas las variables
  complete: {
    name: 'Completo',
    description: 'Todas las variables disponibles para análisis exhaustivo',
    variables: null, // null significa todas las variables
  },
};

/**
 * Get list of available SPSS profiles
 */
function getAvailableSPSSProfiles() {
  return Object.entries(SPSS_PROFILES).map(([key, profile]) => ({
    id: key,
    name: profile.name,
    description: profile.description,
    variableCount: profile.variables ? profile.variables.length : 'Todas',
  }));
}

/**
 * Generate SPSS-compatible CSV for multiple cases with a specific profile
 * IMPORTANT: Generates ONE ROW PER INTRAOP RECORD to allow case reconstruction
 * Each row contains: patient data, case data, team, preop, lines/monitoring,
 * fluids totals, postop, mortality, AND specific intraop record data
 *
 * @param {string[]} caseIds - Array of case IDs to export
 * @param {string} profileId - Profile ID (demographic, laboratory, etc.)
 * @param {Object} options - Additional options
 */
async function generateSPSSExport(caseIds, profileId = 'complete', options = {}) {
  const profile = SPSS_PROFILES[profileId];
  if (!profile) {
    throw new Error(`Perfil no válido: ${profileId}. Perfiles disponibles: ${Object.keys(SPSS_PROFILES).join(', ')}`);
  }

  const allRows = [];

  // Process each case
  for (const caseId of caseIds) {
    try {
      const data = await getCaseDataComplete(caseId);
      const { case: c, patient, preop, preopLabs, postop, mortality, team, linesMonitoring, fluidsBlood, intraop } = data;

      // Aggregate fluids - handle undefined/null fluidsBlood
      const fluids = aggregateFluidsBlood(fluidsBlood || []);

      // Calculate age at transplant
      const age = patient.birthDate && c.startAt
        ? Math.floor((new Date(c.startAt) - new Date(patient.birthDate)) / 31557600000)
        : null;

      // Get team members by role
      const anesthesiologists = getTeamByRole(team || [], 'ANESTESIOLOGO');
      const surgeons = getTeamByRole(team || [], 'CIRUJANO');
      const intensivists = getTeamByRole(team || [], 'INTENSIVISTA');
      const hepatologists = getTeamByRole(team || [], 'HEPATOLOGO');
      const nurseCoords = getTeamByRole(team || [], 'NURSE_COORD');

      // Build base row with patient, case, team, preop, lines, fluids, postop, mortality
      const baseRow = {
        // Patient identification
        'ID_Caso': c.id,
        'CI': formatCI(patient.id),
        'CI_Raw': patient.ciRaw || '',
        'Nombre_Paciente': patient.name || '',
        'Fecha_Nacimiento': formatDate(patient.birthDate),
        'Edad': age,
        'Sexo': patient.sex || '',
        'Peso_kg': patient.weight || '',
        'Talla_cm': patient.height || '',
        'ASA': patient.asa || c.asa || '',
        'Prestador': patient.provider || '',
        'Procedencia_Paciente': patient.placeOfOrigin || '',
        'Grupo_Sanguineo': patient.bloodGroup || '',

        // Team
        'Anestesiologos': anesthesiologists,
        'Cirujanos': surgeons,
        'Intensivistas': intensivists,
        'Hepatologos': hepatologists,
        'Enfermeras_Coord': nurseCoords,

        // Case
        'Fecha_Inicio': formatDate(c.startAt),
        'Hora_Inicio': formatTime(c.startAt),
        'Fecha_Fin': formatDate(c.endAt),
        'Hora_Fin': formatTime(c.endAt),
        'Anio': c.startAt ? new Date(c.startAt).getFullYear() : '',
        'Duracion_min': c.duration || '',
        'Es_Retrasplante': boolToNumeric(c.isRetransplant),
        'Hepato_Renal': boolToNumeric(c.isHepatoRenal),
        'Donante_Optimo': boolToNumeric(c.optimalDonor),
        'Procedencia_Caso': c.provenance || '',
        'Tiempo_Isquemia_Fria_min': c.coldIschemiaTime || '',
        'Tiempo_Isquemia_Caliente_min': c.warmIschemiaTime || '',
        'Origen_Datos': c.dataSource || '',

        // Preop - Scores
        'MELD': preop?.meld || '',
        'MELD_Na': preop?.meldNa || '',
        'Child_Pugh': preop?.child || '',
        'Etiologia_1': preop?.etiology1 || '',
        'Etiologia_2': preop?.etiology2 || '',
        'Falla_Hepatica_Fulminante': boolToNumeric(preop?.isFulminant),
        'Clase_Funcional': preop?.functionalClass || '',

        // Preop - Complicaciones cirrosis
        'Sindrome_Hepatorenal': boolToNumeric(preop?.hepatoRenalSyndrome),
        'Sindrome_Hepatopulmonar': boolToNumeric(preop?.hepatoPulmonarySyndr),
        'HT_Pulmonar': boolToNumeric(preop?.pulmonaryHypertension),
        'HT_Portal': boolToNumeric(preop?.portalHypertension),
        'Ascitis': boolToNumeric(preop?.ascites),
        'Hidrotorax': boolToNumeric(preop?.hydrothorax),
        'Varices_Esofagicas': boolToNumeric(preop?.esophagealVarices),
        'Encefalopatia': boolToNumeric(preop?.encephalopathy),
        'Sangrado_Previo': boolToNumeric(preop?.bleeding),
        'Hiponatremia': boolToNumeric(preop?.hyponatremia),
        'PBE': boolToNumeric(preop?.sbe),
        'Trombosis_Portal': boolToNumeric(preop?.portalThrombosis),
        'Hepatocarcinoma': boolToNumeric(preop?.hepatocarcinoma),

        // Preop - Comorbilidades
        'Cardiopatia_Coronaria': boolToNumeric(preop?.coronaryDisease),
        'HTA': boolToNumeric(preop?.hypertension),
        'Valvulopatia': preop?.valvulopathy || '',
        'Arritmia': boolToNumeric(preop?.arrhythmia),
        'Miocardiopatia_Dilatada': boolToNumeric(preop?.dilatedCardio),
        'Cardiopatia_Hipertensiva': boolToNumeric(preop?.hypertensiveCardio),
        'EPOC_Tabaquismo': boolToNumeric(preop?.smokerCOPD),
        'Asma': boolToNumeric(preop?.asthma),
        'Insuficiencia_Renal': boolToNumeric(preop?.renalFailure),
        'Monorreno': boolToNumeric(preop?.singleKidney),
        'Diabetes': boolToNumeric(preop?.diabetes),
        'Disfuncion_Tiroidea': boolToNumeric(preop?.thyroidDysfunction),
        'Cirugia_Abdominal_Previa': boolToNumeric(preop?.previousAbdSurgery),
        'Alergias': preop?.allergies || '',
        'Medicacion_Habitual': preop?.habitualMeds || '',

        // Preop - Via aerea
        'Mallampati': preop?.mpt || '',
        'Apertura_Bucal': preop?.mouthOpening || '',

        // Preop - Laboratorios
        'Preop_Hb': preopLabs?.hb || '',
        'Preop_Hto': preopLabs?.hto || '',
        'Preop_Plaquetas': preopLabs?.platelets || '',
        'Preop_TP': preopLabs?.pt || '',
        'Preop_INR': preopLabs?.inr || '',
        'Preop_Fibrinogeno': preopLabs?.fibrinogen || '',
        'Preop_Glicemia': preopLabs?.glucose || '',
        'Preop_Sodio': preopLabs?.sodium || '',
        'Preop_Potasio': preopLabs?.potassium || '',
        'Preop_Calcio_Ionico': preopLabs?.ionicCalcium || '',
        'Preop_Magnesio': preopLabs?.magnesium || '',
        'Preop_Urea': preopLabs?.azotemia || '',
        'Preop_Creatinina': preopLabs?.creatinine || '',
        'Preop_IFG': preopLabs?.gfr || '',
        'Preop_TGO': preopLabs?.sgot || '',
        'Preop_TGP': preopLabs?.sgpt || '',
        'Preop_Bilirrubina_Total': preopLabs?.totalBili || '',
        'Preop_Albumina': preopLabs?.albumin || '',
        'Preop_TSH': preopLabs?.tsh || '',

        // Lines & Monitoring
        'Tipo_Anestesia': linesMonitoring?.anesthesiaType || '',
        'Tipo_Via_Aerea': linesMonitoring?.airwayType || '',
        'Cormack_Lehane': linesMonitoring?.laryngoscopy || '',
        'Secuencia_Rapida': boolToNumeric(linesMonitoring?.tubeSellick),
        'CVC_1': linesMonitoring?.cvc1 || '',
        'CVC_2': linesMonitoring?.cvc2 || '',
        'CVC_3': linesMonitoring?.cvc3 || '',
        'Linea_Arterial_1': linesMonitoring?.arterialLine1 || '',
        'Linea_Arterial_2': linesMonitoring?.arterialLine2 || '',
        'Swan_Ganz': boolToNumeric(linesMonitoring?.swanGanz),
        'VVP': linesMonitoring?.peripheralIV || '',
        'Premedicacion': linesMonitoring?.premedication || '',
        'ATB_Profilactico': linesMonitoring?.prophylacticATB || '',
        'Cell_Saver_Usado': boolToNumeric(linesMonitoring?.cellSaverUsed),
        'Calentador': boolToNumeric(linesMonitoring?.warmer),
        'Manta_Termica': boolToNumeric(linesMonitoring?.thermalBlanket),
        'Vendaje_Elastico': boolToNumeric(linesMonitoring?.elasticBandages),

        // Fluids totals (aggregated for the entire case)
        'Total_Plasmalyte_ml': fluids.plasmalyte || '',
        'Total_Ringer_ml': fluids.ringer || '',
        'Total_SF_ml': fluids.saline || '',
        'Total_Dextrosa_ml': fluids.dextrose || '',
        'Total_Coloides_ml': fluids.colloids || '',
        'Total_Albumina_ml': fluids.albumin || '',
        'Total_GR_Unidades': fluids.redBloodCells || '',
        'Total_PFC_Unidades': fluids.plasma || '',
        'Total_Plaquetas_Unidades': fluids.platelets || '',
        'Total_Crioprecipitado_ml': fluids.cryoprecip || '',
        'Total_Cell_Saver_ml': fluids.cellSaver || '',
        'Total_Fibrinogeno_g': fluids.fibrinogen || '',
        'Total_CCP_Unidades': fluids.pcc || '',
        'Total_Factor_VII_mg': fluids.factorVII || '',
        'Total_Perdidas_Insensibles_ml': fluids.insensibleLoss || '',
        'Total_Ascitis_ml': fluids.ascites || '',
        'Total_Aspirador_ml': fluids.suction || '',
        'Total_Gasas_ml': fluids.gauze || '',
        'Total_Diuresis_ml': fluids.urine || '',
        'Total_Balance_ml': fluids.balance || '',

        // Postoperatorio
        'Extubado_en_BQ': boolToNumeric(postop?.extubatedInOR),
        'Horas_ARM': postop?.mechVentHours || '',
        'Dias_ARM': postop?.mechVentDays || '',
        'Falla_Extubacion_24h': boolToNumeric(postop?.reintubation24h),
        'Reoperacion': boolToNumeric(postop?.reoperation),
        'Causa_Reoperacion': postop?.reoperationCause || '',
        'Falla_Primaria_Injerto': boolToNumeric(postop?.primaryGraftFailure),
        'IRA': boolToNumeric(postop?.acuteRenalFailure),
        'Edema_Pulmonar': boolToNumeric(postop?.pulmonaryEdema),
        'Neurotoxicidad': boolToNumeric(postop?.neurotoxicity),
        'Rechazo': boolToNumeric(postop?.rejection),
        'Complicaciones_Biliares': boolToNumeric(postop?.biliaryComplications),
        'Complicaciones_Vasculares': boolToNumeric(postop?.vascularComplications),
        'Sangrado_Quirurgico': boolToNumeric(postop?.surgicalBleeding),
        'APACHE_II': postop?.apacheInitial || '',
        'Otras_Complicaciones': postop?.otherComplications || '',
        'Dias_UCI': postop?.icuDays || '',

        // Mortalidad
        'Fallecido': boolToNumeric(mortality?.deceased),
        'Fecha_Fallecimiento': formatDate(mortality?.deathDate),
        'Dias_Hasta_Fallecimiento': mortality?.daysToMortality || '',
        'Mortalidad_30d': boolToNumeric(mortality?.mortality30d),
        'Mortalidad_90d': boolToNumeric(mortality?.mortality90d),
        'Mortalidad_1a': boolToNumeric(mortality?.mortality1y),
        'Causa_Muerte': mortality?.causeOfDeath || '',
      };

      // If there are no intraop records, create one row with empty intraop fields
      const intraopRecords = intraop && intraop.length > 0 ? intraop : [null];

      // Generate one row per intraop record
      for (let i = 0; i < intraopRecords.length; i++) {
        const ir = intraopRecords[i];

        // Build intraop-specific fields
        const intraopFields = {
          // Intraop identification
          'Intraop_ID': ir?.id || '',
          'Intraop_Numero': i + 1,
          'Total_Registros_Intraop': intraopRecords.filter(r => r !== null).length,
          'Intraop_Fase': ir?.phase || '',
          'Intraop_Timestamp': ir?.timestamp ? new Date(ir.timestamp).toISOString() : '',
          'Intraop_Hora': formatTime(ir?.timestamp),

          // Ventilación
          'Intraop_Modo_Vent': ir?.ventMode || '',
          'Intraop_FiO2': ir?.fio2 || '',
          'Intraop_Volumen_Tidal': ir?.tidalVolume || '',
          'Intraop_FR': ir?.respRate || '',
          'Intraop_PEEP': ir?.peep || '',
          'Intraop_Presion_Pico': ir?.peakPressure || '',
          'Intraop_Presion_Meseta': ir?.plateauPressure || '',
          'Intraop_Relacion_IE': ir?.ieRatio || '',
          'Intraop_Compliance': ir?.compliance || '',
          'Intraop_Volumen_Minuto': ir?.minuteVolume || '',

          // Agente inhalatorio
          'Intraop_Agente_Inhalatorio': ir?.inhalAgent || '',
          'Intraop_Agente_Fi': ir?.inhalAgentFi || '',
          'Intraop_Agente_Et': ir?.inhalAgentEt || '',
          'Intraop_Agente_MAC': ir?.inhalAgentMAC || '',

          // Hemodinamia
          'Intraop_FC': ir?.heartRate || '',
          'Intraop_SpO2': ir?.satO2 || '',
          'Intraop_PAS': ir?.pas || '',
          'Intraop_PAD': ir?.pad || '',
          'Intraop_PAM': ir?.pam || '',
          'Intraop_PVC': ir?.cvp || '',
          'Intraop_EtCO2': ir?.etCO2 || '',
          'Intraop_Temp': ir?.temp || '',
          'Intraop_Temp_Central': ir?.tempCentral || '',

          // PAP (Swan-Ganz)
          'Intraop_PAPS': ir?.paps || '',
          'Intraop_PAPD': ir?.papd || '',
          'Intraop_PAPM': ir?.papm || '',
          'Intraop_PCP': ir?.pcwp || '',
          'Intraop_GC': ir?.cardiacOutput || '',

          // Monitoreo avanzado
          'Intraop_BIS': ir?.bis || '',
          'Intraop_EMG': ir?.emg || '',
          'Intraop_PIC': ir?.icp || '',
          'Intraop_SvO2': ir?.svO2 || '',
          'Intraop_ST': ir?.stSegment || '',
          'Intraop_Ritmo': ir?.rhythmType || '',

          // Laboratorios - Hematología
          'Intraop_Hb': ir?.hb || '',
          'Intraop_Hto': ir?.hto || '',
          'Intraop_Plaquetas': ir?.platelets || '',

          // Laboratorios - Coagulación
          'Intraop_TP': ir?.pt || '',
          'Intraop_INR': ir?.inr || '',
          'Intraop_Fibrinogeno': ir?.fibrinogen || '',
          'Intraop_APTT': ir?.aptt || '',

          // Laboratorios - Electrolitos
          'Intraop_Sodio': ir?.sodium || '',
          'Intraop_Potasio': ir?.potassium || '',
          'Intraop_Calcio_Ionico': ir?.ionicCalcium || '',
          'Intraop_Magnesio': ir?.magnesium || '',
          'Intraop_Cloro': ir?.chloride || '',
          'Intraop_Fosforo': ir?.phosphorus || '',

          // Laboratorios - Gases arteriales
          'Intraop_pH': ir?.pH || '',
          'Intraop_PaO2': ir?.paO2 || '',
          'Intraop_PaCO2': ir?.paCO2 || '',
          'Intraop_SatO2_Gas': ir?.sO2Gas || '',
          'Intraop_HCO3': ir?.hco3 || '',
          'Intraop_BE': ir?.baseExcess || '',
          'Intraop_Anion_Gap': ir?.anionGap || '',
          'Intraop_Osmolaridad': ir?.osmolarity || '',
          'Intraop_Bili_Gas': ir?.bilirubinGas || '',

          // Laboratorios - Gases venosos
          'Intraop_pH_Venoso': ir?.pvpH || '',
          'Intraop_PvO2': ir?.pvO2 || '',
          'Intraop_PvCO2': ir?.pvCO2 || '',

          // Laboratorios - Función renal
          'Intraop_Urea': ir?.azotemia || '',
          'Intraop_Creatinina': ir?.creatinine || '',

          // Laboratorios - Función hepática
          'Intraop_TGO': ir?.sgot || '',
          'Intraop_TGP': ir?.sgpt || '',
          'Intraop_Bili_Total': ir?.totalBili || '',
          'Intraop_Bili_Directa': ir?.directBili || '',
          'Intraop_Albumina': ir?.albumin || '',

          // Laboratorios - Metabólicos
          'Intraop_Glicemia': ir?.glucose || '',
          'Intraop_Lactato': ir?.lactate || '',
          'Intraop_Proteinas': ir?.proteins || '',

          // ETE
          'Intraop_ETE_VD': ir?.eteRightVentricle || '',
          'Intraop_ETE_TAPSE': ir?.eteTapse || '',
          'Intraop_ETE_VI': ir?.eteLeftVentricle || '',
          'Intraop_ETE_Dilatacion': ir?.eteChamberDilation || '',
          'Intraop_ETE_PSAP': ir?.etePsap || '',
          'Intraop_ETE_Trombo': ir?.eteThrombus || '',
          'Intraop_ETE_Pericardico': ir?.etePericardial || '',
          'Intraop_ETE_Volumen': ir?.eteVolumeStatus || '',
          'Intraop_ETE_Obs': ir?.eteObservations || '',

          // ROTEM - EXTEM
          'Intraop_ROTEM_CT_EXTEM': ir?.rotemCtExtem || '',
          'Intraop_ROTEM_CFT_EXTEM': ir?.rotemCftExtem || '',
          'Intraop_ROTEM_A5_EXTEM': ir?.rotemA5Extem || '',
          'Intraop_ROTEM_A10_EXTEM': ir?.rotemA10Extem || '',
          'Intraop_ROTEM_MCF_EXTEM': ir?.rotemMcfExtem || '',
          'Intraop_ROTEM_CLI30': ir?.rotemCli30 || '',
          'Intraop_ROTEM_CLI60': ir?.rotemCli60 || '',
          'Intraop_ROTEM_ML': ir?.rotemMl || '',

          // ROTEM - FIBTEM
          'Intraop_ROTEM_CT_FIBTEM': ir?.rotemCtFibtem || '',
          'Intraop_ROTEM_A5_FIBTEM': ir?.rotemA5Fibtem || '',
          'Intraop_ROTEM_A10_FIBTEM': ir?.rotemA10Fibtem || '',
          'Intraop_ROTEM_MCF_FIBTEM': ir?.rotemMcfFibtem || '',

          // ROTEM - INTEM/HEPTEM/APTEM
          'Intraop_ROTEM_CT_INTEM': ir?.rotemCtIntem || '',
          'Intraop_ROTEM_CT_HEPTEM': ir?.rotemCtHeptem || '',
          'Intraop_ROTEM_A5_APTEM': ir?.rotemA5Aptem || '',

          // Fármacos - Opiáceos
          'Intraop_Opiaceo_Bolo': boolToNumeric(ir?.opioidBolus),
          'Intraop_Opiaceo_Infusion': boolToNumeric(ir?.opioidInfusion),

          // Fármacos - Hipnóticos
          'Intraop_Hipnotico_Bolo': boolToNumeric(ir?.hypnoticBolus),
          'Intraop_Hipnotico_Infusion': boolToNumeric(ir?.hypnoticInfusion),

          // Fármacos - Relajantes
          'Intraop_Relajante_Bolo': boolToNumeric(ir?.relaxantBolus),
          'Intraop_Relajante_Infusion': boolToNumeric(ir?.relaxantInfusion),

          // Fármacos - Lidocaína
          'Intraop_Lidocaina_Bolo': boolToNumeric(ir?.lidocaineBolus),
          'Intraop_Lidocaina_Infusion': boolToNumeric(ir?.lidocaineInfusion),

          // Fármacos - Vasopresores/Inotrópicos
          'Intraop_Adrenalina_Bolo': boolToNumeric(ir?.adrenalineBolus),
          'Intraop_Adrenalina_Infusion': boolToNumeric(ir?.adrenalineInfusion),
          'Intraop_Dobutamina': boolToNumeric(ir?.dobutamine),
          'Intraop_Dopamina': boolToNumeric(ir?.dopamine),
          'Intraop_Noradrenalina': boolToNumeric(ir?.noradrenaline),
          'Intraop_Fenilefrina': boolToNumeric(ir?.phenylephrine),

          // Fármacos - Otros
          'Intraop_Insulina_Bolo': boolToNumeric(ir?.insulinBolus),
          'Intraop_Insulina_Infusion': boolToNumeric(ir?.insulinInfusion),
          'Intraop_Furosemida': boolToNumeric(ir?.furosemide),
          'Intraop_Tranexamico_Bolo': boolToNumeric(ir?.tranexamicBolus),
          'Intraop_Tranexamico_Infusion': boolToNumeric(ir?.tranexamicInfusion),
          'Intraop_Calcio_Bolo': boolToNumeric(ir?.calciumGluconBolus),
          'Intraop_Calcio_Infusion': boolToNumeric(ir?.calciumGluconInfusion),
          'Intraop_Bicarbonato': boolToNumeric(ir?.sodiumBicarb),
          'Intraop_ATB': boolToNumeric(ir?.antibiotics),

          // Calidad de datos
          'Intraop_Sospechoso': boolToNumeric(ir?.suspicious),
        };

        // Merge base row with intraop fields
        const fullRow = { ...baseRow, ...intraopFields };

        // Filter to only include variables from the selected profile (for complete, include all)
        let row;
        if (profile.variables === null) {
          row = fullRow;
        } else {
          row = {};
          for (const varName of profile.variables) {
            if (varName in fullRow) {
              row[varName] = fullRow[varName];
            }
          }
        }

        allRows.push(row);
      }
    } catch (error) {
      console.error(`Error processing case ${caseId}:`, error.message);
      // Continue with next case
    }
  }

  if (allRows.length === 0) {
    throw new Error('No se pudieron procesar casos para exportar');
  }

  // Clean undefined/null values - replace with empty string for SPSS compatibility
  const cleanedRows = allRows.map(row => {
    const cleaned = {};
    for (const [key, value] of Object.entries(row)) {
      cleaned[key] = value === undefined || value === null ? '' : value;
    }
    return cleaned;
  });

  // Generate CSV
  const fields = profile.variables || Object.keys(cleanedRows[0]);
  const parser = new Parser({
    fields,
    delimiter: ',',
    quote: '"',
    header: true,
  });

  const csv = parser.parse(cleanedRows);

  // Return with metadata if requested
  if (options.includeMetadata) {
    return {
      csv,
      metadata: {
        totalRows: cleanedRows.length,
        totalCases: caseIds.length,
        profile: profileId,
        variables: fields.length,
        generatedAt: new Date().toISOString(),
        note: 'Una fila por registro intraoperatorio. Cada fila incluye datos completos del caso.',
      },
    };
  }

  return { csv };
}

/**
 * Convert boolean to numeric (SPSS-friendly: 1/0 instead of Sí/No)
 */
function boolToNumeric(value) {
  if (value === true || value === 'Sí' || value === 'SI' || value === 1) return 1;
  if (value === false || value === 'No' || value === 'NO' || value === 0) return 0;
  return '';
}

/**
 * Generate SPSS syntax file for data import
 * This helps SPSS understand variable types and labels
 */
function generateSPSSSyntax(profileId = 'complete') {
  const profile = SPSS_PROFILES[profileId];
  if (!profile) return null;

  const variables = profile.variables || Object.keys(DATA_DICTIONARY);

  let syntax = `* SPSS Syntax for TxH Export - Profile: ${profile.name}.
* Generated: ${new Date().toISOString()}.

* Variable labels.
VARIABLE LABELS
`;

  for (const varName of variables) {
    const def = DATA_DICTIONARY[varName];
    if (def) {
      const label = def.description.replace(/'/g, "''").substring(0, 120);
      syntax += `  ${varName} '${label}'\n`;
    }
  }

  syntax += `.\n\n* Value labels for boolean variables.\nVALUE LABELS\n`;

  const boolVars = variables.filter(v => {
    const def = DATA_DICTIONARY[v];
    return def && (def.type === 'Boolean' || (def.values && def.values.includes('Sí')));
  });

  if (boolVars.length > 0) {
    syntax += `  ${boolVars.join(' ')}\n  0 'No'\n  1 'Sí'\n.\n`;
  }

  syntax += `\n* Execute.\nEXECUTE.\n`;

  return syntax;
}

/**
 * Get all cases for organization (for bulk export)
 */
async function getAllCasesForOrganization(organizationId, filters = {}) {
  const where = { organizationId };

  if (filters.year) {
    where.startAt = {
      gte: new Date(`${filters.year}-01-01`),
      lt: new Date(`${filters.year + 1}-01-01`),
    };
  }

  if (filters.fromDate) {
    where.startAt = { ...where.startAt, gte: new Date(filters.fromDate) };
  }

  if (filters.toDate) {
    where.startAt = { ...where.startAt, lte: new Date(filters.toDate) };
  }

  const cases = await prisma.transplantCase.findMany({
    where,
    select: { id: true },
    orderBy: { startAt: 'desc' },
  });

  return cases.map(c => c.id);
}

module.exports = {
  generateCaseSummaryCSV,
  generateIntraopRecordsCSV,
  generateCompleteCaseCSV,
  generateDataDictionaryCSV,
  generateDataDictionaryMarkdown,
  DATA_DICTIONARY,
  // SPSS exports
  SPSS_PROFILES,
  getAvailableSPSSProfiles,
  generateSPSSExport,
  generateSPSSSyntax,
  getAllCasesForOrganization,
};
