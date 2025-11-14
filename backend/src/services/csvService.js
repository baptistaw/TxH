// backend/src/services/csvService.js
/**
 * CSV Export Service
 * Exports case data to CSV format for analysis and reporting
 */

const { PrismaClient } = require('@prisma/client');
const { Parser } = require('json2csv');

const prisma = new PrismaClient();

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
  const postop = await prisma.postopOutcome.findFirst({
    where: { caseId },
    orderBy: { createdAt: 'desc' },
  });

  return {
    case: caseData,
    patient: caseData.patient,
    preop,
    intraop: intraopRecords,
    postop,
    team: caseData.team,
  };
}

/**
 * Export case summary CSV (one row per case)
 */
async function generateCaseSummaryCSV(caseId) {
  const data = await getCaseDataForCSV(caseId);
  const { case: c, patient, preop, postop, team } = data;

  // Create summary row
  const row = {
    // Patient
    'CI': formatCI(patient.ci),
    'Apellido': patient.lastName || '',
    'Nombre': patient.firstName || '',
    'Fecha Nacimiento': formatDate(patient.birthDate),
    'Sexo': patient.sex || '',
    'Prestador': patient.provider || '',
    'Grupo Sanguíneo': patient.bloodGroup || '',

    // Case
    'Fecha Caso': formatDate(c.surgeryDate),
    'Año': c.surgeryDate ? new Date(c.surgeryDate).getFullYear() : '',
    'Es Retrasplante': c.isRetransplant ? 'Sí' : 'No',
    'Hepato-Renal': c.isHepatoRenal ? 'Sí' : 'No',
    'Donante Óptimo': c.isOptimalDonor ? 'Sí' : 'No',
    'Fecha Listado': formatDate(c.listingDate),
    'Fecha Trasplante': formatDate(c.transplantDate),
    'Duración Cirugía': formatDuration(c.duration),
    'Tiempo Isquemia Fría (min)': c.coldIschemiaTime || '',
    'Tiempo Isquemia Caliente (min)': c.warmIschemiaTime || '',

    // Preop
    'MELD': preop?.meld || '',
    'MELD-Na': preop?.meldNa || '',
    'Child-Pugh': preop?.child || '',
    'Etiología 1': preop?.etiology1 || '',
    'Etiología 2': preop?.etiology2 || '',
    'Etiología 3': preop?.etiology3 || '',
    'Fecha Evaluación Preop': formatDate(preop?.evaluationDate),

    // Postop
    'Días UCI': postop?.icuDays || '',
    'Días Hospitalización': postop?.hospitalDays || '',
    'Complicaciones': postop?.complications || '',
    'Mortalidad Hospitalaria': postop?.inHospitalMortality ? 'Sí' : 'No',
    'Fecha Alta': formatDate(postop?.dischargeDate),

    // Team
    'Equipo (nombres)': team.map(t => `${t.clinician.firstName} ${t.clinician.lastName}`).join('; '),
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
  const { case: c, patient, intraop } = data;

  // Create rows for each intraop record
  const rows = intraop.map(record => ({
    // Case info
    'ID Caso': c.id,
    'CI Paciente': formatCI(patient.ci),
    'Apellido': patient.lastName || '',
    'Nombre': patient.firstName || '',
    'Fecha Caso': formatDate(c.surgeryDate),

    // Intraop record
    'ID Registro': record.id,
    'Fase': record.phase,
    'Timestamp': record.timestamp ? new Date(record.timestamp).toISOString() : '',
    'FC (bpm)': record.fc || '',
    'PAS (mmHg)': record.sys || '',
    'PAD (mmHg)': record.dia || '',
    'PAm (mmHg)': record.map || '',
    'PVC (cmH₂O)': record.cvp || '',
    'PEEP (cmH₂O)': record.peep || '',
    'FiO₂ (%)': record.fio2 || '',
    'Vt (ml)': record.vt || '',
    'Observaciones': record.observations || '',
    'Creado': record.createdAt ? new Date(record.createdAt).toISOString() : '',
    'Actualizado': record.updatedAt ? new Date(record.updatedAt).toISOString() : '',
  }));

  if (rows.length === 0) {
    // Return empty CSV with headers
    rows.push({
      'ID Caso': '',
      'CI Paciente': '',
      'Apellido': '',
      'Nombre': '',
      'Fecha Caso': '',
      'ID Registro': '',
      'Fase': '',
      'Timestamp': '',
      'FC (bpm)': '',
      'PAS (mmHg)': '',
      'PAD (mmHg)': '',
      'PAm (mmHg)': '',
      'PVC (cmH₂O)': '',
      'PEEP (cmH₂O)': '',
      'FiO₂ (%)': '',
      'Vt (ml)': '',
      'Observaciones': '',
      'Creado': '',
      'Actualizado': '',
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
    'CI': formatCI(patient.ci),
    'Apellido': patient.lastName || '',
    'Nombre': patient.firstName || '',
    'Fecha Nacimiento': formatDate(patient.birthDate),
    'Sexo': patient.sex || '',
    'Prestador': patient.provider || '',
    'Grupo Sanguíneo': patient.bloodGroup || '',

    // Case
    'Fecha Caso': formatDate(c.surgeryDate),
    'Es Retrasplante': c.isRetransplant ? 'Sí' : 'No',
    'Hepato-Renal': c.isHepatoRenal ? 'Sí' : 'No',
    'Donante Óptimo': c.isOptimalDonor ? 'Sí' : 'No',
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
    'FC': record.fc || '',
    'PAS': record.sys || '',
    'PAD': record.dia || '',
    'PAm': record.map || '',
    'PVC': record.cvp || '',
    'PEEP': record.peep || '',
    'FiO₂': record.fio2 || '',
    'Vt': record.vt || '',
    'Obs Intraop': record.observations || '',

    // Postop
    'Días UCI': postop?.icuDays || '',
    'Días Hosp': postop?.hospitalDays || '',
    'Complicaciones': postop?.complications || '',
    'Mortalidad': postop?.inHospitalMortality ? 'Sí' : 'No',
  }));

  // If no intraop records, add one summary row
  if (rows.length === 0) {
    rows.push({
      'CI': formatCI(patient.ci),
      'Apellido': patient.lastName || '',
      'Nombre': patient.firstName || '',
      'Fecha Nacimiento': formatDate(patient.birthDate),
      'Sexo': patient.sex || '',
      'Prestador': patient.provider || '',
      'Grupo Sanguíneo': patient.bloodGroup || '',
      'Fecha Caso': formatDate(c.surgeryDate),
      'Es Retrasplante': c.isRetransplant ? 'Sí' : 'No',
      'Hepato-Renal': c.isHepatoRenal ? 'Sí' : 'No',
      'Donante Óptimo': c.isOptimalDonor ? 'Sí' : 'No',
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
      'Obs Intraop': '',
      'Días UCI': postop?.icuDays || '',
      'Días Hosp': postop?.hospitalDays || '',
      'Complicaciones': postop?.complications || '',
      'Mortalidad': postop?.inHospitalMortality ? 'Sí' : 'No',
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
