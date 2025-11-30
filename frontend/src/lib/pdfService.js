// src/lib/pdfService.js - Servicio de generación de PDFs en el cliente
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Colores del tema
const COLORS = {
  primary: [0, 81, 255], // Azul
  secondary: [107, 114, 128], // Gris
  success: [34, 197, 94], // Verde
  warning: [234, 179, 8], // Amarillo
  danger: [239, 68, 68], // Rojo
  dark: [31, 41, 55],
  light: [249, 250, 251],
};

// Mapeo de fases
const PHASE_LABELS = {
  ESTADO_BASAL: 'Estado Basal',
  INDUCCION: 'Inducción',
  DISECCION: 'Disección',
  ANHEPATICA: 'Anhepática',
  PRE_REPERFUSION: 'Pre-Reperfusión',
  POST_REPERFUSION: 'Post-Reperfusión',
  VIA_BILIAR: 'Vía Biliar',
  CIERRE: 'Cierre',
  SALIDA_BQ: 'Salida BQ',
};

/**
 * Formatear CI uruguayo
 */
function formatCI(ci) {
  if (!ci) return '-';
  const digits = ci.toString().replace(/\D/g, '');
  if (digits.length === 8) {
    return `${digits[0]}.${digits.slice(1, 4)}.${digits.slice(4, 7)}-${digits[7]}`;
  }
  if (digits.length === 7) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}-${digits[6]}`;
  }
  return ci;
}

/**
 * Formatear fecha
 */
function formatDate(date) {
  if (!date) return '-';
  try {
    const d = new Date(date);
    return d.toLocaleDateString('es-UY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

/**
 * Formatear hora
 */
function formatTime(date) {
  if (!date) return '-';
  try {
    const d = new Date(date);
    return d.toLocaleTimeString('es-UY', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

/**
 * Formatear duración en minutos
 */
function formatDuration(minutes) {
  if (!minutes) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  return `${hours}h ${mins}min`;
}

/**
 * Calcular edad
 */
function calculateAge(birthDate) {
  if (!birthDate) return '-';
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return `${age} años`;
}

/**
 * Agregar encabezado común a todas las páginas
 */
function addHeader(doc, title, subtitle = null) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Línea superior
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(2);
  doc.line(15, 15, pageWidth - 15, 15);

  // Título
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 15, 28);

  // Subtítulo
  if (subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.secondary);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 15, 35);
  }

  // PNTH badge
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.primary);
  doc.text('PNTH Uruguay', pageWidth - 15, 28, { align: 'right' });

  return subtitle ? 42 : 35;
}

/**
 * Agregar pie de página
 */
function addFooter(doc, pageNumber) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.secondary);
  doc.text(
    `Generado el ${new Date().toLocaleString('es-UY')}`,
    15,
    pageHeight - 10
  );
  doc.text(
    `Página ${pageNumber}`,
    pageWidth - 15,
    pageHeight - 10,
    { align: 'right' }
  );
}

/**
 * Agregar sección con título
 */
function addSection(doc, title, yPos) {
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 15, yPos);

  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(15, yPos + 2, 195, yPos + 2);

  return yPos + 8;
}

/**
 * Agregar campo de datos
 */
function addField(doc, label, value, x, y, width = 45) {
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.secondary);
  doc.setFont('helvetica', 'normal');
  doc.text(label, x, y);

  doc.setFontSize(10);
  doc.setTextColor(...COLORS.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(String(value || '-'), x, y + 5);

  return y + 12;
}

// ============================================================================
// GENERACIÓN DE PDF PARA CASOS DE TRASPLANTE
// ============================================================================

/**
 * Generar PDF de caso de trasplante
 * @param {Object} caseData - Datos del caso
 * @param {Object} preop - Datos preoperatorios
 * @param {Array} intraop - Registros intraoperatorios
 * @param {Array} fluids - Registros de fluidos
 * @param {Array} team - Equipo clínico
 */
export function generateCasePDF(caseData, preop, intraop = [], fluids = [], team = []) {
  const doc = new jsPDF();
  let yPos = 15;
  let pageNumber = 1;

  // --- PÁGINA 1: Información general ---
  yPos = addHeader(
    doc,
    'Registro de Trasplante Hepático',
    `Caso: ${caseData.id}`
  );

  // Datos del paciente
  yPos = addSection(doc, 'Datos del Paciente', yPos + 5);

  const patient = caseData.patient || {};
  addField(doc, 'Nombre', patient.name, 15, yPos);
  addField(doc, 'CI', formatCI(patient.id), 75, yPos);
  addField(doc, 'Edad', calculateAge(patient.birthDate), 135, yPos);
  yPos += 15;

  addField(doc, 'Sexo', patient.sex === 'M' ? 'Masculino' : patient.sex === 'F' ? 'Femenino' : '-', 15, yPos);
  addField(doc, 'Peso', patient.weight ? `${patient.weight} kg` : '-', 75, yPos);
  addField(doc, 'Talla', patient.height ? `${patient.height} cm` : '-', 135, yPos);
  yPos += 15;

  addField(doc, 'Proveedor', patient.provider || '-', 15, yPos);
  addField(doc, 'FNR', patient.fnr || '-', 75, yPos);
  yPos += 20;

  // Datos del trasplante
  yPos = addSection(doc, 'Datos del Trasplante', yPos);

  addField(doc, 'Fecha', formatDate(caseData.startAt), 15, yPos);
  addField(doc, 'Hora inicio', formatTime(caseData.startAt), 75, yPos);
  addField(doc, 'Hora fin', formatTime(caseData.endAt), 135, yPos);
  yPos += 15;

  addField(doc, 'Duración', formatDuration(caseData.duration), 15, yPos);
  addField(doc, 'Retrasplante', caseData.isRetransplant ? 'Sí' : 'No', 75, yPos);
  addField(doc, 'Hepato-Renal', caseData.isHepatoRenal ? 'Sí' : 'No', 135, yPos);
  yPos += 20;

  // Evaluación preoperatoria
  if (preop) {
    yPos = addSection(doc, 'Evaluación Preoperatoria', yPos);

    addField(doc, 'MELD', preop.meld || '-', 15, yPos);
    addField(doc, 'Child-Pugh', preop.child || '-', 55, yPos);
    addField(doc, 'IMC', preop.imc ? preop.imc.toFixed(1) : '-', 95, yPos);
    addField(doc, 'ASA', preop.asa || '-', 135, yPos);
    yPos += 15;

    addField(doc, 'Etiología 1', preop.etiology1 || '-', 15, yPos, 80);
    addField(doc, 'Etiología 2', preop.etiology2 || '-', 100, yPos, 80);
    yPos += 20;
  }

  // Equipo clínico
  if (team && team.length > 0) {
    yPos = addSection(doc, 'Equipo Clínico', yPos);

    const teamData = team.map(t => [
      t.role || '-',
      t.clinician?.name || '-',
      t.clinician?.specialty || '-',
    ]);

    doc.autoTable({
      startY: yPos,
      head: [['Rol', 'Nombre', 'Especialidad']],
      body: teamData,
      theme: 'striped',
      headStyles: { fillColor: COLORS.primary },
      margin: { left: 15, right: 15 },
    });

    yPos = doc.lastAutoTable.finalY + 10;
  }

  addFooter(doc, pageNumber);

  // --- PÁGINA 2: Registros Intraoperatorios ---
  if (intraop && intraop.length > 0) {
    doc.addPage();
    pageNumber++;
    yPos = addHeader(doc, 'Registros Intraoperatorios', `Caso: ${caseData.id}`);
    yPos += 5;

    // Agrupar por fase
    const phases = Object.keys(PHASE_LABELS);

    phases.forEach(phase => {
      const phaseRecords = intraop.filter(r => r.phase === phase);
      if (phaseRecords.length === 0) return;

      // Verificar si hay espacio para la tabla
      if (yPos > 240) {
        addFooter(doc, pageNumber);
        doc.addPage();
        pageNumber++;
        yPos = addHeader(doc, 'Registros Intraoperatorios (cont.)', `Caso: ${caseData.id}`);
        yPos += 5;
      }

      // Título de fase
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.primary);
      doc.setFont('helvetica', 'bold');
      doc.text(PHASE_LABELS[phase] || phase, 15, yPos);
      yPos += 5;

      // Tabla de registros
      const tableData = phaseRecords.map(r => [
        formatTime(r.timestamp),
        r.pas || '-',
        r.pad || '-',
        r.pam || '-',
        r.fc || '-',
        r.spo2 || '-',
        r.temp || '-',
      ]);

      doc.autoTable({
        startY: yPos,
        head: [['Hora', 'PAS', 'PAD', 'PAM', 'FC', 'SpO2', 'Temp']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: COLORS.secondary, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 15, right: 15 },
        tableWidth: 'auto',
      });

      yPos = doc.lastAutoTable.finalY + 10;
    });

    addFooter(doc, pageNumber);
  }

  // --- PÁGINA 3: Fluidos y Hemoderivados ---
  if (fluids && fluids.length > 0) {
    doc.addPage();
    pageNumber++;
    yPos = addHeader(doc, 'Fluidos y Hemoderivados', `Caso: ${caseData.id}`);
    yPos += 5;

    // Calcular totales
    const totals = {
      crystalloids: fluids.reduce((sum, f) => sum + (f.crystalloids || 0), 0),
      colloids: fluids.reduce((sum, f) => sum + (f.colloids || 0), 0),
      prbc: fluids.reduce((sum, f) => sum + (f.prbc || 0), 0),
      ffp: fluids.reduce((sum, f) => sum + (f.ffp || 0), 0),
      platelets: fluids.reduce((sum, f) => sum + (f.platelets || 0), 0),
      cryoprecipitate: fluids.reduce((sum, f) => sum + (f.cryoprecipitate || 0), 0),
      cellSaver: fluids.reduce((sum, f) => sum + (f.cellSaver || 0), 0),
      urine: fluids.reduce((sum, f) => sum + (f.urine || 0), 0),
      bleeding: fluids.reduce((sum, f) => sum + (f.bleeding || 0), 0),
    };

    // Resumen de totales
    yPos = addSection(doc, 'Resumen de Totales', yPos);

    addField(doc, 'Cristaloides', `${totals.crystalloids} mL`, 15, yPos);
    addField(doc, 'Coloides', `${totals.colloids} mL`, 75, yPos);
    addField(doc, 'Diuresis', `${totals.urine} mL`, 135, yPos);
    yPos += 15;

    addField(doc, 'GR', `${totals.prbc} U`, 15, yPos);
    addField(doc, 'PFC', `${totals.ffp} U`, 55, yPos);
    addField(doc, 'Plaquetas', `${totals.platelets} U`, 95, yPos);
    addField(doc, 'Crio', `${totals.cryoprecipitate} U`, 135, yPos);
    yPos += 15;

    addField(doc, 'Cell Saver', `${totals.cellSaver} mL`, 15, yPos);
    addField(doc, 'Sangrado', `${totals.bleeding} mL`, 75, yPos);
    yPos += 20;

    // Detalle por fase
    yPos = addSection(doc, 'Detalle por Fase', yPos);

    const fluidTableData = fluids.map(f => [
      PHASE_LABELS[f.phase] || f.phase,
      f.crystalloids || 0,
      f.colloids || 0,
      f.prbc || 0,
      f.ffp || 0,
      f.platelets || 0,
      f.urine || 0,
    ]);

    doc.autoTable({
      startY: yPos,
      head: [['Fase', 'Crist.', 'Col.', 'GR', 'PFC', 'Plaq.', 'Diuresis']],
      body: fluidTableData,
      theme: 'striped',
      headStyles: { fillColor: COLORS.primary, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 15, right: 15 },
    });

    addFooter(doc, pageNumber);
  }

  return doc;
}

// ============================================================================
// GENERACIÓN DE PDF PARA EVALUACIÓN PREOPERATORIA
// ============================================================================

/**
 * Generar PDF de evaluación preoperatoria
 * @param {Object} preop - Datos de la evaluación
 */
export function generatePreopPDF(preop) {
  const doc = new jsPDF();
  let yPos = 15;

  const patient = preop.patient || {};

  yPos = addHeader(
    doc,
    'Evaluación Pretrasplante',
    `Paciente: ${patient.name || 'N/A'}`
  );

  // Datos del paciente
  yPos = addSection(doc, 'Datos del Paciente', yPos + 5);

  addField(doc, 'Nombre', patient.name, 15, yPos);
  addField(doc, 'CI', formatCI(patient.id), 75, yPos);
  addField(doc, 'Edad', calculateAge(patient.birthDate), 135, yPos);
  yPos += 15;

  addField(doc, 'Sexo', patient.sex === 'M' ? 'Masculino' : patient.sex === 'F' ? 'Femenino' : '-', 15, yPos);
  addField(doc, 'Peso', preop.weight ? `${preop.weight} kg` : '-', 75, yPos);
  addField(doc, 'Talla', preop.height ? `${preop.height} cm` : '-', 135, yPos);
  yPos += 20;

  // Evaluación
  yPos = addSection(doc, 'Evaluación', yPos);

  addField(doc, 'Fecha', formatDate(preop.evaluationDate), 15, yPos);
  addField(doc, 'MELD', preop.meld || '-', 75, yPos);
  addField(doc, 'Child-Pugh', preop.child || '-', 135, yPos);
  yPos += 15;

  addField(doc, 'IMC', preop.imc ? preop.imc.toFixed(1) : '-', 15, yPos);
  addField(doc, 'ASA', preop.asa || '-', 75, yPos);
  addField(doc, 'Albúmina', preop.albumin ? `${preop.albumin} g/dL` : '-', 135, yPos);
  yPos += 20;

  // Etiologías
  yPos = addSection(doc, 'Etiologías', yPos);

  addField(doc, 'Etiología Principal', preop.etiology1 || '-', 15, yPos, 80);
  addField(doc, 'Etiología Secundaria', preop.etiology2 || '-', 100, yPos, 80);
  yPos += 20;

  // Comorbilidades
  yPos = addSection(doc, 'Comorbilidades', yPos);

  const comorbidities = [];
  if (preop.hta) comorbidities.push('HTA');
  if (preop.dm) comorbidities.push('Diabetes');
  if (preop.irc) comorbidities.push('IRC');
  if (preop.cardiopathy) comorbidities.push('Cardiopatía');
  if (preop.pulmonaryHtn) comorbidities.push('HTP');
  if (preop.encephalopathy) comorbidities.push('Encefalopatía');
  if (preop.ascites) comorbidities.push('Ascitis');
  if (preop.varices) comorbidities.push('Várices');

  doc.setFontSize(10);
  doc.setTextColor(...COLORS.dark);
  doc.text(comorbidities.length > 0 ? comorbidities.join(' • ') : 'Sin comorbilidades registradas', 15, yPos);
  yPos += 15;

  // Laboratorio
  if (preop.inr || preop.creatinine || preop.bilirubin || preop.hemoglobin) {
    yPos = addSection(doc, 'Laboratorio', yPos + 5);

    addField(doc, 'INR', preop.inr || '-', 15, yPos);
    addField(doc, 'Creatinina', preop.creatinine ? `${preop.creatinine} mg/dL` : '-', 55, yPos);
    addField(doc, 'Bilirrubina', preop.bilirubin ? `${preop.bilirubin} mg/dL` : '-', 95, yPos);
    addField(doc, 'Hemoglobina', preop.hemoglobin ? `${preop.hemoglobin} g/dL` : '-', 145, yPos);
    yPos += 15;

    addField(doc, 'Sodio', preop.sodium ? `${preop.sodium} mEq/L` : '-', 15, yPos);
    addField(doc, 'Plaquetas', preop.platelets ? `${preop.platelets} x10³` : '-', 55, yPos);
  }

  // Observaciones
  if (preop.observations) {
    yPos += 25;
    yPos = addSection(doc, 'Observaciones', yPos);

    doc.setFontSize(10);
    doc.setTextColor(...COLORS.dark);
    doc.setFont('helvetica', 'normal');

    const splitText = doc.splitTextToSize(preop.observations, 175);
    doc.text(splitText, 15, yPos);
  }

  addFooter(doc, 1);

  return doc;
}

// ============================================================================
// GENERACIÓN DE PDF PARA PROCEDIMIENTOS
// ============================================================================

/**
 * Generar PDF de procedimiento
 * @param {Object} procedure - Datos del procedimiento
 */
export function generateProcedurePDF(procedure) {
  const doc = new jsPDF();
  let yPos = 15;

  const patient = procedure.patient || {};

  yPos = addHeader(
    doc,
    'Registro de Procedimiento',
    `Paciente: ${patient.name || 'N/A'}`
  );

  // Datos del paciente
  yPos = addSection(doc, 'Datos del Paciente', yPos + 5);

  addField(doc, 'Nombre', patient.name, 15, yPos);
  addField(doc, 'CI', formatCI(patient.id), 75, yPos);
  addField(doc, 'Edad', calculateAge(patient.birthDate), 135, yPos);
  yPos += 20;

  // Datos del procedimiento
  yPos = addSection(doc, 'Datos del Procedimiento', yPos);

  addField(doc, 'Tipo', procedure.procedureType || '-', 15, yPos, 80);
  addField(doc, 'Fecha', formatDate(procedure.startAt), 100, yPos);
  yPos += 15;

  addField(doc, 'Hora inicio', formatTime(procedure.startAt), 15, yPos);
  addField(doc, 'Hora fin', formatTime(procedure.endAt), 75, yPos);
  addField(doc, 'Duración', formatDuration(procedure.duration), 135, yPos);
  yPos += 15;

  addField(doc, 'Ubicación', procedure.location || '-', 15, yPos);
  addField(doc, 'ASA', procedure.asa || '-', 75, yPos);
  yPos += 20;

  // Anestesia
  yPos = addSection(doc, 'Anestesia', yPos);

  addField(doc, 'Técnica', procedure.anesthesiaType || '-', 15, yPos, 80);
  addField(doc, 'Vía Aérea', procedure.airwayManagement || '-', 100, yPos, 80);
  yPos += 15;

  // Observaciones
  if (procedure.observations) {
    yPos += 10;
    yPos = addSection(doc, 'Observaciones', yPos);

    doc.setFontSize(10);
    doc.setTextColor(...COLORS.dark);
    doc.setFont('helvetica', 'normal');

    const splitText = doc.splitTextToSize(procedure.observations, 175);
    doc.text(splitText, 15, yPos);
  }

  // Complicaciones
  if (procedure.complications) {
    yPos += 25;
    yPos = addSection(doc, 'Complicaciones', yPos);

    doc.setFontSize(10);
    doc.setTextColor(...COLORS.danger);
    doc.setFont('helvetica', 'normal');

    const splitText = doc.splitTextToSize(procedure.complications, 175);
    doc.text(splitText, 15, yPos);
  }

  addFooter(doc, 1);

  return doc;
}

// ============================================================================
// FUNCIONES DE DESCARGA
// ============================================================================

/**
 * Descargar PDF de caso
 */
export function downloadCasePDF(caseData, preop, intraop, fluids, team) {
  const doc = generateCasePDF(caseData, preop, intraop, fluids, team);
  doc.save(`caso-trasplante-${caseData.id}.pdf`);
}

/**
 * Descargar PDF de evaluación preoperatoria
 */
export function downloadPreopPDF(preop) {
  const doc = generatePreopPDF(preop);
  const patientName = preop.patient?.name?.replace(/\s+/g, '_') || 'paciente';
  doc.save(`evaluacion-pretrasplante-${patientName}.pdf`);
}

/**
 * Descargar PDF de procedimiento
 */
export function downloadProcedurePDF(procedure) {
  const doc = generateProcedurePDF(procedure);
  const patientName = procedure.patient?.name?.replace(/\s+/g, '_') || 'paciente';
  doc.save(`procedimiento-${patientName}.pdf`);
}
