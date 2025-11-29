// src/services/pdfService.js - Servicio para generación de PDFs

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

  return {
    case: caseData,
    patient: caseData.patient,
    team: caseData.team,
    preop,
    intraopByPhase,
    postop,
  };
}

/**
 * Generar plantilla HTML para el PDF
 */
function generateHTML(data) {
  const { case: caseData, patient, team, preop, intraopByPhase, postop: _postop } = data;

  const phaseLabels = {
    INDUCCION: 'Inducción',
    DISECCION: 'Disección',
    ANHEPATICA_INICIAL: 'Anhepática Inicial',
    PRE_REPERFUSION: 'Pre-Reperfusión',
    POST_REPERFUSION_INICIAL: 'Post-Reperfusión Inicial',
    FIN_VIA_BILIAR: 'Fin Vía Biliar',
    CIERRE: 'Cierre',
  };

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ficha de Trasplante Hepático</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #333;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 15px;
      border-bottom: 3px solid #00a0a0;
      margin-bottom: 20px;
    }

    .logo-section {
      flex: 1;
    }

    .logo-placeholder {
      width: 60px;
      height: 60px;
      background: #00a0a0;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      font-weight: bold;
    }

    .title-section {
      flex: 2;
      text-align: center;
    }

    h1 {
      font-size: 18pt;
      color: #00a0a0;
      margin-bottom: 5px;
    }

    .subtitle {
      font-size: 11pt;
      color: #666;
    }

    .info-section {
      flex: 1;
      text-align: right;
      font-size: 9pt;
      color: #666;
    }

    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 12pt;
      font-weight: bold;
      color: #00a0a0;
      padding: 5px 10px;
      background: #f0f9f9;
      border-left: 4px solid #00a0a0;
      margin-bottom: 10px;
    }

    .data-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 10px;
    }

    .data-field {
      padding: 5px;
    }

    .label {
      font-size: 8pt;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    .value {
      font-size: 10pt;
      color: #000;
      margin-top: 2px;
      font-weight: 500;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 9pt;
    }

    th {
      background: #00a0a0;
      color: white;
      padding: 6px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 9pt;
    }

    td {
      padding: 5px 8px;
      border-bottom: 1px solid #e0e0e0;
    }

    tr:nth-child(even) {
      background: #f9f9f9;
    }

    .phase-table {
      margin-bottom: 15px;
    }

    .phase-header {
      font-size: 10pt;
      font-weight: bold;
      color: #00a0a0;
      margin-top: 10px;
      margin-bottom: 5px;
    }

    .team-member {
      padding: 8px;
      border-bottom: 1px solid #e0e0e0;
    }

    .team-member:last-child {
      border-bottom: none;
    }

    .member-name {
      font-weight: bold;
      color: #000;
    }

    .member-role {
      font-size: 9pt;
      color: #666;
      margin-top: 2px;
    }

    .signatures {
      margin-top: 30px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
    }

    .signature-box {
      border-top: 1px solid #333;
      padding-top: 10px;
      text-align: center;
    }

    .signature-label {
      font-size: 9pt;
      color: #666;
    }

    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 8pt;
      color: #999;
      border-top: 1px solid #e0e0e0;
      padding-top: 10px;
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 8pt;
      font-weight: 600;
    }

    .badge-yes {
      background: #d4edda;
      color: #155724;
    }

    .badge-no {
      background: #f8d7da;
      color: #721c24;
    }

    @media print {
      .page-break {
        page-break-before: always;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="logo-section">
      <div class="logo-placeholder">TxH</div>
    </div>
    <div class="title-section">
      <h1>Ficha de Trasplante Hepático</h1>
      <div class="subtitle">Sistema de Registro Anestesiológico</div>
    </div>
    <div class="info-section">
      <div>Hospital de Clínicas</div>
      <div>Universidad de la República</div>
      <div>Montevideo, Uruguay</div>
    </div>
  </div>

  <!-- Datos del Paciente -->
  <div class="section">
    <div class="section-title">Datos del Paciente</div>
    <div class="data-grid">
      <div class="data-field">
        <div class="label">CI</div>
        <div class="value">${formatCI(patient.id)}</div>
      </div>
      <div class="data-field">
        <div class="label">Nombre</div>
        <div class="value">${patient.name || '-'}</div>
      </div>
      <div class="data-field">
        <div class="label">Fecha de Nacimiento</div>
        <div class="value">${formatDate(patient.birthDate)}</div>
      </div>
      <div class="data-field">
        <div class="label">Sexo</div>
        <div class="value">${patient.sex || '-'}</div>
      </div>
      <div class="data-field">
        <div class="label">Prestador</div>
        <div class="value">${patient.provider || '-'}</div>
      </div>
      <div class="data-field">
        <div class="label">Grupo Sanguíneo</div>
        <div class="value">${patient.bloodGroup || '-'}</div>
      </div>
    </div>
  </div>

  <!-- Datos del Trasplante -->
  <div class="section">
    <div class="section-title">Datos del Trasplante</div>
    <div class="data-grid">
      <div class="data-field">
        <div class="label">Fecha/Hora Inicio</div>
        <div class="value">${formatDate(caseData.startAt, 'dd/MM/yyyy HH:mm')}</div>
      </div>
      <div class="data-field">
        <div class="label">Fecha/Hora Fin</div>
        <div class="value">${formatDate(caseData.endAt, 'dd/MM/yyyy HH:mm')}</div>
      </div>
      <div class="data-field">
        <div class="label">Duración</div>
        <div class="value">${formatDuration(caseData.duration)}</div>
      </div>
      <div class="data-field">
        <div class="label">Retrasplante</div>
        <div class="value">
          <span class="badge ${caseData.isRetransplant ? 'badge-yes' : 'badge-no'}">
            ${caseData.isRetransplant ? 'Sí' : 'No'}
          </span>
        </div>
      </div>
      <div class="data-field">
        <div class="label">Hepato-Renal</div>
        <div class="value">
          <span class="badge ${caseData.isHepatoRenal ? 'badge-yes' : 'badge-no'}">
            ${caseData.isHepatoRenal ? 'Sí' : 'No'}
          </span>
        </div>
      </div>
      <div class="data-field">
        <div class="label">Donante Óptimo</div>
        <div class="value">
          <span class="badge ${caseData.optimalDonor ? 'badge-yes' : 'badge-no'}">
            ${caseData.optimalDonor ? 'Sí' : 'No'}
          </span>
        </div>
      </div>
      <div class="data-field">
        <div class="label">Procedencia</div>
        <div class="value">${caseData.provenance || '-'}</div>
      </div>
      <div class="data-field">
        <div class="label">T. Isquemia Fría (min)</div>
        <div class="value">${caseData.coldIschemiaTime || '-'}</div>
      </div>
      <div class="data-field">
        <div class="label">T. Isquemia Caliente (min)</div>
        <div class="value">${caseData.warmIschemiaTime || '-'}</div>
      </div>
    </div>
  </div>

  <!-- Evaluación Preoperatoria -->
  ${preop ? `
  <div class="section">
    <div class="section-title">Evaluación Preoperatoria</div>
    <div class="data-grid">
      <div class="data-field">
        <div class="label">Fecha Evaluación</div>
        <div class="value">${formatDate(preop.evaluationDate)}</div>
      </div>
      <div class="data-field">
        <div class="label">MELD</div>
        <div class="value">${preop.meld || '-'}</div>
      </div>
      <div class="data-field">
        <div class="label">MELD-Na</div>
        <div class="value">${preop.meldNa || '-'}</div>
      </div>
      <div class="data-field">
        <div class="label">Child</div>
        <div class="value">${preop.child || '-'}</div>
      </div>
      <div class="data-field">
        <div class="label">Etiología 1</div>
        <div class="value">${preop.etiology1 || '-'}</div>
      </div>
      <div class="data-field">
        <div class="label">Etiología 2</div>
        <div class="value">${preop.etiology2 || '-'}</div>
      </div>
    </div>
  </div>
  ` : ''}

  <!-- Página 2: Registro Intraoperatorio -->
  <div class="page-break"></div>
  <div class="section">
    <div class="section-title">Registro Intraoperatorio</div>

    ${Object.keys(intraopByPhase).map(phase => {
      const records = intraopByPhase[phase];
      if (records.length === 0) return '';

      return `
        <div class="phase-table">
          <div class="phase-header">${phaseLabels[phase]}</div>
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>FC</th>
                <th>PAS</th>
                <th>PAD</th>
                <th>PAm</th>
                <th>PVC</th>
                <th>PEEP</th>
                <th>FiO₂</th>
                <th>Vt</th>
              </tr>
            </thead>
            <tbody>
              ${records.map(r => `
                <tr>
                  <td>${formatDate(r.timestamp, 'HH:mm')}</td>
                  <td>${r.heartRate || '-'}</td>
                  <td>${r.sys || '-'}</td>
                  <td>${r.dia || '-'}</td>
                  <td><strong>${r.map || '-'}</strong></td>
                  <td>${r.cvp || '-'}</td>
                  <td>${r.peep || '-'}</td>
                  <td>${r.fio2 || '-'}</td>
                  <td>${r.vt || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }).join('')}
  </div>

  <!-- Equipo Clínico -->
  <div class="section">
    <div class="section-title">Equipo Clínico</div>
    ${team.map(member => `
      <div class="team-member">
        <div class="member-name">${member.clinician?.name || 'Sin nombre'}</div>
        <div class="member-role">
          ${member.role || 'Sin rol'} ${member.clinician?.specialty ? '• ' + member.clinician.specialty : ''}
        </div>
      </div>
    `).join('')}
    ${team.length === 0 ? '<p style="color: #999;">No hay equipo registrado</p>' : ''}
  </div>

  <!-- Observaciones -->
  ${caseData.observations ? `
  <div class="section">
    <div class="section-title">Observaciones</div>
    <p>${caseData.observations}</p>
  </div>
  ` : ''}

  <!-- Firmas -->
  <div class="signatures">
    <div class="signature-box">
      <div class="signature-label">Anestesiólogo</div>
    </div>
    <div class="signature-box">
      <div class="signature-label">Cirujano</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    Documento generado el ${formatDate(new Date(), 'dd/MM/yyyy HH:mm')} • Sistema Registro TxH v1.0
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

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm',
      },
    });

    return pdf;
  } finally {
    await browser.close();
  }
}

module.exports = {
  generateCasePDF,
  getCaseDataForPDF,
};
