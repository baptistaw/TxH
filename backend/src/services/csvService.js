// backend/src/services/csvService.js
/**
 * CSV Export Service
 * Exports case data to CSV format for analysis and reporting
 */

const prisma = require('../lib/prisma');
const { Parser } = require('json2csv');

/**
 * Helper: Format CI with dots and dash
 * 12345678 -> 1.234.567-8
 */
function formatCI(ci) {
  if (!ci) return '';
  const str = ci.toString();
  if (str.length !== 8) return ci;
  return `${str[0]}.${str.slice(1, 4)}.${str.slice(4, 7)}-${str[7]}`;
}

/**
 * Helper: Format date to ISO string
 */
function formatDate(date) {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
}

/**
 * Helper: Format duration
 */
function formatDuration(minutes) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}min`;
}

/**
 * Get case data formatted for CSV export
 */
async function getCaseDataForCSV(caseId) {
  // Fetch case with relations
  const caseData = await prisma.transplantCase.findUnique({
    where: { id: caseId },
    include: {
      patient: true,
      team: {
        include: {
          clinician: true,
        },
      },
    },
  });

  if (!caseData) {
    throw new Error(`Case ${caseId} not found`);
  }

  // Fetch preop
  const preop = await prisma.preopEvaluation.findFirst({
    where: { caseId },
    orderBy: { evaluationDate: 'desc' },
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

  // Fetch mortality data from patient
  const mortality = await prisma.mortality.findUnique({
    where: { patientId: caseData.patientId },
  });

  return {
    case: caseData,
    patient: caseData.patient,
    preop,
    intraop: intraopRecords,
    postop,
    mortality,
    team: caseData.team,
  };
}

/**
 * Export case summary CSV (one row per case)
 */
async function generateCaseSummaryCSV(caseId) {
  const data = await getCaseDataForCSV(caseId);
  const { case: c, patient, preop, postop, mortality, team } = data;

  // Create summary row
  const row = {
    // Patient
    'CI': formatCI(patient.id),
    'CI Raw': patient.ciRaw || '',
    'Nombre Completo': patient.name || '',
    'Fecha Nacimiento': formatDate(patient.birthDate),
    'Edad': patient.birthDate ? Math.floor((new Date() - new Date(patient.birthDate)) / 31557600000) : '',
    'Sexo': patient.sex || '',
    'Prestador': patient.provider || '',
    'Procedencia': patient.origin || '',
    'Grupo Sanguíneo': patient.bloodGroup || '',
    'Peso (kg)': patient.weight || '',
    'Talla (cm)': patient.height || '',

    // Case
    'Fecha Inicio': formatDate(c.startAt),
    'Fecha Fin': formatDate(c.endAt),
    'Año': c.startAt ? new Date(c.startAt).getFullYear() : '',
    'Es Retrasplante': c.isRetransplant ? 'Sí' : 'No',
    'Hepato-Renal': c.isHepatoRenal ? 'Sí' : 'No',
    'Donante Óptimo': c.optimalDonor ? 'Sí' : 'No',
    'Duración Cirugía': formatDuration(c.duration),
    'Tiempo Isquemia Fría (min)': c.coldIschemiaTime || '',
    'Tiempo Isquemia Caliente (min)': c.warmIschemiaTime || '',
    'ASA': c.asa || '',

    // Preop - Basic
    'MELD': preop?.meld || '',
    'MELD-Na': preop?.meldNa || '',
    'Child-Pugh': preop?.child || '',
    'Etiología 1': preop?.etiology1 || '',
    'Etiología 2': preop?.etiology2 || '',
    'Fecha Evaluación Preop': formatDate(preop?.evaluationDate),
    'Falla Hepática Fulminante': preop?.acuteLiverFailure ? 'Sí' : 'No',

    // Preop - Complications
    'Síndrome Hepatorenal': preop?.hepatorenalSyndrome ? 'Sí' : 'No',
    'Síndrome Hepatopulmonar': preop?.hepatopulmonarySyndrome ? 'Sí' : 'No',
    'HT Pulmonar': preop?.pulmonaryHypertension ? 'Sí' : 'No',
    'HT Portal': preop?.portalHypertension || '',
    'Ascitis': preop?.ascites || '',
    'Várices Esofágicas': preop?.esophagealVarices ? 'Sí' : 'No',
    'Encefalopatía': preop?.encephalopathy ? 'Sí' : 'No',
    'Sangrado': preop?.bleeding ? 'Sí' : 'No',
    'Hiponatremia': preop?.hyponatremia ? 'Sí' : 'No',

    // Preop - Comorbidities
    'Diabetes': preop?.diabetes ? 'Sí' : 'No',
    'HTA': preop?.hypertension ? 'Sí' : 'No',
    'Cardiopatía': preop?.heartDisease ? 'Sí' : 'No',
    'Neumopatía': preop?.lungDisease ? 'Sí' : 'No',
    'Nefropatía': preop?.kidneyDisease ? 'Sí' : 'No',
    'Problemas Potenciales': preop?.potentialProblems || '',
    'Incidentes Previos': preop?.priorIncidents || '',

    // Postop - Extubación y Ventilación
    'Extubado en BQ': postop?.extubatedInOR ? 'Sí' : 'No',
    'Horas ARM': postop?.mechVentHours || '',
    'Días ARM': postop?.mechVentDays || '',
    'Falla Extubación 24h': postop?.reintubation24h ? 'Sí' : 'No',

    // Postop - Reoperación
    'Reoperación': postop?.reoperation ? 'Sí' : 'No',
    'Causa Reoperación': postop?.reoperationCause || '',

    // Postop - Complicaciones
    'Falla Primaria Injerto': postop?.primaryGraftFailure ? 'Sí' : 'No',
    'Insuf. Renal Aguda': postop?.acuteRenalFailure ? 'Sí' : 'No',
    'Edema Pulmonar': postop?.pulmonaryEdema ? 'Sí' : 'No',
    'Neurotoxicidad': postop?.neurotoxicity ? 'Sí' : 'No',
    'Rechazo': postop?.rejection ? 'Sí' : 'No',
    'Complicaciones Biliares': postop?.biliaryComplications ? 'Sí' : 'No',
    'Complicaciones Vasculares': postop?.vascularComplications ? 'Sí' : 'No',
    'Sangrado Quirúrgico': postop?.surgicalBleeding ? 'Sí' : 'No',
    'APACHE II Inicial': postop?.apacheInitial || '',
    'Otras Complicaciones': postop?.otherComplications || '',

    // Postop - Estancia
    'Días UCI': postop?.icuDays || '',
    'Días Internación Sala': postop?.wardDays || '',
    'Fecha Alta Trasplante': formatDate(postop?.dischargeDate),

    // Mortality - Precoz
    'Muerte Precoz (<30d)': mortality?.earlyDeath ? 'Sí' : 'No',
    'Fecha Muerte': formatDate(mortality?.deathDate),
    'Causa Muerte Precoz': mortality?.deathCause || '',

    // Mortality - Seguimiento
    'Vivo al Alta': mortality?.aliveAtDischarge !== null ? (mortality.aliveAtDischarge ? 'Sí' : 'No') : '',
    'Vivo al Año': mortality?.aliveAt1Year !== null ? (mortality.aliveAt1Year ? 'Sí' : 'No') : '',
    'Vivo a los 3 Años': mortality?.aliveAt3Years !== null ? (mortality.aliveAt3Years ? 'Sí' : 'No') : '',
    'Vivo a los 5 Años': mortality?.aliveAt5Years !== null ? (mortality.aliveAt5Years ? 'Sí' : 'No') : '',
    'Causa Muerte Tardía': mortality?.lateDeathCause || '',

    // Mortality - Reingresos
    'Reingreso en 6m': mortality?.readmissionWithin6m ? 'Sí' : 'No',
    'Días a 1er Reingreso': mortality?.daysToFirstReadm || '',
    'Días a 2do Reingreso': mortality?.daysToSecondReadm || '',
    'Causa Reingreso': mortality?.readmissionCause || '',

    // Team
    'Equipo (nombres)': team.map(t => t.clinician.name).join('; '),
    'Equipo (roles)': team.map(t => t.role).join('; '),

    // Observations
    'Observaciones': c.observations || '',
  };

  // Convert to CSV
  const parser = new Parser({
    fields: Object.keys(row),
    delimiter: ',',
    quote: '"',
    header: true,
  });

  return parser.parse([row]);
}

/**
 * Export intraop records CSV (one row per snapshot)
 */
async function generateIntraopRecordsCSV(caseId) {
  const data = await getCaseDataForCSV(caseId);
  const { intraop } = data;

  // Create rows for each intraop record (solo datos variables, sin repetir info del caso)
  const rows = intraop.map(record => ({
    'Fase': record.phase,
    'Hora': record.timestamp ? new Date(record.timestamp).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }) : '',
    'FC': record.heartRate || '',
    'PAS': record.pas || '',
    'PAD': record.pad || '',
    'PAm': record.pam || '',
    'PVC': record.cvp || '',
    'PEEP': record.peep || '',
    'FiO₂': record.fio2 || '',
    'Vt': record.tidalVolume || '',
    'SpO₂': record.spo2 || '',
    'Temp': record.temperature || '',
    'Diuresis': record.urineOutput || '',
    'Sangrado': record.bloodLoss || '',
    'GR': record.redBloodCells || '',
    'PFC': record.freshFrozenPlasma || '',
    'Plaquetas': record.platelets || '',
    'Noradrenalina': record.norepinephrine || '',
    'Vasopresina': record.vasopressin || '',
    'Dobutamina': record.dobutamine || '',
  }));

  if (rows.length === 0) {
    // Return empty CSV with headers
    rows.push({
      'Fase': '',
      'Hora': '',
      'FC': '',
      'PAS': '',
      'PAD': '',
      'PAm': '',
      'PVC': '',
      'PEEP': '',
      'FiO₂': '',
      'Vt': '',
      'SpO₂': '',
      'Temp': '',
      'Diuresis': '',
      'Sangrado': '',
      'GR': '',
      'PFC': '',
      'Plaquetas': '',
      'Noradrenalina': '',
      'Vasopresina': '',
      'Dobutamina': '',
    });
  }

  // Convert to CSV
  const parser = new Parser({
    fields: Object.keys(rows[0]),
    delimiter: ',',
    quote: '"',
    header: true,
  });

  return parser.parse(rows);
}

/**
 * Export complete case CSV (combined: summary + all intraop records)
 */
async function generateCompleteCaseCSV(caseId) {
  const data = await getCaseDataForCSV(caseId);
  const { case: c, patient, preop, postop, team: _team, intraop } = data;

  // Create rows for each intraop record, with case summary repeated
  const rows = intraop.map(record => ({
    // Patient
    'CI': formatCI(patient.id),
    'Nombre': patient.name || '',
    'Fecha Nacimiento': formatDate(patient.birthDate),
    'Sexo': patient.sex || '',
    'Prestador': patient.provider || '',
    'Grupo Sanguíneo': patient.bloodGroup || '',

    // Case
    'Fecha Inicio': formatDate(c.startAt),
    'Es Retrasplante': c.isRetransplant ? 'Sí' : 'No',
    'Hepato-Renal': c.isHepatoRenal ? 'Sí' : 'No',
    'Donante Óptimo': c.optimalDonor ? 'Sí' : 'No',
    'Duración Cirugía': formatDuration(c.duration),
    'Tiempo Isquemia Fría (min)': c.coldIschemiaTime || '',
    'Tiempo Isquemia Caliente (min)': c.warmIschemiaTime || '',

    // Preop
    'MELD': preop?.meld || '',
    'MELD-Na': preop?.meldNa || '',
    'Child-Pugh': preop?.child || '',
    'Etiología 1': preop?.etiology1 || '',

    // Intraop record
    'Fase': record.phase,
    'Hora': record.timestamp ? new Date(record.timestamp).toLocaleTimeString('es-UY') : '',
    'FC': record.heartRate || '',
    'PAS': record.pas || '',
    'PAD': record.pad || '',
    'PAm': record.pam || '',
    'PVC': record.cvp || '',
    'PEEP': record.peep || '',
    'FiO₂': record.fio2 || '',
    'Vt': record.tidalVolume || '',

    // Postop
    'Días UCI': postop?.icuDays || '',
    'Días Hosp': postop?.wardDays || '',
    'Insuf. Renal': postop?.acuteRenalFailure ? 'Sí' : 'No',
  }));

  // If no intraop records, add one summary row
  if (rows.length === 0) {
    rows.push({
      'CI': formatCI(patient.id),
      'Nombre': patient.name || '',
      'Fecha Nacimiento': formatDate(patient.birthDate),
      'Sexo': patient.sex || '',
      'Prestador': patient.provider || '',
      'Grupo Sanguíneo': patient.bloodGroup || '',
      'Fecha Inicio': formatDate(c.startAt),
      'Es Retrasplante': c.isRetransplant ? 'Sí' : 'No',
      'Hepato-Renal': c.isHepatoRenal ? 'Sí' : 'No',
      'Donante Óptimo': c.optimalDonor ? 'Sí' : 'No',
      'Duración Cirugía': formatDuration(c.duration),
      'Tiempo Isquemia Fría (min)': c.coldIschemiaTime || '',
      'Tiempo Isquemia Caliente (min)': c.warmIschemiaTime || '',
      'MELD': preop?.meld || '',
      'MELD-Na': preop?.meldNa || '',
      'Child-Pugh': preop?.child || '',
      'Etiología 1': preop?.etiology1 || '',
      'Fase': '',
      'Hora': '',
      'FC': '',
      'PAS': '',
      'PAD': '',
      'PAm': '',
      'PVC': '',
      'PEEP': '',
      'FiO₂': '',
      'Vt': '',
      'Días UCI': postop?.icuDays || '',
      'Días Hosp': postop?.wardDays || '',
      'Insuf. Renal': postop?.acuteRenalFailure ? 'Sí' : 'No',
    });
  }

  // Convert to CSV
  const parser = new Parser({
    fields: Object.keys(rows[0]),
    delimiter: ',',
    quote: '"',
    header: true,
  });

  return parser.parse(rows);
}

module.exports = {
  generateCaseSummaryCSV,
  generateIntraopRecordsCSV,
  generateCompleteCaseCSV,
};
