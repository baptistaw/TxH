// src/services/pdfService-improved.js - Servicio mejorado para generación de PDFs

const puppeteer = require('puppeteer');
const { format } = require('date-fns');
const { es } = require('date-fns/locale');
const prisma = require('../lib/prisma');
const { NotFoundError } = require('../middlewares/errorHandler');

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
function formatDate(date, formatStr = 'dd/MM/yyyy') {
  if (!date) return '-';
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, formatStr, { locale: es });
  } catch {
    return '-';
  }
}

/**
 * Formatear duración
 */
function formatDuration(minutes) {
  if (!minutes) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  return `${hours}h ${mins}min`;
}

/**
 * Obtener datos completos del caso para PDF
 */
async function getCaseDataForPDF(caseId) {
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
    throw new NotFoundError('Caso no encontrado');
  }

  // Obtener preop
  const preop = await prisma.preopEvaluation.findFirst({
    where: { patientId: caseData.patientId },
    orderBy: { evaluationDate: 'desc' },
  });

  // Obtener intraop agrupado por fase
  const intraopRecords = await prisma.intraopRecord.findMany({
    where: { caseId },
    orderBy: [{ phase: 'asc' }, { timestamp: 'asc' }],
  });

  // Agrupar por fase
  const intraopByPhase = {};
  const phases = [
    'INDUCCION',
    'DISECCION',
    'ANHEPATICA_INICIAL',
    'PRE_REPERFUSION',
    'POST_REPERFUSION_INICIAL',
    'FIN_VIA_BILIAR',
    'CIERRE',
  ];

  phases.forEach((phase) => {
    intraopByPhase[phase] = intraopRecords.filter((r) => r.phase === phase);
  });

  // Obtener postop
  const postop = await prisma.postOpOutcome.findUnique({
    where: { caseId },
  });

  // Obtener mortality
  const mortality = await prisma.mortality.findUnique({
    where: { patientId: caseData.patientId },
  });

  return {
    case: caseData,
    patient: caseData.patient,
    preop,
    intraopByPhase,
    postop,
    mortality,
    team: caseData.team,
  };
}

/**
 * Generar HTML mejorado con diseño moderno
 */
