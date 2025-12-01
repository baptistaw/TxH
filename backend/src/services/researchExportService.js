// backend/src/services/researchExportService.js
/**
 * Research Export Service
 * Exports database for retrospective research studies
 * Admin-only functionality with filtering and anonymization options
 */

const prisma = require('../lib/prisma');
const { Parser } = require('json2csv');
const archiver = require('archiver');
const { Readable } = require('stream');

// ============================================================================
// DATA DICTIONARY - Complete definitions for research exports
// ============================================================================

const RESEARCH_DATA_DICTIONARY = {
  // PATIENTS TABLE
  patients: {
    patient_id: { description: 'Cédula de identidad (clave primaria)', type: 'String', example: '12345678' },
    patient_code: { description: 'Código anónimo del paciente', type: 'String', example: 'P001' },
    name: { description: 'Nombre completo (solo si no anonimizado)', type: 'String', example: 'Juan Pérez' },
    sex: { description: 'Sexo biológico', type: 'Enum', values: 'M=Masculino, F=Femenino, O=Otro', example: 'M' },
    birth_date: { description: 'Fecha de nacimiento', type: 'Date', example: '1965-03-15' },
    blood_group: { description: 'Grupo sanguíneo y factor Rh', type: 'String', values: 'A+, A-, B+, B-, AB+, AB-, O+, O-', example: 'O+' },
    weight_kg: { description: 'Peso corporal', type: 'Float', unit: 'kg', example: '72.5' },
    height_cm: { description: 'Altura', type: 'Float', unit: 'cm', example: '175' },
    bmi: { description: 'Índice de masa corporal (calculado)', type: 'Float', unit: 'kg/m²', example: '23.7' },
    provider: { description: 'Prestador de salud', type: 'Enum', example: 'CASMU' },
    place_of_origin: { description: 'Departamento de procedencia', type: 'String', example: 'Montevideo' },
    total_transplants: { description: 'Número total de trasplantes del paciente', type: 'Integer', example: '1' },
  },
  // CASES TABLE
  cases: {
    case_id: { description: 'ID único del caso', type: 'String (CUID)', example: 'clxx123abc' },
    patient_id: { description: 'CI del paciente (FK)', type: 'String', example: '12345678' },
    patient_code: { description: 'Código anónimo del paciente', type: 'String', example: 'P001' },
    case_number: { description: 'Número de trasplante para este paciente', type: 'Integer', example: '1' },
    start_date: { description: 'Fecha de inicio', type: 'Date', example: '2024-01-15' },
    start_time: { description: 'Hora de inicio', type: 'Time', example: '08:30' },
    end_date: { description: 'Fecha de fin', type: 'Date', example: '2024-01-15' },
    end_time: { description: 'Hora de fin', type: 'Time', example: '18:45' },
    duration_min: { description: 'Duración total', type: 'Integer', unit: 'minutos', example: '615' },
    year: { description: 'Año del trasplante', type: 'Integer', example: '2024' },
    is_retransplant: { description: 'Es retrasplante', type: 'Boolean', values: '0=No, 1=Sí', example: '0' },
    is_hepatorenal: { description: 'Trasplante hepato-renal', type: 'Boolean', values: '0=No, 1=Sí', example: '0' },
    optimal_donor: { description: 'Donante óptimo', type: 'Boolean', values: '0=No, 1=Sí', example: '1' },
    provenance: { description: 'Procedencia del paciente', type: 'String', values: 'Domicilio, CTI, Sala', example: 'Domicilio' },
    cold_ischemia_min: { description: 'Tiempo de isquemia fría', type: 'Integer', unit: 'minutos', example: '420' },
    warm_ischemia_min: { description: 'Tiempo de isquemia caliente', type: 'Integer', unit: 'minutos', example: '45' },
    data_source: { description: 'Origen de los datos', type: 'Enum', values: 'EXCEL_PRE_2019, APPSHEET, PLATFORM', example: 'PLATFORM' },
  },
  // PREOP TABLE
  preop: {
    preop_id: { description: 'ID de evaluación preoperatoria', type: 'String', example: 'preop001' },
    case_id: { description: 'ID del caso (FK)', type: 'String', example: 'clxx123' },
    evaluation_date: { description: 'Fecha de evaluación', type: 'Date', example: '2024-01-10' },
    meld: { description: 'MELD Score', type: 'Integer', range: '6-40', example: '25' },
    meld_na: { description: 'MELD-Na Score', type: 'Integer', range: '6-40', example: '28' },
    child_pugh: { description: 'Clasificación Child-Pugh', type: 'Enum', values: 'A, B, C', example: 'C' },
    etiology_1: { description: 'Etiología principal', type: 'String', example: 'VHC' },
    etiology_2: { description: 'Etiología secundaria', type: 'String', example: 'HDA' },
    is_fulminant: { description: 'Falla hepática fulminante', type: 'Boolean', example: '0' },
    functional_class: { description: 'Clase funcional', type: 'Enum', values: 'I, II, III, IV', example: 'III' },
    // Complicaciones cirrosis
    hepatorenal_syndrome: { description: 'Síndrome hepatorrenal', type: 'Boolean', example: '0' },
    hepatopulmonary_syndrome: { description: 'Síndrome hepatopulmonar', type: 'Boolean', example: '0' },
    pulmonary_ht: { description: 'Hipertensión pulmonar', type: 'Boolean', example: '1' },
    portal_ht: { description: 'Hipertensión portal', type: 'Boolean', example: '1' },
    ascites: { description: 'Ascitis', type: 'Boolean', example: '1' },
    hydrothorax: { description: 'Hidrotórax', type: 'Boolean', example: '0' },
    esophageal_varices: { description: 'Várices esofágicas', type: 'Boolean', example: '1' },
    encephalopathy: { description: 'Encefalopatía', type: 'Boolean', example: '0' },
    bleeding: { description: 'Sangrado previo', type: 'Boolean', example: '1' },
    hyponatremia: { description: 'Hiponatremia', type: 'Boolean', example: '1' },
    sbe: { description: 'Peritonitis bacteriana espontánea', type: 'Boolean', example: '0' },
    portal_thrombosis: { description: 'Trombosis portal', type: 'Boolean', example: '0' },
    hepatocarcinoma: { description: 'Hepatocarcinoma', type: 'Boolean', example: '0' },
    // Comorbilidades
    coronary_disease: { description: 'Cardiopatía coronaria', type: 'Boolean', example: '0' },
    hypertension: { description: 'Hipertensión arterial', type: 'Boolean', example: '1' },
    arrhythmia: { description: 'Arritmia', type: 'Boolean', example: '0' },
    dilated_cardio: { description: 'Miocardiopatía dilatada', type: 'Boolean', example: '0' },
    copd_smoker: { description: 'EPOC/Tabaquismo', type: 'Boolean', example: '0' },
    asthma: { description: 'Asma', type: 'Boolean', example: '0' },
    renal_failure: { description: 'Insuficiencia renal', type: 'Boolean', example: '0' },
    diabetes: { description: 'Diabetes', type: 'Boolean', example: '0' },
    previous_abd_surgery: { description: 'Cirugía abdominal previa', type: 'Boolean', example: '0' },
    mallampati: { description: 'Clasificación Mallampati', type: 'Enum', values: 'I, II, III, IV', example: 'II' },
    mouth_opening: { description: 'Apertura bucal', type: 'String', example: '>3cm' },
  },
  // PREOP LABS TABLE
  preop_labs: {
    lab_id: { description: 'ID del laboratorio', type: 'String', example: 'lab001' },
    preop_id: { description: 'ID de evaluación preop (FK)', type: 'String', example: 'preop001' },
    case_id: { description: 'ID del caso (FK)', type: 'String', example: 'clxx123' },
    lab_date: { description: 'Fecha del laboratorio', type: 'Date', example: '2024-01-10' },
    hb: { description: 'Hemoglobina', type: 'Float', unit: 'g/dL', example: '9.5' },
    hto: { description: 'Hematocrito', type: 'Float', unit: '%', example: '28' },
    platelets: { description: 'Plaquetas', type: 'Float', unit: '10³/µL', example: '85' },
    pt: { description: 'Tiempo de protrombina', type: 'Float', unit: 'seg', example: '18.5' },
    inr: { description: 'INR', type: 'Float', example: '1.8' },
    fibrinogen: { description: 'Fibrinógeno', type: 'Float', unit: 'mg/dL', example: '180' },
    glucose: { description: 'Glicemia', type: 'Float', unit: 'mg/dL', example: '95' },
    sodium: { description: 'Sodio', type: 'Float', unit: 'mEq/L', example: '132' },
    potassium: { description: 'Potasio', type: 'Float', unit: 'mEq/L', example: '4.2' },
    ionic_calcium: { description: 'Calcio iónico', type: 'Float', unit: 'mmol/L', example: '1.1' },
    magnesium: { description: 'Magnesio', type: 'Float', unit: 'mEq/L', example: '1.8' },
    azotemia: { description: 'Urea/BUN', type: 'Float', unit: 'mg/dL', example: '45' },
    creatinine: { description: 'Creatinina', type: 'Float', unit: 'mg/dL', example: '1.2' },
    gfr: { description: 'Índice filtrado glomerular', type: 'Float', unit: 'mL/min/1.73m²', example: '65' },
    sgot: { description: 'TGO/AST', type: 'Float', unit: 'U/L', example: '85' },
    sgpt: { description: 'TGP/ALT', type: 'Float', unit: 'U/L', example: '92' },
    total_bili: { description: 'Bilirrubina total', type: 'Float', unit: 'mg/dL', example: '4.5' },
    albumin: { description: 'Albúmina', type: 'Float', unit: 'g/dL', example: '2.8' },
    tsh: { description: 'TSH', type: 'Float', unit: 'µUI/mL', example: '2.1' },
  },
  // INTRAOP TABLE
  intraop: {
    intraop_id: { description: 'ID del registro intraoperatorio', type: 'String', example: 'ir001' },
    case_id: { description: 'ID del caso (FK)', type: 'String', example: 'clxx123' },
    record_number: { description: 'Número de registro en el caso', type: 'Integer', example: '1' },
    phase: { description: 'Fase quirúrgica', type: 'Enum', values: 'PRE_INDUCTION, INDUCTION, DISSECTION, ANHEPATIC, NEO_HEPATIC, CLOSURE', example: 'DISSECTION' },
    timestamp: { description: 'Fecha y hora del registro', type: 'DateTime', example: '2024-01-15T10:30:00' },
    // Ventilación
    vent_mode: { description: 'Modo ventilatorio', type: 'Enum', values: 'VCV, PCV, SIMV, PSV', example: 'VCV' },
    fio2: { description: 'Fracción inspirada O2', type: 'Float', range: '0.21-1.0', example: '0.5' },
    tidal_volume: { description: 'Volumen tidal', type: 'Integer', unit: 'mL', example: '500' },
    resp_rate: { description: 'Frecuencia respiratoria', type: 'Integer', unit: 'rpm', example: '12' },
    peep: { description: 'PEEP', type: 'Integer', unit: 'cmH2O', example: '5' },
    peak_pressure: { description: 'Presión pico', type: 'Integer', unit: 'cmH2O', example: '22' },
    plateau_pressure: { description: 'Presión meseta', type: 'Integer', unit: 'cmH2O', example: '18' },
    // Hemodinamia
    heart_rate: { description: 'Frecuencia cardíaca', type: 'Integer', unit: 'lpm', example: '78' },
    spo2: { description: 'Saturación O2', type: 'Integer', unit: '%', example: '98' },
    pas: { description: 'Presión arterial sistólica', type: 'Integer', unit: 'mmHg', example: '120' },
    pad: { description: 'Presión arterial diastólica', type: 'Integer', unit: 'mmHg', example: '75' },
    pam: { description: 'Presión arterial media', type: 'Integer', unit: 'mmHg', example: '90' },
    cvp: { description: 'Presión venosa central', type: 'Integer', unit: 'cmH2O', example: '8' },
    etco2: { description: 'CO2 espirado', type: 'Integer', unit: 'mmHg', example: '35' },
    temp: { description: 'Temperatura periférica', type: 'Float', unit: '°C', example: '36.2' },
    temp_central: { description: 'Temperatura central', type: 'Float', unit: '°C', example: '36.5' },
    // Swan-Ganz
    paps: { description: 'Presión arteria pulmonar sistólica', type: 'Integer', unit: 'mmHg', example: '28' },
    papd: { description: 'Presión arteria pulmonar diastólica', type: 'Integer', unit: 'mmHg', example: '12' },
    papm: { description: 'Presión arteria pulmonar media', type: 'Integer', unit: 'mmHg', example: '18' },
    pcwp: { description: 'Presión capilar pulmonar', type: 'Integer', unit: 'mmHg', example: '14' },
    cardiac_output: { description: 'Gasto cardíaco', type: 'Float', unit: 'L/min', example: '5.2' },
    // Monitoreo avanzado
    bis: { description: 'Índice biespectral', type: 'Integer', range: '0-100', example: '55' },
    svo2: { description: 'Saturación venosa mixta', type: 'Integer', unit: '%', example: '72' },
    // Laboratorios intraop
    hb: { description: 'Hemoglobina', type: 'Float', unit: 'g/dL', example: '9.5' },
    hto: { description: 'Hematocrito', type: 'Float', unit: '%', example: '28' },
    platelets: { description: 'Plaquetas', type: 'Float', unit: '10³/µL', example: '85' },
    pt: { description: 'Tiempo protrombina', type: 'Float', unit: 'seg', example: '18.5' },
    inr: { description: 'INR', type: 'Float', example: '1.8' },
    fibrinogen: { description: 'Fibrinógeno', type: 'Float', unit: 'mg/dL', example: '180' },
    aptt: { description: 'APTT', type: 'Float', unit: 'seg', example: '45' },
    sodium: { description: 'Sodio', type: 'Float', unit: 'mEq/L', example: '135' },
    potassium: { description: 'Potasio', type: 'Float', unit: 'mEq/L', example: '4.1' },
    ionic_calcium: { description: 'Calcio iónico', type: 'Float', unit: 'mmol/L', example: '1.1' },
    ph: { description: 'pH arterial', type: 'Float', example: '7.38' },
    pao2: { description: 'PaO2', type: 'Float', unit: 'mmHg', example: '95' },
    paco2: { description: 'PaCO2', type: 'Float', unit: 'mmHg', example: '38' },
    hco3: { description: 'Bicarbonato', type: 'Float', unit: 'mEq/L', example: '24' },
    base_excess: { description: 'Exceso de base', type: 'Float', unit: 'mEq/L', example: '-2' },
    lactate: { description: 'Lactato', type: 'Float', unit: 'mmol/L', example: '1.5' },
    glucose: { description: 'Glicemia', type: 'Float', unit: 'mg/dL', example: '110' },
    // ROTEM
    rotem_ct_extem: { description: 'CT EXTEM', type: 'Integer', unit: 'seg', normal: '38-79', example: '68' },
    rotem_cft_extem: { description: 'CFT EXTEM', type: 'Integer', unit: 'seg', normal: '34-159', example: '95' },
    rotem_a5_extem: { description: 'A5 EXTEM', type: 'Integer', unit: 'mm', example: '42' },
    rotem_a10_extem: { description: 'A10 EXTEM', type: 'Integer', unit: 'mm', example: '52' },
    rotem_mcf_extem: { description: 'MCF EXTEM', type: 'Integer', unit: 'mm', normal: '50-72', example: '55' },
    rotem_ct_fibtem: { description: 'CT FIBTEM', type: 'Integer', unit: 'seg', example: '45' },
    rotem_a5_fibtem: { description: 'A5 FIBTEM', type: 'Integer', unit: 'mm', normal: '>8', example: '8' },
    rotem_mcf_fibtem: { description: 'MCF FIBTEM', type: 'Integer', unit: 'mm', normal: '9-25', example: '12' },
    rotem_ct_intem: { description: 'CT INTEM', type: 'Integer', unit: 'seg', normal: '100-240', example: '165' },
    rotem_ct_heptem: { description: 'CT HEPTEM', type: 'Integer', unit: 'seg', example: '150' },
    // ETE
    ete_rv: { description: 'Función VD', type: 'String', values: 'normal, hipocinético, severamente disfuncionante', example: 'normal' },
    ete_lv: { description: 'Función VI', type: 'String', values: 'conservada, moderadamente reducida, severamente reducida', example: 'conservada' },
    ete_tapse: { description: 'TAPSE', type: 'String', values: '<16mm, 16-20mm, >20mm', example: '>20mm' },
    ete_psap: { description: 'PSAP estimada', type: 'String', values: '<40mmHg, 40-60mmHg, >60mmHg', example: '<40mmHg' },
    ete_volume: { description: 'Estado volémico', type: 'String', values: 'Hipovolemia grave, Hipovolemia leve-moderada, Normovolemia, Hipervolemia', example: 'Normovolemia' },
    // Fármacos binarios
    opioid_bolus: { description: 'Opiáceo en bolo', type: 'Boolean', example: '1' },
    opioid_infusion: { description: 'Opiáceo en infusión', type: 'Boolean', example: '1' },
    hypnotic_bolus: { description: 'Hipnótico en bolo', type: 'Boolean', example: '1' },
    hypnotic_infusion: { description: 'Hipnótico en infusión', type: 'Boolean', example: '0' },
    relaxant_bolus: { description: 'Relajante en bolo', type: 'Boolean', example: '1' },
    noradrenaline: { description: 'Noradrenalina', type: 'Boolean', example: '1' },
    dobutamine: { description: 'Dobutamina', type: 'Boolean', example: '0' },
    adrenaline_infusion: { description: 'Adrenalina en infusión', type: 'Boolean', example: '0' },
    suspicious: { description: 'Dato sospechoso (calidad)', type: 'Boolean', example: '0' },
  },
  // FLUIDS_BLOOD TABLE
  fluids_blood: {
    fb_id: { description: 'ID del registro', type: 'String', example: 'fb001' },
    case_id: { description: 'ID del caso (FK)', type: 'String', example: 'clxx123' },
    phase: { description: 'Fase quirúrgica', type: 'Enum', example: 'DISSECTION' },
    timestamp: { description: 'Fecha y hora', type: 'DateTime', example: '2024-01-15T10:00:00' },
    plasmalyte: { description: 'Plasmalyte', type: 'Integer', unit: 'mL', example: '1000' },
    ringer: { description: 'Ringer lactato', type: 'Integer', unit: 'mL', example: '0' },
    saline: { description: 'Solución fisiológica', type: 'Integer', unit: 'mL', example: '0' },
    dextrose: { description: 'Dextrosa', type: 'Integer', unit: 'mL', example: '0' },
    colloids: { description: 'Coloides', type: 'Integer', unit: 'mL', example: '500' },
    albumin: { description: 'Albúmina', type: 'Integer', unit: 'mL', example: '0' },
    red_blood_cells: { description: 'Glóbulos rojos', type: 'Integer', unit: 'unidades', example: '2' },
    plasma: { description: 'Plasma fresco congelado', type: 'Integer', unit: 'unidades', example: '2' },
    platelets: { description: 'Plaquetas', type: 'Integer', unit: 'concentrados', example: '0' },
    cryoprecip: { description: 'Crioprecipitado', type: 'Integer', unit: 'mL', example: '0' },
    cell_saver: { description: 'Cell saver', type: 'Integer', unit: 'mL', example: '0' },
    fibrinogen_g: { description: 'Fibrinógeno', type: 'Integer', unit: 'gramos', example: '0' },
    pcc: { description: 'Complejo protrombínico', type: 'Integer', unit: 'unidades', example: '0' },
    factor_vii: { description: 'Factor VII', type: 'Integer', unit: 'mg', example: '0' },
    insensible_loss: { description: 'Pérdidas insensibles', type: 'Integer', unit: 'mL', example: '500' },
    ascites: { description: 'Ascitis drenada', type: 'Integer', unit: 'mL', example: '2000' },
    suction: { description: 'Aspirador', type: 'Integer', unit: 'mL', example: '800' },
    gauze: { description: 'Gasas', type: 'Integer', unit: 'mL', example: '200' },
    urine: { description: 'Diuresis', type: 'Integer', unit: 'mL', example: '300' },
    balance: { description: 'Balance neto', type: 'Integer', unit: 'mL', example: '-800' },
  },
  // DRUGS TABLE
  drugs: {
    drug_id: { description: 'ID del registro', type: 'String', example: 'dr001' },
    case_id: { description: 'ID del caso (FK)', type: 'String', example: 'clxx123' },
    phase: { description: 'Fase quirúrgica', type: 'Enum', example: 'INDUCTION' },
    timestamp: { description: 'Fecha y hora', type: 'DateTime', example: '2024-01-15T08:35:00' },
    inhal_agent: { description: 'Agente inhalatorio', type: 'String', values: 'Sevoflurano, Isoflurano, Desflurano', example: 'Sevoflurano' },
    opioid_bolus: { description: 'Opiáceo en bolo', type: 'String', example: 'Fentanilo 200 mcg' },
    opioid_infusion: { description: 'Opiáceo en infusión', type: 'String', example: 'Remifentanilo 0.15 mcg/kg/min' },
    hypnotic_bolus: { description: 'Hipnótico en bolo', type: 'String', example: 'Propofol 150 mg' },
    hypnotic_infusion: { description: 'Hipnótico en infusión', type: 'String', example: 'Propofol TCI 3 mcg/mL' },
    relaxant_bolus: { description: 'Relajante en bolo', type: 'String', example: 'Rocuronio 60 mg' },
    noradrenaline: { description: 'Noradrenalina', type: 'String', example: '0.1 mcg/kg/min' },
    dobutamine: { description: 'Dobutamina', type: 'String', example: '5 mcg/kg/min' },
    adrenaline_infusion: { description: 'Adrenalina infusión', type: 'String', example: '0.05 mcg/kg/min' },
    insulin_infusion: { description: 'Insulina infusión', type: 'String', example: '4 U/h' },
    furosemide: { description: 'Furosemida', type: 'String', example: '20 mg' },
    tranexamic: { description: 'Ácido tranexámico', type: 'String', example: '1g bolo + 400 mg/h' },
    calcium_gluconate: { description: 'Gluconato de calcio', type: 'String', example: '2g' },
    sodium_bicarb: { description: 'Bicarbonato de sodio', type: 'String', example: '50 mEq' },
    antibiotics: { description: 'Antibióticos', type: 'String', example: 'Ceftriaxona 2g' },
    other_drugs: { description: 'Otros fármacos', type: 'String', example: 'Metilprednisolona 500 mg' },
  },
  // LINES_MONITORING TABLE
  lines_monitoring: {
    lm_id: { description: 'ID del registro', type: 'String', example: 'lm001' },
    case_id: { description: 'ID del caso (FK)', type: 'String', example: 'clxx123' },
    cvc_1: { description: 'CVC primario', type: 'String', example: 'Yugular der 3L' },
    cvc_2: { description: 'CVC secundario', type: 'String', example: 'Femoral izq 2L' },
    cvc_3: { description: 'CVC terciario', type: 'String', example: '' },
    arterial_line_1: { description: 'Línea arterial primaria', type: 'String', example: 'Radial der' },
    arterial_line_2: { description: 'Línea arterial secundaria', type: 'String', example: 'Femoral der' },
    swan_ganz: { description: 'Catéter Swan-Ganz', type: 'Boolean', example: '1' },
    peripheral_iv: { description: 'Vía periférica', type: 'String', example: '18G x2' },
    airway_type: { description: 'Tipo de vía aérea', type: 'String', values: 'IOT, TQT, ML, Espontánea', example: 'IOT' },
    tube_sellick: { description: 'Secuencia rápida/Sellick', type: 'Boolean', example: '1' },
    laryngoscopy: { description: 'Cormack-Lehane', type: 'Enum', values: 'I, II, III, IV', example: 'I' },
    anesthesia_type: { description: 'Tipo de anestesia', type: 'String', example: 'General balanceada' },
    premedication: { description: 'Premedicación', type: 'String', example: 'Midazolam 2mg' },
    warmer: { description: 'Calentador de fluidos', type: 'Boolean', example: '1' },
    cell_saver_used: { description: 'Cell saver utilizado', type: 'Boolean', example: '1' },
    elastic_bandages: { description: 'Vendaje elástico MMII', type: 'Boolean', example: '1' },
    thermal_blanket: { description: 'Manta térmica', type: 'Boolean', example: '1' },
    prophylactic_atb: { description: 'ATB profiláctico', type: 'String', example: 'Ceftriaxona 2g' },
  },
  // POSTOP TABLE
  postop: {
    postop_id: { description: 'ID del registro', type: 'String', example: 'po001' },
    case_id: { description: 'ID del caso (FK)', type: 'String', example: 'clxx123' },
    evaluation_date: { description: 'Fecha de evaluación', type: 'Date', example: '2024-01-16' },
    extubated_in_or: { description: 'Extubado en quirófano', type: 'Boolean', example: '0' },
    mech_vent_hours: { description: 'Horas de ARM', type: 'Integer', unit: 'horas', example: '48' },
    mech_vent_days: { description: 'Días de ARM', type: 'Integer', unit: 'días', example: '2' },
    reintubation_24h: { description: 'Reintubación en 24h', type: 'Boolean', example: '0' },
    reoperation: { description: 'Reoperación', type: 'Boolean', example: '0' },
    reoperation_cause: { description: 'Causa reoperación', type: 'String', example: '' },
    primary_graft_failure: { description: 'Fallo primario del injerto', type: 'Boolean', example: '0' },
    acute_renal_failure: { description: 'IRA postoperatoria', type: 'Boolean', example: '0' },
    pulmonary_edema: { description: 'Edema pulmonar', type: 'Boolean', example: '0' },
    neurotoxicity: { description: 'Neurotoxicidad', type: 'Boolean', example: '0' },
    rejection: { description: 'Rechazo', type: 'Boolean', example: '0' },
    biliary_complications: { description: 'Complicaciones biliares', type: 'Boolean', example: '0' },
    vascular_complications: { description: 'Complicaciones vasculares', type: 'Boolean', example: '0' },
    surgical_bleeding: { description: 'Sangrado quirúrgico', type: 'Boolean', example: '0' },
    apache_ii: { description: 'APACHE II inicial', type: 'Integer', example: '18' },
    other_complications: { description: 'Otras complicaciones', type: 'String', example: '' },
    icu_days: { description: 'Días en UCI', type: 'Integer', unit: 'días', example: '5' },
    ward_days: { description: 'Días en sala', type: 'Integer', unit: 'días', example: '7' },
    discharge_date: { description: 'Fecha de alta', type: 'Date', example: '2024-01-28' },
  },
  // MORTALITY TABLE
  mortality: {
    mort_id: { description: 'ID del registro', type: 'String', example: 'm001' },
    patient_id: { description: 'CI del paciente (FK)', type: 'String', example: '12345678' },
    patient_code: { description: 'Código anónimo', type: 'String', example: 'P001' },
    early_death: { description: 'Muerte precoz (<30 días)', type: 'Boolean', example: '0' },
    death_date: { description: 'Fecha de fallecimiento', type: 'Date', example: '' },
    death_cause: { description: 'Causa de muerte', type: 'String', example: '' },
    alive_at_discharge: { description: 'Vivo al alta', type: 'Boolean', example: '1' },
    alive_at_1year: { description: 'Vivo al año', type: 'Boolean', example: '1' },
    alive_at_3years: { description: 'Vivo a 3 años', type: 'Boolean', example: '' },
    alive_at_5years: { description: 'Vivo a 5 años', type: 'Boolean', example: '' },
    late_death_cause: { description: 'Causa muerte tardía', type: 'String', example: '' },
    readmission_within_6m: { description: 'Reingreso en 6 meses', type: 'Boolean', example: '0' },
    days_to_first_readm: { description: 'Días hasta primer reingreso', type: 'Integer', example: '' },
    readmission_cause: { description: 'Causa reingreso', type: 'String', example: '' },
  },
  // TEAM TABLE
  team: {
    team_id: { description: 'ID de asignación', type: 'String', example: 't001' },
    case_id: { description: 'ID del caso (FK)', type: 'String', example: 'clxx123' },
    clinician_id: { description: 'ID del clínico', type: 'Integer', example: '15' },
    clinician_name: { description: 'Nombre del clínico', type: 'String', example: 'Dr. García' },
    role: { description: 'Rol en el equipo', type: 'Enum', values: 'ANESTESIOLOGO, CIRUJANO, HEPATOLOGO, INTENSIVISTA, NURSE_COORD', example: 'ANESTESIOLOGO' },
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
}

function formatTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDateTime(date) {
  if (!date) return '';
  return new Date(date).toISOString();
}

function boolToInt(val) {
  if (val === true) return 1;
  if (val === false) return 0;
  return '';
}

function calculateBMI(weight, height) {
  if (!weight || !height) return '';
  const heightM = height / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
}

/**
 * Generate anonymous patient codes
 */
function generatePatientCodes(patients) {
  const codes = {};
  patients.forEach((p, i) => {
    codes[p.id] = `P${String(i + 1).padStart(4, '0')}`;
  });
  return codes;
}

// ============================================================================
// EXPORT GENERATORS
// ============================================================================

/**
 * Generate patients.csv
 */
async function generatePatientsCSV(filters, options) {
  const where = buildPatientFilters(filters);

  const patients = await prisma.patient.findMany({
    where,
    include: {
      cases: {
        where: { deletedAt: null },
        orderBy: { startAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const patientCodes = options.anonymize ? generatePatientCodes(patients) : null;

  const rows = patients.map(p => {
    const firstCase = p.cases[0];
    const ageAtFirstTx = p.birthDate && firstCase?.startAt
      ? Math.floor((new Date(firstCase.startAt) - new Date(p.birthDate)) / 31557600000)
      : '';

    return {
      patient_id: options.anonymize ? '' : p.id,
      patient_code: patientCodes ? patientCodes[p.id] : p.id,
      name: options.anonymize ? '' : (p.name || ''),
      sex: p.sex || '',
      birth_date: formatDate(p.birthDate),
      blood_group: p.bloodGroup || '',
      weight_kg: p.weight || '',
      height_cm: p.height || '',
      bmi: calculateBMI(p.weight, p.height),
      provider: p.provider || '',
      place_of_origin: p.placeOfOrigin || '',
      age_at_first_tx: ageAtFirstTx,
      total_transplants: p.cases.length,
    };
  });

  return { rows, patientCodes };
}

/**
 * Generate cases.csv
 */
async function generateCasesCSV(filters, patientCodes, options) {
  const where = buildCaseFilters(filters);

  const cases = await prisma.transplantCase.findMany({
    where,
    include: {
      patient: true,
    },
    orderBy: { startAt: 'asc' },
  });

  // Calcular número de caso por paciente
  const patientCaseCount = {};

  const rows = cases.map(c => {
    const patientId = c.patientId;
    patientCaseCount[patientId] = (patientCaseCount[patientId] || 0) + 1;

    return {
      case_id: c.id,
      patient_id: options.anonymize ? '' : patientId,
      patient_code: patientCodes ? patientCodes[patientId] : patientId,
      case_number: patientCaseCount[patientId],
      start_date: formatDate(c.startAt),
      start_time: formatTime(c.startAt),
      end_date: formatDate(c.endAt),
      end_time: formatTime(c.endAt),
      duration_min: c.duration || '',
      year: c.startAt ? new Date(c.startAt).getFullYear() : '',
      is_retransplant: boolToInt(c.isRetransplant),
      is_hepatorenal: boolToInt(c.isHepatoRenal),
      optimal_donor: boolToInt(c.optimalDonor),
      provenance: c.provenance || '',
      cold_ischemia_min: c.coldIschemiaTime || '',
      warm_ischemia_min: c.warmIschemiaTime || '',
      data_source: c.dataSource || '',
    };
  });

  return rows;
}

/**
 * Generate preop.csv
 */
async function generatePreopCSV(caseIds) {
  const preops = await prisma.preopEvaluation.findMany({
    where: { caseId: { in: caseIds } },
    orderBy: { evaluationDate: 'desc' },
  });

  // Solo tomar el más reciente por caso
  const latestByCase = {};
  preops.forEach(p => {
    if (!latestByCase[p.caseId]) {
      latestByCase[p.caseId] = p;
    }
  });

  return Object.values(latestByCase).map(p => ({
    preop_id: p.id,
    case_id: p.caseId,
    evaluation_date: formatDate(p.evaluationDate),
    meld: p.meld || '',
    meld_na: p.meldNa || '',
    child_pugh: p.child || '',
    etiology_1: p.etiology1 || '',
    etiology_2: p.etiology2 || '',
    is_fulminant: boolToInt(p.isFulminant),
    functional_class: p.functionalClass || '',
    hepatorenal_syndrome: boolToInt(p.hepatoRenalSyndrome),
    hepatopulmonary_syndrome: boolToInt(p.hepatoPulmonarySyndr),
    pulmonary_ht: boolToInt(p.pulmonaryHypertension),
    portal_ht: boolToInt(p.portalHypertension),
    ascites: boolToInt(p.ascites),
    hydrothorax: boolToInt(p.hydrothorax),
    esophageal_varices: boolToInt(p.esophagealVarices),
    encephalopathy: boolToInt(p.encephalopathy),
    bleeding: boolToInt(p.bleeding),
    hyponatremia: boolToInt(p.hyponatremia),
    sbe: boolToInt(p.sbe),
    portal_thrombosis: boolToInt(p.portalThrombosis),
    hepatocarcinoma: boolToInt(p.hepatocarcinoma),
    coronary_disease: boolToInt(p.coronaryDisease),
    hypertension: boolToInt(p.hypertension),
    valvulopathy: p.valvulopathy || '',
    arrhythmia: boolToInt(p.arrhythmia),
    dilated_cardio: boolToInt(p.dilatedCardio),
    hypertensive_cardio: boolToInt(p.hypertensiveCardio),
    copd_smoker: boolToInt(p.smokerCOPD),
    asthma: boolToInt(p.asthma),
    renal_failure: boolToInt(p.renalFailure),
    single_kidney: boolToInt(p.singleKidney),
    diabetes: boolToInt(p.diabetes),
    thyroid_dysfunction: boolToInt(p.thyroidDysfunction),
    previous_abd_surgery: boolToInt(p.previousAbdSurgery),
    abd_surgery_detail: p.abdSurgeryDetail || '',
    reflux_ulcer: boolToInt(p.refluxUlcer),
    allergies: p.allergies || '',
    mechanical_vent: boolToInt(p.mechanicalVent),
    habitual_meds: p.habitualMeds || '',
    mallampati: p.mpt || '',
    mouth_opening: p.mouthOpening || '',
  }));
}

/**
 * Generate preop_labs.csv
 */
async function generatePreopLabsCSV(caseIds) {
  const preops = await prisma.preopEvaluation.findMany({
    where: { caseId: { in: caseIds } },
    include: {
      labs: {
        orderBy: { labDate: 'desc' },
        take: 1,
      },
    },
  });

  const rows = [];
  preops.forEach(p => {
    if (p.labs && p.labs.length > 0) {
      const lab = p.labs[0];
      rows.push({
        lab_id: lab.id,
        preop_id: p.id,
        case_id: p.caseId,
        lab_date: formatDate(lab.labDate),
        hb: lab.hb || '',
        hto: lab.hto || '',
        platelets: lab.platelets || '',
        pt: lab.pt || '',
        inr: lab.inr || '',
        fibrinogen: lab.fibrinogen || '',
        glucose: lab.glucose || '',
        sodium: lab.sodium || '',
        potassium: lab.potassium || '',
        ionic_calcium: lab.ionicCalcium || '',
        magnesium: lab.magnesium || '',
        azotemia: lab.azotemia || '',
        creatinine: lab.creatinine || '',
        gfr: lab.gfr || '',
        sgot: lab.sgot || '',
        sgpt: lab.sgpt || '',
        total_bili: lab.totalBili || '',
        albumin: lab.albumin || '',
        tsh: lab.tsh || '',
      });
    }
  });

  return rows;
}

/**
 * Generate intraop.csv
 */
async function generateIntraopCSV(caseIds) {
  const records = await prisma.intraopRecord.findMany({
    where: { caseId: { in: caseIds } },
    orderBy: [{ caseId: 'asc' }, { phase: 'asc' }, { timestamp: 'asc' }],
  });

  // Agregar número de registro por caso
  const caseRecordCount = {};

  return records.map(r => {
    caseRecordCount[r.caseId] = (caseRecordCount[r.caseId] || 0) + 1;

    return {
      intraop_id: r.id,
      case_id: r.caseId,
      record_number: caseRecordCount[r.caseId],
      phase: r.phase || '',
      timestamp: formatDateTime(r.timestamp),
      // Ventilación
      vent_mode: r.ventMode || '',
      fio2: r.fio2 || '',
      tidal_volume: r.tidalVolume || '',
      resp_rate: r.respRate || '',
      peep: r.peep || '',
      peak_pressure: r.peakPressure || '',
      plateau_pressure: r.plateauPressure || '',
      ie_ratio: r.ieRatio || '',
      compliance: r.compliance || '',
      minute_volume: r.minuteVolume || '',
      // Agente inhalatorio
      inhal_agent: r.inhalAgent || '',
      inhal_agent_fi: r.inhalAgentFi || '',
      inhal_agent_et: r.inhalAgentEt || '',
      inhal_agent_mac: r.inhalAgentMAC || '',
      // Hemodinamia
      heart_rate: r.heartRate || '',
      spo2: r.satO2 || '',
      pas: r.pas || '',
      pad: r.pad || '',
      pam: r.pam || '',
      cvp: r.cvp || '',
      etco2: r.etCO2 || '',
      temp: r.temp || '',
      temp_central: r.tempCentral || '',
      // Swan-Ganz
      paps: r.paps || '',
      papd: r.papd || '',
      papm: r.papm || '',
      pcwp: r.pcwp || '',
      cardiac_output: r.cardiacOutput || '',
      // Monitoreo avanzado
      bis: r.bis || '',
      emg: r.emg || '',
      icp: r.icp || '',
      svo2: r.svO2 || '',
      st_segment: r.stSegment || '',
      rhythm_type: r.rhythmType || '',
      // Labs
      hb: r.hb || '',
      hto: r.hto || '',
      platelets: r.platelets || '',
      pt: r.pt || '',
      inr: r.inr || '',
      fibrinogen: r.fibrinogen || '',
      aptt: r.aptt || '',
      sodium: r.sodium || '',
      potassium: r.potassium || '',
      ionic_calcium: r.ionicCalcium || '',
      magnesium: r.magnesium || '',
      chloride: r.chloride || '',
      phosphorus: r.phosphorus || '',
      // Gases arteriales
      ph: r.pH || '',
      pao2: r.paO2 || '',
      paco2: r.paCO2 || '',
      so2_gas: r.sO2Gas || '',
      hco3: r.hco3 || '',
      base_excess: r.baseExcess || '',
      anion_gap: r.anionGap || '',
      osmolarity: r.osmolarity || '',
      bilirubin_gas: r.bilirubinGas || '',
      // Gases venosos
      pv_ph: r.pvpH || '',
      pvo2: r.pvO2 || '',
      pvco2: r.pvCO2 || '',
      // Función renal
      azotemia: r.azotemia || '',
      creatinine: r.creatinine || '',
      // Función hepática
      sgot: r.sgot || '',
      sgpt: r.sgpt || '',
      total_bili: r.totalBili || '',
      direct_bili: r.directBili || '',
      albumin: r.albumin || '',
      // Metabólicos
      glucose: r.glucose || '',
      lactate: r.lactate || '',
      proteins: r.proteins || '',
      // ETE
      ete_rv: r.eteRightVentricle || '',
      ete_tapse: r.eteTapse || '',
      ete_lv: r.eteLeftVentricle || '',
      ete_chamber_dilation: r.eteChamberDilation || '',
      ete_psap: r.etePsap || '',
      ete_thrombus: r.eteThrombus || '',
      ete_pericardial: r.etePericardial || '',
      ete_volume: r.eteVolumeStatus || '',
      ete_observations: r.eteObservations || '',
      // ROTEM
      rotem_ct_extem: r.rotemCtExtem || '',
      rotem_cft_extem: r.rotemCftExtem || '',
      rotem_a5_extem: r.rotemA5Extem || '',
      rotem_a10_extem: r.rotemA10Extem || '',
      rotem_mcf_extem: r.rotemMcfExtem || '',
      rotem_cli30: r.rotemCli30 || '',
      rotem_cli60: r.rotemCli60 || '',
      rotem_ml: r.rotemMl || '',
      rotem_ct_fibtem: r.rotemCtFibtem || '',
      rotem_a5_fibtem: r.rotemA5Fibtem || '',
      rotem_a10_fibtem: r.rotemA10Fibtem || '',
      rotem_mcf_fibtem: r.rotemMcfFibtem || '',
      rotem_ct_intem: r.rotemCtIntem || '',
      rotem_ct_heptem: r.rotemCtHeptem || '',
      rotem_a5_aptem: r.rotemA5Aptem || '',
      // Fármacos
      opioid_bolus: boolToInt(r.opioidBolus),
      opioid_infusion: boolToInt(r.opioidInfusion),
      hypnotic_bolus: boolToInt(r.hypnoticBolus),
      hypnotic_infusion: boolToInt(r.hypnoticInfusion),
      relaxant_bolus: boolToInt(r.relaxantBolus),
      relaxant_infusion: boolToInt(r.relaxantInfusion),
      lidocaine_bolus: boolToInt(r.lidocaineBolus),
      lidocaine_infusion: boolToInt(r.lidocaineInfusion),
      adrenaline_bolus: boolToInt(r.adrenalineBolus),
      adrenaline_infusion: boolToInt(r.adrenalineInfusion),
      dobutamine: boolToInt(r.dobutamine),
      dopamine: boolToInt(r.dopamine),
      noradrenaline: boolToInt(r.noradrenaline),
      phenylephrine: boolToInt(r.phenylephrine),
      insulin_bolus: boolToInt(r.insulinBolus),
      insulin_infusion: boolToInt(r.insulinInfusion),
      furosemide: boolToInt(r.furosemide),
      tranexamic_bolus: boolToInt(r.tranexamicBolus),
      tranexamic_infusion: boolToInt(r.tranexamicInfusion),
      calcium_bolus: boolToInt(r.calciumGluconBolus),
      calcium_infusion: boolToInt(r.calciumGluconInfusion),
      sodium_bicarb: boolToInt(r.sodiumBicarb),
      antibiotics: boolToInt(r.antibiotics),
      suspicious: boolToInt(r.suspicious),
    };
  });
}

/**
 * Generate fluids_blood.csv
 */
async function generateFluidsBloodCSV(caseIds) {
  const records = await prisma.fluidsAndBlood.findMany({
    where: { caseId: { in: caseIds } },
    orderBy: [{ caseId: 'asc' }, { phase: 'asc' }, { timestamp: 'asc' }],
  });

  return records.map(r => ({
    fb_id: r.id,
    case_id: r.caseId,
    phase: r.phase || '',
    timestamp: formatDateTime(r.timestamp),
    plasmalyte: r.plasmalyte || 0,
    ringer: r.ringer || 0,
    saline: r.saline || 0,
    dextrose: r.dextrose || 0,
    colloids: r.colloids || 0,
    albumin: r.albumin || 0,
    red_blood_cells: r.redBloodCells || 0,
    plasma: r.plasma || 0,
    platelets: r.platelets || 0,
    cryoprecip: r.cryoprecip || 0,
    cell_saver: r.cellSaver || 0,
    fibrinogen_g: r.fibrinogen || 0,
    pcc: r.pcc || 0,
    factor_vii: r.factorVII || 0,
    other_fluids: r.otherFluids || '',
    insensible_loss: r.insensibleLoss || 0,
    ascites: r.ascites || 0,
    suction: r.suction || 0,
    gauze: r.gauze || 0,
    urine: r.urine || 0,
    balance: r.balance || '',
  }));
}

/**
 * Generate drugs.csv
 */
async function generateDrugsCSV(caseIds) {
  const records = await prisma.drugsGiven.findMany({
    where: { caseId: { in: caseIds } },
    orderBy: [{ caseId: 'asc' }, { phase: 'asc' }, { timestamp: 'asc' }],
  });

  return records.map(r => ({
    drug_id: r.id,
    case_id: r.caseId,
    phase: r.phase || '',
    timestamp: formatDateTime(r.timestamp),
    inhal_agent: r.inhalAgent || '',
    opioid_bolus: r.opioidBolus || '',
    opioid_infusion: r.opioidInfusion || '',
    hypnotic_bolus: r.hypnoticBolus || '',
    hypnotic_infusion: r.hypnoticInfusion || '',
    relaxant_bolus: r.relaxantBolus || '',
    relaxant_infusion: r.relaxantInfusion || '',
    lidocaine_bolus: r.lidocaineBolus || '',
    lidocaine_infusion: r.lidocaineInfusion || '',
    adrenaline_bolus: r.adrenalineBolus || '',
    adrenaline_infusion: r.adrenalineInfusion || '',
    dobutamine: r.dobutamine || '',
    dopamine: r.dopamine || '',
    noradrenaline: r.noradrenaline || '',
    phenylephrine: r.phenylephrine || '',
    insulin_bolus: r.insulinBolus || '',
    insulin_infusion: r.insulinInfusion || '',
    furosemide: r.furosemide || '',
    tranexamic: r.tranexamic || '',
    calcium_gluconate: r.calciumGlucon || '',
    sodium_bicarb: r.sodiumBicarb || '',
    antibiotics: r.antibiotics || '',
    other_drugs: r.otherDrugs || '',
  }));
}

/**
 * Generate lines_monitoring.csv
 */
async function generateLinesMonitoringCSV(caseIds) {
  const records = await prisma.linesAndMonitoring.findMany({
    where: { caseId: { in: caseIds } },
  });

  return records.map(r => ({
    lm_id: r.id,
    case_id: r.caseId,
    cvc_1: r.cvc1 || '',
    cvc_2: r.cvc2 || '',
    cvc_3: r.cvc3 || '',
    arterial_line_1: r.arterialLine1 || '',
    arterial_line_2: r.arterialLine2 || '',
    swan_ganz: boolToInt(r.swanGanz),
    peripheral_iv: r.peripheralIV || '',
    airway_type: r.airwayType || '',
    tube_sellick: boolToInt(r.tubeSellick),
    laryngoscopy: r.laryngoscopy || '',
    anesthesia_type: r.anesthesiaType || '',
    premedication: r.premedication || '',
    warmer: boolToInt(r.warmer),
    cell_saver_used: boolToInt(r.cellSaverUsed),
    elastic_bandages: boolToInt(r.elasticBandages),
    pressure_points: r.pressurePoints || '',
    thermal_blanket: boolToInt(r.thermalBlanket),
    prophylactic_atb: r.prophylacticATB || '',
  }));
}

/**
 * Generate postop.csv
 */
async function generatePostopCSV(caseIds) {
  const records = await prisma.postOpOutcome.findMany({
    where: { caseId: { in: caseIds } },
  });

  return records.map(r => ({
    postop_id: r.id,
    case_id: r.caseId,
    evaluation_date: formatDate(r.evaluationDate),
    extubated_in_or: boolToInt(r.extubatedInOR),
    mech_vent_hours: r.mechVentHours || '',
    mech_vent_days: r.mechVentDays || '',
    reintubation_24h: boolToInt(r.reintubation24h),
    reoperation: boolToInt(r.reoperation),
    reoperation_cause: r.reoperationCause || '',
    primary_graft_failure: boolToInt(r.primaryGraftFailure),
    acute_renal_failure: boolToInt(r.acuteRenalFailure),
    pulmonary_edema: boolToInt(r.pulmonaryEdema),
    neurotoxicity: boolToInt(r.neurotoxicity),
    rejection: boolToInt(r.rejection),
    biliary_complications: boolToInt(r.biliaryComplications),
    vascular_complications: boolToInt(r.vascularComplications),
    surgical_bleeding: boolToInt(r.surgicalBleeding),
    apache_ii: r.apacheInitial || '',
    other_complications: r.otherComplications || '',
    icu_days: r.icuDays || '',
    ward_days: r.wardDays || '',
    discharge_date: formatDate(r.dischargeDate),
  }));
}

/**
 * Generate mortality.csv
 */
async function generateMortalityCSV(patientIds, patientCodes, options) {
  const records = await prisma.mortality.findMany({
    where: { patientId: { in: patientIds } },
  });

  return records.map(r => ({
    mort_id: r.id,
    patient_id: options.anonymize ? '' : r.patientId,
    patient_code: patientCodes ? patientCodes[r.patientId] : r.patientId,
    early_death: boolToInt(r.earlyDeath),
    death_date: formatDate(r.deathDate),
    death_cause: r.deathCause || '',
    alive_at_discharge: boolToInt(r.aliveAtDischarge),
    alive_at_1year: r.aliveAt1Year !== null ? boolToInt(r.aliveAt1Year) : '',
    alive_at_3years: r.aliveAt3Years !== null ? boolToInt(r.aliveAt3Years) : '',
    alive_at_5years: r.aliveAt5Years !== null ? boolToInt(r.aliveAt5Years) : '',
    late_death_cause: r.lateDeathCause || '',
    readmission_within_6m: boolToInt(r.readmissionWithin6m),
    days_to_first_readm: r.daysToFirstReadm || '',
    days_to_second_readm: r.daysToSecondReadm || '',
    readmission_cause: r.readmissionCause || '',
  }));
}

/**
 * Generate team.csv
 */
async function generateTeamCSV(caseIds) {
  const records = await prisma.teamAssignment.findMany({
    where: { caseId: { in: caseIds } },
    include: {
      clinician: true,
    },
  });

  return records.map(r => ({
    team_id: r.id,
    case_id: r.caseId,
    clinician_id: r.clinicianId,
    clinician_name: r.clinician?.name || '',
    role: r.role || '',
  }));
}

/**
 * Generate data_dictionary.csv
 */
function generateDataDictionaryCSV(tables) {
  const rows = [];

  tables.forEach(tableName => {
    const tableDict = RESEARCH_DATA_DICTIONARY[tableName];
    if (tableDict) {
      Object.entries(tableDict).forEach(([variable, def]) => {
        rows.push({
          table: tableName,
          variable,
          description: def.description || '',
          type: def.type || '',
          unit: def.unit || '',
          values: def.values || '',
          range: def.range || '',
          normal: def.normal || '',
          example: def.example || '',
        });
      });
    }
  });

  return rows;
}

// ============================================================================
// FILTER BUILDERS
// ============================================================================

function buildPatientFilters(filters) {
  const where = {};

  if (filters.patientIds && filters.patientIds.length > 0) {
    where.id = { in: filters.patientIds };
  }

  return where;
}

function buildCaseFilters(filters) {
  const where = { deletedAt: null };

  if (filters.organizationId) {
    where.organizationId = filters.organizationId;
  }

  if (filters.fromDate || filters.toDate) {
    where.startAt = {};
    if (filters.fromDate) {
      where.startAt.gte = new Date(filters.fromDate);
    }
    if (filters.toDate) {
      where.startAt.lte = new Date(filters.toDate);
    }
  }

  if (filters.year) {
    where.startAt = {
      gte: new Date(`${filters.year}-01-01`),
      lt: new Date(`${filters.year + 1}-01-01`),
    };
  }

  if (filters.dataSources && filters.dataSources.length > 0) {
    where.dataSource = { in: filters.dataSources };
  }

  if (filters.includeRetransplants === false) {
    where.isRetransplant = false;
  }

  if (filters.includeHepatoRenal === false) {
    where.isHepatoRenal = false;
  }

  return where;
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Generate research export
 * @param {Object} filters - Filtering options
 * @param {Object} options - Export options
 * @returns {Object} - { files: [{name, content}], stats }
 */
async function generateResearchExport(filters = {}, options = {}) {
  const {
    tables = ['patients', 'cases', 'preop', 'preop_labs', 'intraop', 'fluids_blood', 'drugs', 'lines_monitoring', 'postop', 'mortality', 'team'],
    anonymize = false,
    includeDataDictionary = true,
    format = 'multiple', // 'multiple' or 'single'
  } = options;

  const files = [];
  const stats = {
    patients: 0,
    cases: 0,
    intraopRecords: 0,
    generatedAt: new Date().toISOString(),
  };

  // Step 1: Get patients and generate codes
  let patientCodes = null;
  let patientIds = [];

  if (tables.includes('patients') || tables.includes('mortality')) {
    const { rows: patientRows, patientCodes: codes } = await generatePatientsCSV(filters, { anonymize });
    patientCodes = codes;
    patientIds = patientRows.map(p => anonymize ? '' : p.patient_id).filter(Boolean);

    if (!anonymize) {
      // Get actual patient IDs from DB
      const patients = await prisma.patient.findMany({
        where: buildPatientFilters(filters),
        select: { id: true },
      });
      patientIds = patients.map(p => p.id);
    }

    stats.patients = patientRows.length;

    if (tables.includes('patients')) {
      files.push({
        name: 'patients.csv',
        content: generateCSV(patientRows),
      });
    }
  }

  // Step 2: Get cases
  let caseIds = [];
  if (tables.some(t => ['cases', 'preop', 'preop_labs', 'intraop', 'fluids_blood', 'drugs', 'lines_monitoring', 'postop', 'team'].includes(t))) {
    const caseRows = await generateCasesCSV(filters, patientCodes, { anonymize });
    caseIds = caseRows.map(c => c.case_id);
    stats.cases = caseRows.length;

    if (tables.includes('cases')) {
      files.push({
        name: 'cases.csv',
        content: generateCSV(caseRows),
      });
    }
  }

  // Step 3: Generate remaining tables
  if (tables.includes('preop') && caseIds.length > 0) {
    const rows = await generatePreopCSV(caseIds);
    files.push({ name: 'preop.csv', content: generateCSV(rows) });
  }

  if (tables.includes('preop_labs') && caseIds.length > 0) {
    const rows = await generatePreopLabsCSV(caseIds);
    files.push({ name: 'preop_labs.csv', content: generateCSV(rows) });
  }

  if (tables.includes('intraop') && caseIds.length > 0) {
    const rows = await generateIntraopCSV(caseIds);
    stats.intraopRecords = rows.length;
    files.push({ name: 'intraop.csv', content: generateCSV(rows) });
  }

  if (tables.includes('fluids_blood') && caseIds.length > 0) {
    const rows = await generateFluidsBloodCSV(caseIds);
    files.push({ name: 'fluids_blood.csv', content: generateCSV(rows) });
  }

  if (tables.includes('drugs') && caseIds.length > 0) {
    const rows = await generateDrugsCSV(caseIds);
    files.push({ name: 'drugs.csv', content: generateCSV(rows) });
  }

  if (tables.includes('lines_monitoring') && caseIds.length > 0) {
    const rows = await generateLinesMonitoringCSV(caseIds);
    files.push({ name: 'lines_monitoring.csv', content: generateCSV(rows) });
  }

  if (tables.includes('postop') && caseIds.length > 0) {
    const rows = await generatePostopCSV(caseIds);
    files.push({ name: 'postop.csv', content: generateCSV(rows) });
  }

  if (tables.includes('mortality') && patientIds.length > 0) {
    const rows = await generateMortalityCSV(patientIds, patientCodes, { anonymize });
    files.push({ name: 'mortality.csv', content: generateCSV(rows) });
  }

  if (tables.includes('team') && caseIds.length > 0) {
    const rows = await generateTeamCSV(caseIds);
    files.push({ name: 'team.csv', content: generateCSV(rows) });
  }

  // Step 4: Data dictionary
  if (includeDataDictionary) {
    const dictRows = generateDataDictionaryCSV(tables);
    files.push({ name: 'data_dictionary.csv', content: generateCSV(dictRows) });
  }

  // Step 5: README
  files.push({
    name: 'README.txt',
    content: generateReadme(stats, tables, options),
  });

  return { files, stats };
}

/**
 * Convert rows to CSV string
 */
function generateCSV(rows) {
  if (!rows || rows.length === 0) {
    return '';
  }

  const fields = Object.keys(rows[0]);
  const parser = new Parser({
    fields,
    delimiter: ',',
    quote: '"',
    header: true,
  });

  return parser.parse(rows);
}

/**
 * Generate README content
 */
function generateReadme(stats, tables, options) {
  return `=============================================================================
EXPORTACIÓN PARA INVESTIGACIÓN - TxH Registro Anestesiológico
=============================================================================

Fecha de generación: ${stats.generatedAt}

CONTENIDO DEL ARCHIVO:
- Pacientes: ${stats.patients}
- Casos de trasplante: ${stats.cases}
- Registros intraoperatorios: ${stats.intraopRecords}

TABLAS INCLUIDAS:
${tables.map(t => `- ${t}.csv`).join('\n')}

OPCIONES DE EXPORTACIÓN:
- Datos anonimizados: ${options.anonymize ? 'Sí' : 'No'}
- Diccionario de datos incluido: ${options.includeDataDictionary ? 'Sí' : 'No'}

ESTRUCTURA RELACIONAL:
- patients.csv: patient_id (clave primaria)
- cases.csv: case_id (clave primaria), patient_id (FK a patients)
- preop.csv: preop_id (clave primaria), case_id (FK a cases)
- preop_labs.csv: lab_id (clave primaria), preop_id (FK a preop)
- intraop.csv: intraop_id (clave primaria), case_id (FK a cases)
- fluids_blood.csv: fb_id (clave primaria), case_id (FK a cases)
- drugs.csv: drug_id (clave primaria), case_id (FK a cases)
- lines_monitoring.csv: lm_id (clave primaria), case_id (FK a cases)
- postop.csv: postop_id (clave primaria), case_id (FK a cases)
- mortality.csv: mort_id (clave primaria), patient_id (FK a patients)
- team.csv: team_id (clave primaria), case_id (FK a cases)

VALORES BOOLEANOS:
- 0 = No / Falso
- 1 = Sí / Verdadero
- (vacío) = No registrado / No aplica

CODIFICACIÓN:
- Archivos en formato CSV (separador: coma)
- Encoding: UTF-8 con BOM
- Fechas en formato ISO: YYYY-MM-DD
- Horas en formato 24h: HH:MM
- Timestamps en formato ISO: YYYY-MM-DDTHH:MM:SS

NOTAS IMPORTANTES:
1. Para análisis en SPSS: Importar como texto delimitado por comas
2. Para análisis en R: usar read.csv(file, fileEncoding = "UTF-8-BOM")
3. Para análisis en Stata: import delimited file, encoding(UTF-8)

CONTACTO:
Sistema TxH Registro Anestesiológico
Hospital de Clínicas - Montevideo, Uruguay

=============================================================================
`;
}

/**
 * Create ZIP archive from files
 */
async function createZipArchive(files) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks = [];

    archive.on('data', chunk => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    files.forEach(file => {
      // Add BOM for Excel compatibility
      const content = '\ufeff' + file.content;
      archive.append(content, { name: file.name });
    });

    archive.finalize();
  });
}

/**
 * Get export preview (counts without generating data)
 */
async function getExportPreview(filters = {}) {
  const caseWhere = buildCaseFilters(filters);

  const [caseCount, patientCount, intraopCount] = await Promise.all([
    prisma.transplantCase.count({ where: caseWhere }),
    prisma.patient.count(),
    prisma.intraopRecord.count({
      where: {
        case: caseWhere,
      },
    }),
  ]);

  // Get date range
  const [earliest, latest] = await Promise.all([
    prisma.transplantCase.findFirst({
      where: caseWhere,
      orderBy: { startAt: 'asc' },
      select: { startAt: true },
    }),
    prisma.transplantCase.findFirst({
      where: caseWhere,
      orderBy: { startAt: 'desc' },
      select: { startAt: true },
    }),
  ]);

  return {
    cases: caseCount,
    patients: patientCount,
    intraopRecords: intraopCount,
    dateRange: {
      from: earliest?.startAt ? formatDate(earliest.startAt) : null,
      to: latest?.startAt ? formatDate(latest.startAt) : null,
    },
  };
}

/**
 * Get available data sources in the database
 */
async function getAvailableDataSources() {
  const sources = await prisma.transplantCase.groupBy({
    by: ['dataSource'],
    _count: true,
    where: { deletedAt: null },
  });

  return sources.map(s => ({
    source: s.dataSource,
    count: s._count,
  }));
}

/**
 * Get available years in the database
 */
async function getAvailableYears() {
  const cases = await prisma.transplantCase.findMany({
    where: { deletedAt: null, startAt: { not: null } },
    select: { startAt: true },
  });

  const years = [...new Set(cases.map(c => new Date(c.startAt).getFullYear()))];
  return years.sort((a, b) => b - a);
}

module.exports = {
  generateResearchExport,
  createZipArchive,
  getExportPreview,
  getAvailableDataSources,
  getAvailableYears,
  RESEARCH_DATA_DICTIONARY,
};