function generateHTML(data) {
  const { case: caseData, patient, team, preop, intraopByPhase, postop, mortality } = data;

  const phaseConfig = {
    INDUCCION: { label: 'Inducción Anestésica - Disección', color: '#60a5fa' },
    DISECCION: { label: 'Fase de Disección', color: '#34d399' },
    ANHEPATICA_INICIAL: { label: 'Anhepática Inicial', color: '#fbbf24' },
    PRE_REPERFUSION: { label: 'Pre-Reperfusión', color: '#f97316' },
    POST_REPERFUSION_INICIAL: { label: 'Post-Reperfusión', color: '#ec4899' },
    FIN_VIA_BILIAR: { label: 'Vía Biliar', color: '#a78bfa' },
    CIERRE: { label: 'Cierre', color: '#6366f1' },
  };

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Trasplante Hepático - ${patient.name}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 12mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.3;
      color: #1f2937;
      background: #f9fafb;
    }

    /* Header Mejorado */
    .header {
      background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
      color: white;
      padding: 20px 25px;
      border-radius: 8px;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-left h1 {
      font-size: 20pt;
      font-weight: 700;
      margin-bottom: 5px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .header-left .subtitle {
      font-size: 11pt;
      opacity: 0.95;
      font-weight: 300;
    }

    .header-right {
      text-align: right;
    }

    .header-right .patient-name {
      font-size: 16pt;
      font-weight: 600;
      margin-bottom: 3px;
    }

    .header-right .patient-info {
      font-size: 10pt;
      opacity: 0.9;
    }

    /* Dashboard de Resumen */
    .dashboard {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
      margin-bottom: 15px;
    }

    .metric-card {
      background: white;
      border-radius: 6px;
      padding: 12px;
      border-left: 4px solid #06b6d4;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .metric-card.warning {
      border-left-color: #f59e0b;
    }

    .metric-card.danger {
      border-left-color: #ef4444;
    }

    .metric-card.success {
      border-left-color: #10b981;
    }

    .metric-label {
      font-size: 8pt;
      color: #6b7280;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }

    .metric-value {
      font-size: 18pt;
      font-weight: 700;
      color: #111827;
      line-height: 1;
    }

    .metric-unit {
      font-size: 9pt;
      color: #6b7280;
      font-weight: 400;
    }

    /* Información del Paciente */
    .patient-section {
      background: white;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 15px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .section-title {
      font-size: 11pt;
      font-weight: 700;
      color: #0891b2;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 2px solid #e5e7eb;
      display: flex;
      align-items: center;
    }

    .section-title-icon {
      width: 18px;
      height: 18px;
      background: #0891b2;
      border-radius: 4px;
      display: inline-block;
      margin-right: 8px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px 15px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
    }

    .info-label {
      font-size: 7.5pt;
      color: #6b7280;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.3px;
      margin-bottom: 2px;
    }

    .info-value {
      font-size: 9pt;
      color: #111827;
      font-weight: 500;
    }

    /* Complicaciones Grid */
    .complications-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
      margin-top: 10px;
    }

    .complication-badge {
      background: #f3f4f6;
      padding: 6px 8px;
      border-radius: 4px;
      font-size: 8pt;
      text-align: center;
    }

    .complication-badge.yes {
      background: #fef3c7;
      color: #92400e;
      font-weight: 600;
    }

    .complication-badge.no {
      background: #ecfdf5;
      color: #065f46;
    }

    /* Fases Quirúrgicas */
    .surgical-phases {
      margin-bottom: 15px;
    }

    .phase-section {
      background: white;
      border-radius: 6px;
      margin-bottom: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      page-break-inside: avoid;
    }

    .phase-header {
      padding: 10px 15px;
      color: white;
      font-size: 10pt;
      font-weight: 700;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .phase-content {
      padding: 12px;
    }

    .monitoring-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
    }

    .monitoring-table th {
      background: #f9fafb;
      padding: 6px 8px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
      font-size: 7.5pt;
      text-transform: uppercase;
    }

    .monitoring-table td {
      padding: 5px 8px;
      border-bottom: 1px solid #f3f4f6;
    }

    .monitoring-table tr:hover {
      background: #f9fafb;
    }

    /* Balance de Líquidos */
    .fluid-balance {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
      margin-top: 10px;
    }

    .balance-card {
      background: #f9fafb;
      border-radius: 6px;
      padding: 10px;
      border-left: 3px solid #d1d5db;
    }

    .balance-card.inputs {
      border-left-color: #10b981;
    }

    .balance-card.outputs {
      border-left-color: #ef4444;
    }

    .balance-card.total {
      border-left-color: #3b82f6;
      background: #eff6ff;
    }

    .balance-title {
      font-size: 8pt;
      font-weight: 600;
      color: #6b7280;
      margin-bottom: 8px;
      text-transform: uppercase;
    }

    .balance-value {
      font-size: 16pt;
      font-weight: 700;
      color: #111827;
    }

    .balance-items {
      margin-top: 8px;
      font-size: 7.5pt;
      color: #6b7280;
    }

    .balance-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
    }

    /* Equipo Quirúrgico */
    .team-section {
      background: white;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 15px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .team-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .team-member {
      background: #f9fafb;
      padding: 8px 12px;
      border-radius: 4px;
      border-left: 3px solid #0891b2;
    }

    .team-role {
      font-size: 7.5pt;
      color: #6b7280;
      font-weight: 600;
      text-transform: uppercase;
    }

    .team-name {
      font-size: 9pt;
      color: #111827;
      font-weight: 600;
      margin-top: 2px;
    }

    /* Footer */
    .footer {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 7.5pt;
      color: #9ca3af;
    }

    .no-data {
      text-align: center;
      padding: 20px;
      color: #9ca3af;
      font-style: italic;
    }
  </style>
</head>
<body>

  <!-- Header Mejorado -->
  <div class="header">
    <div class="header-left">
      <h1>🏥 Programa Nacional de Trasplante Hepático</h1>
      <div class="subtitle">Unidad Bi-Institucional • Ficha Anestésica</div>
    </div>
    <div class="header-right">
      <div class="patient-name">${patient.name || '-'}</div>
      <div class="patient-info">CI: ${formatCI(patient.id)} | ${formatDate(caseData.startAt, 'dd/MM/yyyy HH:mm')}</div>
    </div>
  </div>

  <!-- Dashboard de Métricas Clave -->
  <div class="dashboard">
    <div class="metric-card ${preop?.meld > 20 ? 'danger' : preop?.meld > 15 ? 'warning' : 'success'}">
      <div class="metric-label">MELD Score</div>
      <div class="metric-value">${preop?.meld || '-'}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Duración</div>
      <div class="metric-value">${caseData.duration ? Math.floor(caseData.duration / 60) : '-'} <span class="metric-unit">hrs</span></div>
    </div>
    <div class="metric-card ${caseData.coldIschemiaTime > 480 ? 'warning' : 'success'}">
      <div class="metric-label">Isquemia Fría</div>
      <div class="metric-value">${caseData.coldIschemiaTime || '-'} <span class="metric-unit">min</span></div>
    </div>
    <div class="metric-card ${caseData.warmIschemiaTime > 60 ? 'warning' : 'success'}">
      <div class="metric-label">Isquemia Caliente</div>
      <div class="metric-value">${caseData.warmIschemiaTime || '-'} <span class="metric-unit">min</span></div>
    </div>
    <div class="metric-card ${postop?.icuDays > 7 ? 'warning' : 'success'}">
      <div class="metric-label">Días UCI</div>
      <div class="metric-value">${postop?.icuDays || '-'}</div>
    </div>
  </div>

  <!-- Información del Paciente y Caso -->
  <div class="patient-section">
    <div class="section-title">
      <span class="section-title-icon"></span>
      Datos del Paciente y Cirugía
    </div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Sexo</div>
        <div class="info-value">${patient.sex || '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Edad</div>
        <div class="info-value">${patient.birthDate ? Math.floor((new Date(caseData.startAt) - new Date(patient.birthDate)) / 31557600000) + ' años' : '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Peso</div>
        <div class="info-value">${patient.weight ? patient.weight + ' kg' : '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Talla</div>
        <div class="info-value">${patient.height ? patient.height + ' cm' : '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Prestador</div>
        <div class="info-value">${patient.provider || '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Procedencia</div>
        <div class="info-value">${patient.origin || '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">ASA</div>
        <div class="info-value">${caseData.asa || '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Retrasplante</div>
        <div class="info-value">${caseData.isRetransplant ? 'Sí' : 'No'}</div>
      </div>
    </div>

    ${preop ? `
    <div class="section-title" style="margin-top: 15px;">
      <span class="section-title-icon"></span>
      Evaluación Preoperatoria
    </div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Etiología 1</div>
        <div class="info-value">${preop.etiology1 || '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Etiología 2</div>
        <div class="info-value">${preop.etiology2 || '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">MELD</div>
        <div class="info-value">${preop.meld || '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">MELD-Na</div>
        <div class="info-value">${preop.meldNa || '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Child-Pugh</div>
        <div class="info-value">${preop.child || '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Falla Hepática Fulminante</div>
        <div class="info-value">${preop.acuteLiverFailure ? 'Sí' : 'No'}</div>
      </div>
    </div>

    <div class="section-title" style="margin-top: 10px;">
      <span class="section-title-icon"></span>
      Complicaciones de la Hepatopatía
    </div>
    <div class="complications-grid">
      <div class="complication-badge ${preop.hepatorenalSyndrome ? 'yes' : 'no'}">
        ${preop.hepatorenalSyndrome ? '✓' : '○'} Sínd. Hepatorenal
      </div>
      <div class="complication-badge ${preop.hepatopulmonarySyndrome ? 'yes' : 'no'}">
        ${preop.hepatopulmonarySyndrome ? '✓' : '○'} Sínd. Hepatopulmonar
      </div>
      <div class="complication-badge ${preop.pulmonaryHypertension ? 'yes' : 'no'}">
        ${preop.pulmonaryHypertension ? '✓' : '○'} HT Pulmonar
      </div>
      <div class="complication-badge ${preop.esophagealVarices ? 'yes' : 'no'}">
        ${preop.esophagealVarices ? '✓' : '○'} Várices Esofágicas
      </div>
      <div class="complication-badge ${preop.encephalopathy ? 'yes' : 'no'}">
        ${preop.encephalopathy ? '✓' : '○'} Encefalopatía
      </div>
      <div class="complication-badge ${preop.hyponatremia ? 'yes' : 'no'}">
        ${preop.hyponatremia ? '✓' : '○'} Hiponatremia
      </div>
    </div>
    ` : ''}
  </div>

  <!-- Fases Quirúrgicas con Codificación de Colores -->
  <div class="surgical-phases">
    ${Object.entries(phaseConfig).map(([phase, config]) => {
      const records = intraopByPhase[phase] || [];
      if (records.length === 0) return '';

      return `
      <div class="phase-section">
        <div class="phase-header" style="background: ${config.color};">
          <span>${config.label}</span>
          <span>${records.length} registro(s)</span>
        </div>
        <div class="phase-content">
          <table class="monitoring-table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>FC</th>
                <th>PAS/PAD</th>
                <th>PAM</th>
                <th>SpO₂</th>
                <th>Temp</th>
                <th>FiO₂</th>
                <th>PEEP</th>
                <th>PVC</th>
                <th>Diuresis</th>
                <th>Sangrado</th>
              </tr>
            </thead>
            <tbody>
              ${records.slice(0, 5).map(r => `
              <tr>
                <td>${r.timestamp ? formatDate(r.timestamp, 'HH:mm') : '-'}</td>
                <td>${r.heartRate || '-'}</td>
                <td>${r.pas && r.pad ? `${r.pas}/${r.pad}` : '-'}</td>
                <td>${r.pam || '-'}</td>
                <td>${r.spo2 ? r.spo2 + '%' : '-'}</td>
                <td>${r.temperature ? r.temperature + '°C' : '-'}</td>
                <td>${r.fio2 ? r.fio2 + '%' : '-'}</td>
                <td>${r.peep || '-'}</td>
                <td>${r.cvp || '-'}</td>
                <td>${r.urineOutput || '-'}</td>
                <td>${r.bloodLoss || '-'}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
          ${records.length > 5 ? `<div style="text-align: center; margin-top: 8px; color: #9ca3af; font-size: 7.5pt;">... y ${records.length - 5} registro(s) más</div>` : ''}
        </div>
      </div>
      `;
    }).join('')}
  </div>

  <!-- Equipo Quirúrgico -->
  ${team && team.length > 0 ? `
  <div class="team-section">
    <div class="section-title">
      <span class="section-title-icon"></span>
      Equipo Quirúrgico
    </div>
    <div class="team-grid">
      ${team.map(member => `
      <div class="team-member">
        <div class="team-role">${member.role}</div>
        <div class="team-name">${member.clinician.name}</div>
      </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <!-- Footer -->
  <div class="footer">
    <strong>Sistema de Registro Anestesiológico TxH</strong><br>
    Generado el ${formatDate(new Date(), "dd/MM/yyyy 'a las' HH:mm")} • Programa Nacional de Trasplante Hepático
  </div>

</body>
</html>
  `;
}

/**
 * Generar PDF de un caso
 */
async function generateCasePDF(caseId) {
  // Obtener datos
  const data = await getCaseDataForPDF(caseId);

  // Generar HTML
  const html = generateHTML(data);

  // Generar PDF con Puppeteer
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: {
      top: '0mm',
      right: '0mm',
      bottom: '0mm',
      left: '0mm',
    },
  });

  await browser.close();

  return pdfBuffer;
}

module.exports = {
  generateCasePDF,
  getCaseDataForPDF,
};
