// src/services/pdfService-improved.js - Servicio mejorado para generación de PDFs

const { launchBrowser } = require('../lib/puppeteer');
const { format } = require('date-fns');
const { es } = require('date-fns/locale');
const prisma = require('../lib/prisma');
const { NotFoundError } = require('../middlewares/errorHandler');
const fs = require('fs');
const path = require('path');

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
 * Cargar logo en base64
 */
function getLogoBase64() {
  try {
    // Try JPEG first
    let logoPath = path.join(__dirname, '../../assets/logo-txh.jpeg');
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      return `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;
    }

    // Fallback to PNG
    logoPath = path.join(__dirname, '../../assets/logo-txh.png');
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      return `data:image/png;base64,${logoBuffer.toString('base64')}`;
    }
  } catch (error) {
    console.warn('Logo no encontrado, usando placeholder');
  }
  return null;
}

/**
 * Obtener datos completos del caso para PDF
 */
async function getCaseDataForPDF(caseId) {
  const caseData = await prisma.transplantCase.findUnique({
    where: { id: caseId },
    include: {
      patient: true,
      organization: true,
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
    'ESTADO_BASAL',
    'INDUCCION',
    'DISECCION',
    'ANHEPATICA',
    'PRE_REPERFUSION',
    'POST_REPERFUSION',
    'VIA_BILIAR',
    'CIERRE',
    'SALIDA_BQ',
  ];

  phases.forEach((phase) => {
    intraopByPhase[phase] = intraopRecords.filter((r) => r.phase === phase);
  });

  // Obtener fluids and blood records (NUEVO)
  const fluidsRecords = await prisma.fluidsAndBlood.findMany({
    where: { caseId },
    orderBy: [{ phase: 'asc' }, { timestamp: 'asc' }],
  });

  // Agrupar fluids por fase (NUEVO)
  const fluidsByPhase = {};
  phases.forEach((phase) => {
    fluidsByPhase[phase] = fluidsRecords.filter((r) => r.phase === phase);
  });

  // Obtener fármacos administrados
  const drugsRecords = await prisma.drugsGiven.findMany({
    where: { caseId },
    orderBy: [{ phase: 'asc' }, { timestamp: 'asc' }],
  });

  // Agrupar fármacos por fase
  const drugsByPhase = {};
  phases.forEach((phase) => {
    drugsByPhase[phase] = drugsRecords.filter((r) => r.phase === phase);
  });

  // Calcular totales generales (NUEVO)
  const totals = calculateTotals(intraopRecords, fluidsRecords);

  // Obtener postop
  const postop = await prisma.postOpOutcome.findUnique({
    where: { caseId },
  });

  // Obtener mortality
  const mortality = await prisma.mortality.findUnique({
    where: { patientId: caseData.patientId },
  });

  // Obtener líneas y monitoreo
  const linesMonitoring = await prisma.linesAndMonitoring.findUnique({
    where: { caseId },
    include: {
      vascularLines: true,
    },
  });

  return {
    case: caseData,
    patient: caseData.patient,
    organization: caseData.organization,
    preop,
    intraopByPhase,
    fluidsByPhase,
    drugsByPhase,
    totals,
    postop,
    mortality,
    team: caseData.team,
    linesMonitoring,
    intraopRecords,      // Agregar registros completos para gráficas
    fluidsRecords,       // Agregar registros completos para gráficas
  };
}

/**
 * Calcular totales generales del caso (CORREGIDO)
 * Los registros son ACUMULATIVOS, por lo que tomamos el ÚLTIMO registro (fase CIERRE)
 */
function calculateTotals(intraopRecords, fluidsRecords) {
  // Si no hay registros, retornar zeros
  if (!fluidsRecords || fluidsRecords.length === 0) {
    return {
      totalBloodLoss: 0,
      totalUrine: 0,
      totalCristalloids: 0,
      totalColloids: 0,
      totalAlbumin: 0,
      totalRBC: 0,
      totalPlasma: 0,
      totalPlatelets: 0,
      totalCryoprecip: 0,
      totalFibrinogen: 0,
      totalPCC: 0,
      totalInsensibleLoss: 0,
      totalAscites: 0,
      totalInputs: 0,
      totalLosses: 0,
      netBalance: 0,
    };
  }

  // Buscar el último registro (normalmente en fase CIERRE)
  // Los registros ya vienen ordenados por fase y timestamp
  const lastRecord = fluidsRecords[fluidsRecords.length - 1];

  // Constantes de conversión de hemoderivados a ml
  const GR_ML = 350;      // 1 U de glóbulos rojos = 350 ml
  const PLASMA_ML = 250;  // 1 U de plasma fresco = 250 ml
  const PLATELETS_ML = 50; // 1 U de plaquetas = 50 ml

  // Calcular totales desde el último registro (valores acumulativos)
  const totalCristalloids = (lastRecord.plasmalyte || 0) + (lastRecord.ringer || 0) +
                            (lastRecord.saline || 0) + (lastRecord.dextrose || 0);
  const totalColloids = lastRecord.colloids || 0;
  const totalAlbumin = lastRecord.albumin || 0;
  const totalRBC = lastRecord.redBloodCells || 0;
  const totalPlasma = lastRecord.plasma || 0;
  const totalPlatelets = lastRecord.platelets || 0;
  const totalCryoprecip = lastRecord.cryoprecip || 0;
  const totalFibrinogen = lastRecord.fibrinogen || 0;
  const totalPCC = lastRecord.pcc || 0;
  const totalUrine = lastRecord.urine || 0;
  const totalInsensibleLoss = lastRecord.insensibleLoss || 0;
  const totalAscites = lastRecord.ascites || 0;

  // El sangrado total es succión + gasas + cell saver
  const totalBloodLoss = (lastRecord.suction || 0) + (lastRecord.gauze || 0) + (lastRecord.cellSaver || 0);

  // Calcular ingresos totales (cristaloides + coloides + albúmina + hemoderivados en ml + crioprecipitados + cell saver)
  const hemoderivadosML = (totalRBC * GR_ML) + (totalPlasma * PLASMA_ML) + (totalPlatelets * PLATELETS_ML);
  const totalInputs = totalCristalloids + totalColloids + totalAlbumin + hemoderivadosML + totalCryoprecip + (lastRecord.cellSaver || 0);

  // Calcular egresos totales
  const totalLosses = totalInsensibleLoss + totalAscites + (lastRecord.suction || 0) + (lastRecord.gauze || 0) + totalUrine;

  const netBalance = totalInputs - totalLosses;

  return {
    totalBloodLoss,
    totalUrine,
    totalCristalloids,
    totalColloids,
    totalAlbumin,
    totalRBC,
    totalPlasma,
    totalPlatelets,
    totalCryoprecip,
    totalFibrinogen,
    totalPCC,
    totalInsensibleLoss,
    totalAscites,
    totalInputs,
    totalLosses,
    netBalance,
  };
}

/**
 * Generar sección de laboratorios para una fase
 */
function generateLabSection(records) {
  // Filtrar registros que tienen al menos un valor de laboratorio
  const recordsWithLabs = records.filter(r =>
    r.hb || r.hto || r.platelets || r.sodium || r.potassium || r.ionicCalcium ||
    r.pH || r.lactate || r.glucose || r.inr || r.fibrinogen
  );

  if (recordsWithLabs.length === 0) return '';

  return `
    <div style="margin-top: 15px;">
      <h4 style="font-size: 9pt; font-weight: 600; color: #374151; margin-bottom: 8px;">PARACL\u00cdNICA</h4>
      <table class="monitoring-table">
        <thead>
          <tr>
            <th>Hora</th>
            <th>Hb</th>
            <th>Hto</th>
            <th>Plaq</th>
            <th>INR</th>
            <th>Fibr</th>
            <th>Na+</th>
            <th>K+</th>
            <th>Ca++</th>
            <th>pH</th>
            <th>Lactato</th>
            <th>Glucosa</th>
          </tr>
        </thead>
        <tbody>
          ${recordsWithLabs.map(r => `
          <tr>
            <td>${r.timestamp ? formatDate(r.timestamp, 'HH:mm:ss') : '-'}</td>
            <td>${r.hb ? r.hb.toFixed(1) : '-'}</td>
            <td>${r.hto ? r.hto.toFixed(1) : '-'}</td>
            <td>${r.platelets ? r.platelets.toFixed(0) : '-'}</td>
            <td>${r.inr ? r.inr.toFixed(2) : '-'}</td>
            <td>${r.fibrinogen ? r.fibrinogen.toFixed(0) : '-'}</td>
            <td>${r.sodium ? r.sodium.toFixed(1) : '-'}</td>
            <td>${r.potassium ? r.potassium.toFixed(1) : '-'}</td>
            <td>${r.ionicCalcium ? r.ionicCalcium.toFixed(2) : '-'}</td>
            <td>${r.pH ? r.pH.toFixed(2) : '-'}</td>
            <td>${r.lactate ? r.lactate.toFixed(1) : '-'}</td>
            <td>${r.glucose ? r.glucose.toFixed(0) : '-'}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Generar sección de balance de fluidos para una fase
 */
function generateFluidsSection(fluidsRecords) {
  if (fluidsRecords.length === 0) return '';

  return `
    <div style="margin-top: 15px;">
      <h4 style="font-size: 9pt; font-weight: 600; color: #374151; margin-bottom: 8px;">BALANCE DE L\u00cdQUIDOS Y HEMODERIVADOS</h4>
      <table class="monitoring-table">
        <thead>
          <tr>
            <th>Hora</th>
            <th colspan="6" style="background: #ecfdf5; color: #065f46;">INGRESOS (ml)</th>
            <th colspan="6" style="background: #fee2e2; color: #991b1b;">EGRESOS (ml)</th>
            <th style="background: #eff6ff; color: #1e40af;">Balance</th>
          </tr>
          <tr>
            <th></th>
            <th>Cristal</th>
            <th>Coloides</th>
            <th>Albúm</th>
            <th>GR</th>
            <th>PFC</th>
            <th>Cell Saver</th>
            <th>Diuresis</th>
            <th>Pérd. Insens.</th>
            <th>Ascitis</th>
            <th>Aspiración</th>
            <th>Gasas</th>
            <th>Cell Saver Desc.</th>
            <th>Neto</th>
          </tr>
        </thead>
        <tbody>
          ${fluidsRecords.map((f, idx, arr) => {
            // Evitar duplicados: solo mostrar si es diferente al anterior o es el primero
            if (idx > 0 && f.timestamp === arr[idx - 1].timestamp) {
              return '';
            }

            const cristalloids = (f.plasmalyte || 0) + (f.ringer || 0) + (f.saline || 0) + (f.dextrose || 0);
            const colloids = f.colloids || 0;
            const albumin = f.albumin || 0;
            const inputs = cristalloids + colloids + albumin + (f.redBloodCells || 0) + (f.plasma || 0) + (f.cellSaver || 0);
            const losses = (f.urine || 0) + (f.insensibleLoss || 0) + (f.ascites || 0) + (f.suction || 0) + (f.gauze || 0) + (f.cellSaverDiscarded || 0);
            const balance = inputs - losses;

            return `
          <tr>
            <td>${f.timestamp ? formatDate(f.timestamp, 'HH:mm:ss') : '-'}</td>
            <td>${cristalloids || '-'}</td>
            <td>${colloids || '-'}</td>
            <td>${albumin || '-'}</td>
            <td>${f.redBloodCells || '-'}</td>
            <td>${f.plasma || '-'}</td>
            <td style="background: #ecfdf5;">${f.cellSaver || '-'}</td>
            <td>${f.urine || '-'}</td>
            <td>${f.insensibleLoss || 0}</td>
            <td>${f.ascites || 0}</td>
            <td>${f.suction || '-'}</td>
            <td>${f.gauze || '-'}</td>
            <td style="background: #fee2e2;">${f.cellSaverDiscarded || '-'}</td>
            <td style="font-weight: 600; ${balance >= 0 ? 'color: #065f46;' : 'color: #991b1b;'}">${balance >= 0 ? '+' : ''}${balance}</td>
          </tr>
          `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Generar sección detallada de fármacos por timestamp (formato simplificado)
 */
function generateDrugsDetailSection(intraopRecords) {
  // Filtrar registros que tienen al menos un fármaco
  const recordsWithDrugs = intraopRecords.filter(r =>
    r.inhalAgent || r.opioidBolus || r.opioidInfusion || r.hypnoticBolus || r.hypnoticInfusion ||
    r.relaxantBolus || r.relaxantInfusion || r.lidocaineBolus || r.lidocaineInfusion ||
    r.adrenalineBolus || r.adrenalineInfusion || r.dobutamine || r.dopamine ||
    r.noradrenaline || r.phenylephrine || r.insulinBolus || r.insulinInfusion ||
    r.furosemide || r.tranexamicBolus || r.tranexamicInfusion ||
    r.calciumGluconBolus || r.calciumGluconInfusion || r.sodiumBicarb || r.antibiotics
  );

  if (recordsWithDrugs.length === 0) return '';

  return `
    <div style="margin-top: 15px;">
      <h4 style="font-size: 9pt; font-weight: 600; color: #374151; margin-bottom: 8px;">FÁRMACOS ADMINISTRADOS</h4>
      <div style="display: grid; gap: 8px;">
        ${recordsWithDrugs.map(d => {
          const drugs = [];

          // Recopilar todos los fármacos administrados
          // Nota: inhalAgent es String, el resto son Boolean
          if (d.inhalAgent) drugs.push(`Agente Inhalatorio: ${d.inhalAgent}`);
          if (d.opioidBolus) drugs.push(`Opioide Bolo`);
          if (d.opioidInfusion) drugs.push(`Opioide Infusión`);
          if (d.hypnoticBolus) drugs.push(`Hipnótico Bolo`);
          if (d.hypnoticInfusion) drugs.push(`Hipnótico Infusión`);
          if (d.relaxantBolus) drugs.push(`Relajante Bolo`);
          if (d.relaxantInfusion) drugs.push(`Relajante Infusión`);
          if (d.lidocaineBolus) drugs.push(`Lidocaína Bolo`);
          if (d.lidocaineInfusion) drugs.push(`Lidocaína Infusión`);
          if (d.adrenalineBolus) drugs.push(`Adrenalina Bolo`);
          if (d.adrenalineInfusion) drugs.push(`Adrenalina Infusión`);
          if (d.dobutamine) drugs.push(`Dobutamina`);
          if (d.dopamine) drugs.push(`Dopamina`);
          if (d.noradrenaline) drugs.push(`Noradrenalina`);
          if (d.phenylephrine) drugs.push(`Fenilefrina`);
          if (d.insulinBolus) drugs.push(`Insulina Bolo`);
          if (d.insulinInfusion) drugs.push(`Insulina Infusión`);
          if (d.furosemide) drugs.push(`Furosemida`);
          if (d.tranexamicBolus) drugs.push(`Ácido Tranexámico Bolo`);
          if (d.tranexamicInfusion) drugs.push(`Ácido Tranexámico Infusión`);
          if (d.calciumGluconBolus) drugs.push(`Gluconato de Calcio Bolo`);
          if (d.calciumGluconInfusion) drugs.push(`Gluconato de Calcio Infusión`);
          if (d.sodiumBicarb) drugs.push(`Bicarbonato de Sodio`);
          if (d.antibiotics) drugs.push(`Antibióticos`);

          return `
          <div style="background: #f9fafb; padding: 8px 12px; border-radius: 4px; border-left: 3px solid #10b981;">
            <div style="font-size: 8pt; font-weight: 700; color: #059669; margin-bottom: 4px;">
              🕐 ${d.timestamp ? formatDate(d.timestamp, 'HH:mm:ss') : '-'}
            </div>
            <div style="font-size: 8pt; color: #374151; line-height: 1.6;">
              ${drugs.map(drug => `<div>• ${drug}</div>`).join('')}
            </div>
          </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * Generar sección de fármacos para una fase
 */
function generateMedicationsSection(records) {
  // Obtener el resumen de fármacos utilizados en la fase
  const medications = {
    'Opioide Bolo': records.some(r => r.opioidBolus),
    'Opioide Infusión': records.some(r => r.opioidInfusion),
    'Hipnótico Bolo': records.some(r => r.hypnoticBolus),
    'Hipnótico Infusión': records.some(r => r.hypnoticInfusion),
    'Relajante Bolo': records.some(r => r.relaxantBolus),
    'Relajante Infusión': records.some(r => r.relaxantInfusion),
    'Lidocaína Bolo': records.some(r => r.lidocaineBolus),
    'Lidocaína Infusión': records.some(r => r.lidocaineInfusion),
    'Adrenalina Bolo': records.some(r => r.adrenalineBolus),
    'Adrenalina Infusión': records.some(r => r.adrenalineInfusion),
    'Dobutamina': records.some(r => r.dobutamine),
    'Dopamina': records.some(r => r.dopamine),
    'Noradrenalina': records.some(r => r.noradrenaline),
    'Fenilefrina': records.some(r => r.phenylephrine),
    'Insulina Bolo': records.some(r => r.insulinBolus),
    'Insulina Infusión': records.some(r => r.insulinInfusion),
    'Furosemida': records.some(r => r.furosemide),
    'Ácido Tranexámico Bolo': records.some(r => r.tranexamicBolus),
    'Ácido Tranexámico Infusión': records.some(r => r.tranexamicInfusion),
    'Gluconato de Calcio Bolo': records.some(r => r.calciumGluconBolus),
    'Gluconato de Calcio Infusión': records.some(r => r.calciumGluconInfusion),
    'Bicarbonato de Sodio': records.some(r => r.sodiumBicarb),
    'Antibióticos': records.some(r => r.antibiotics),
  };

  const usedMeds = Object.entries(medications).filter(([_, used]) => used);

  if (usedMeds.length === 0) return '';

  return `
    <div style="margin-top: 15px;">
      <h4 style="font-size: 9pt; font-weight: 600; color: #374151; margin-bottom: 8px;">F\u00c1RMACOS UTILIZADOS</h4>
      <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px;">
        ${usedMeds.map(([med, _]) => `
        <div style="background: #ecfdf5; color: #065f46; padding: 4px 8px; border-radius: 4px; font-size: 7.5pt; text-align: center; border: 1px solid #6ee7b7;">
          ✓ ${med}
        </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Preparar datos para las gráficas temporales
 */
function prepareChartData(intraopRecords, fluidsRecords) {
  // Ordenar por timestamp
  const sortedIntraop = [...intraopRecords].sort((a, b) =>
    new Date(a.timestamp) - new Date(b.timestamp)
  );

  // 1. Datos hemodinámicos
  const hemodynamicData = {
    labels: [],
    phases: [],
    heartRate: [],
    map: [],
    cvp: [],
    satO2: [],
    temp: []
  };

  sortedIntraop.forEach(r => {
    if (r.timestamp && (r.heartRate || r.pam || r.cvp || r.satO2 || r.temp)) {
      hemodynamicData.labels.push(formatDate(r.timestamp, 'HH:mm'));
      hemodynamicData.phases.push(r.phase); // Agregar fase aquí
      hemodynamicData.heartRate.push(r.heartRate || null);
      hemodynamicData.map.push(r.pam || null);
      hemodynamicData.cvp.push(r.cvp || null);
      hemodynamicData.satO2.push(r.satO2 || null);
      hemodynamicData.temp.push(r.temp || null);
    }
  });

  // 2. Datos de laboratorio
  const labData = {
    labels: [],
    phases: [],
    hb: [],
    lactate: [],
    glucose: [],
    pH: [],
    pafi: [],
    be: [],
    na: [],
    k: [],
    ca: []
  };

  sortedIntraop.forEach(r => {
    if (r.timestamp && (r.hb || r.lactate || r.glucose || r.pH || r.paO2 || r.baseExcess || r.sodium || r.potassium || r.ionicCalcium)) {
      labData.labels.push(formatDate(r.timestamp, 'HH:mm'));
      labData.phases.push(r.phase); // Agregar fase aquí
      labData.hb.push(r.hb || null);
      labData.lactate.push(r.lactate || null);
      labData.glucose.push(r.glucose || null);
      labData.pH.push(r.pH || null);
      // Calcular PaFI si hay PaO2 y FiO2
      const pafi = (r.paO2 && r.fio2 && r.fio2 > 0) ? Math.round(r.paO2 / r.fio2) : null;
      labData.pafi.push(pafi);
      labData.be.push(r.baseExcess || null);
      labData.na.push(r.sodium || null);
      labData.k.push(r.potassium || null);
      labData.ca.push(r.ionicCalcium || null);
    }
  });

  // 3. Datos de balance de fluidos (acumulativo de fluidsRecords)
  const sortedFluids = [...fluidsRecords].sort((a, b) =>
    new Date(a.timestamp) - new Date(b.timestamp)
  );

  const fluidBalanceData = {
    labels: [],
    phases: [], // Para las bandas de colores
    bloodLoss: [],
    urine: [],
    crystalloids: [],
    colloids: [],
    rbc: []
  };

  sortedFluids.forEach(r => {
    if (r.timestamp) {
      fluidBalanceData.labels.push(formatDate(r.timestamp, 'HH:mm'));
      fluidBalanceData.phases.push(r.phase);
      // Sangrado = suction + gauze
      fluidBalanceData.bloodLoss.push((r.suction || 0) + (r.gauze || 0));
      fluidBalanceData.urine.push(r.urine || 0);
      // Cristaloides = suma de todos los cristaloides
      fluidBalanceData.crystalloids.push((r.plasmalyte || 0) + (r.ringer || 0) + (r.saline || 0) + (r.dextrose || 0));
      // Coloides (ya es un campo)
      fluidBalanceData.colloids.push(r.colloids || 0);
      // GR (redBloodCells convertido a ml: 1 unidad ≈ 300ml)
      fluidBalanceData.rbc.push((r.redBloodCells || 0) * 300);
    }
  });

  return { hemodynamicData, labData, fluidBalanceData };
}

/**
 * Generar HTML mejorado con diseño moderno
 */
function generateHTML(data) {
  const { case: caseData, patient, team, preop, intraopByPhase, fluidsByPhase, drugsByPhase, totals, postop, mortality, linesMonitoring, intraopRecords, fluidsRecords } = data;

  // Cargar logo
  const logoBase64 = getLogoBase64();

  // Preparar datos para gráficas
  const chartData = prepareChartData(intraopRecords || [], fluidsRecords || []);

  const phaseConfig = {
    ESTADO_BASAL: { label: 'Estado Basal', color: '#94a3b8' },
    INDUCCION: { label: 'Inducción Anestésica - Disección', color: '#60a5fa' },
    DISECCION: { label: 'Fase de Disección', color: '#34d399' },
    ANHEPATICA: { label: 'Fase Anhepática', color: '#fbbf24' },
    PRE_REPERFUSION: { label: 'Pre-Reperfusión', color: '#f97316' },
    POST_REPERFUSION: { label: 'Post-Reperfusión', color: '#ec4899' },
    VIA_BILIAR: { label: 'Vía Biliar', color: '#a78bfa' },
    CIERRE: { label: 'Cierre', color: '#6366f1' },
    SALIDA_BQ: { label: 'Salida de Bloque Quirúrgico', color: '#8b5cf6' },
  };

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Trasplante Hepático - ${patient.name}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
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
      padding: 12mm 15mm 15mm 15mm;
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

    /* Estilos para gráficas */
    .charts-section {
      margin-top: 20px;
    }

    .chart-page {
      page-break-before: always;
      page-break-inside: avoid;
      width: 100%;
      max-height: 190mm; /* Altura máxima para caber en página A4 landscape */
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .chart-container {
      background: white;
      border-radius: 8px;
      padding: 15px;
      width: 100%;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      page-break-inside: avoid;
    }

    .chart-title {
      font-size: 12pt;
      font-weight: 600;
      color: #374151;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
      flex-shrink: 0;
    }

    .chart-canvas {
      width: 100%;
      height: 480px;
      max-height: 480px;
      flex-shrink: 0;
    }
  </style>
</head>
<body>

  <!-- Header con Logo -->
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
    <div style="flex-grow: 1;">
      <div style="font-size: 11pt; font-weight: 600; color: #374151; margin-bottom: 3px;">Ficha Anestésica del paciente:</div>
      <div style="font-size: 20pt; font-weight: 700; color: #1f2937; margin-bottom: 4px;">${patient.name || '-'}</div>
      <div style="font-size: 14pt; font-weight: 600; color: #4b5563;">CI: ${formatCI(patient.ciRaw || patient.id)}</div>
    </div>
    <div style="text-align: right; flex-shrink: 0; display: flex; align-items: center; gap: 15px;">
      ${logoBase64 ? `
      <div style="flex-shrink: 0;">
        <img src="${logoBase64}" alt="Logo TxH" style="width: 60px; height: 60px;">
      </div>
      ` : ''}
      <div>
        <div style="font-size: 10pt; font-weight: 600; color: #374151; font-style: italic;">Programa Nacional de Trasplante Hepático</div>
        <div style="font-size: 9pt; color: #6b7280; font-style: italic;">Unidad Bi Institucional</div>
        <div style="font-size: 9pt; color: #0891b2; font-weight: 600; margin-top: 2px;">Área de Anestesiología</div>
      </div>
    </div>
  </div>

  <!-- Información de Horarios y Equipo -->
  <div style="margin-bottom: 15px; padding: 10px; background: #f3f4f6; border-radius: 6px; font-size: 9pt;">
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
      <div>
        <span style="font-weight: 600; color: #374151;">Inicio:</span>
        <span style="color: #6b7280; margin-left: 8px;">${formatDate(caseData.startAt, 'dd/MM/yyyy HH:mm:ss')}</span>
      </div>
      <div>
        <span style="font-weight: 600; color: #374151;">Anestesiólogos:</span>
        <span style="color: #6b7280; margin-left: 8px;">${team.filter(t => {
          const specialty = (t.clinician.specialty || '').toUpperCase();
          return specialty === 'ANESTESIOLOGO' || specialty === 'ANESTESIÓLOGO';
        }).map(t => `CP: ${t.clinician.licenseNumber || 'N/A'}: ${t.clinician.name}`).join(' / ') || '-'}</span>
      </div>
      <div>
        <span style="font-weight: 600; color: #374151;">Finalización:</span>
        <span style="color: #6b7280; margin-left: 8px;">${caseData.endAt ? formatDate(caseData.endAt, 'dd/MM/yyyy HH:mm:ss') : '-'}</span>
      </div>
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
        <div class="info-value">${patient.placeOfOrigin || '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">ASA</div>
        <div class="info-value">${patient.asa || '-'}</div>
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
    <div class="section-title" style="margin-top: 10px;">
      <span class="section-title-icon"></span>
      Etiología
    </div>
    <div class="complications-grid">
      ${preop.etiology1 ? `
      <div class="complication-badge yes">
        ✓ ${preop.etiology1}
      </div>
      ` : ''}
      ${preop.etiology2 ? `
      <div class="complication-badge yes">
        ✓ ${preop.etiology2}
      </div>
      ` : ''}
    </div>

    <div class="info-grid" style="margin-top: 10px;">
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
      <div class="complication-badge ${preop.hepatoRenalSyndrome ? 'yes' : 'no'}">
        ${preop.hepatoRenalSyndrome ? '✓' : '○'} Sínd. Hepatorenal
      </div>
      <div class="complication-badge ${preop.hepatoPulmonarySyndr ? 'yes' : 'no'}">
        ${preop.hepatoPulmonarySyndr ? '✓' : '○'} Sínd. Hepatopulmonar
      </div>
      <div class="complication-badge ${preop.pulmonaryHypertension ? 'yes' : 'no'}">
        ${preop.pulmonaryHypertension ? '✓' : '○'} HT Pulmonar
      </div>
      <div class="complication-badge ${preop.portalHypertension ? 'yes' : 'no'}">
        ${preop.portalHypertension ? '✓' : '○'} HT Portal
      </div>
      <div class="complication-badge ${preop.ascites ? 'yes' : 'no'}">
        ${preop.ascites ? '✓' : '○'} Ascitis
      </div>
      <div class="complication-badge ${preop.esophagealVarices ? 'yes' : 'no'}">
        ${preop.esophagealVarices ? '✓' : '○'} Várices Esofágicas
      </div>
      <div class="complication-badge ${preop.encephalopathy ? 'yes' : 'no'}">
        ${preop.encephalopathy ? '✓' : '○'} Encefalopatía
      </div>
      <div class="complication-badge ${preop.bleeding ? 'yes' : 'no'}">
        ${preop.bleeding ? '✓' : '○'} Sangrado
      </div>
      <div class="complication-badge ${preop.hyponatremia ? 'yes' : 'no'}">
        ${preop.hyponatremia ? '✓' : '○'} Hiponatremia
      </div>
    </div>

    ${preop.complicationsObs ? `
    <div style="margin-top: 12px; padding: 12px 15px; background: linear-gradient(to right, #fffbeb, #fef9c3); border-left: 4px solid #f59e0b; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="font-size: 8.5pt; font-weight: 700; color: #92400e; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.3px;">📋 DETALLE DE COMPLICACIONES:</div>
      <div style="font-size: 9.5pt; color: #78350f; line-height: 1.5; white-space: pre-wrap; font-weight: 500;">${preop.complicationsObs}</div>
    </div>
    ` : ''}
    ` : ''}
  </div>

  <!-- Preoperatorio Inmediato e Inicio de Cirugía -->
  ${linesMonitoring ? `
  <div class="patient-section" style="page-break-inside: avoid;">
    <div class="section-title">
      <span class="section-title-icon"></span>
      Preoperatorio Inmediato e Inicio de la Cirugía
    </div>

    <!-- Colocación de Vías -->
    <div style="margin-top: 10px;">
      <h4 style="font-size: 9pt; font-weight: 600; color: #374151; margin-bottom: 8px;">Colocación de Vías:</h4>
      <div class="info-grid">
        ${linesMonitoring.vascularLines && linesMonitoring.vascularLines.length > 0 ?
          linesMonitoring.vascularLines.map((line, idx) => `
            <div class="info-item">
              <div class="info-label">${line.lineType === 'CVC' ? `CVC ${idx + 1}` : line.lineType === 'ARTERIAL' ? `Arterial ${idx + 1}` : `Periférica ${idx + 1}`}</div>
              <div class="info-value">${line.location}${line.lumens ? ` (${line.lumens} lúmenes)` : ''}${line.size ? ` ${line.size}` : ''}</div>
            </div>
          `).join('') :
          `<div class="info-item"><div class="info-value">No especificado</div></div>`
        }
        ${linesMonitoring.swanGanz ? `
        <div class="info-item">
          <div class="info-label">Swan-Ganz</div>
          <div class="info-value">Sí</div>
        </div>
        ` : ''}
        ${linesMonitoring.peripheralIV ? `
        <div class="info-item">
          <div class="info-label">Vía Periférica</div>
          <div class="info-value">${linesMonitoring.peripheralIV}</div>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- Preparación para la cirugía -->
    <div style="margin-top: 15px;">
      <h4 style="font-size: 9pt; font-weight: 600; color: #374151; margin-bottom: 8px;">Preparación para la cirugía:</h4>
      <div class="complications-grid">
        <div class="complication-badge ${linesMonitoring.elasticBandages ? 'yes' : 'no'}">
          ${linesMonitoring.elasticBandages ? '✓' : '○'} Vendas elásticas
        </div>
        <div class="complication-badge ${linesMonitoring.warmer ? 'yes' : 'no'}">
          ${linesMonitoring.warmer ? '✓' : '○'} Level 1
        </div>
        <div class="complication-badge ${linesMonitoring.cellSaverUsed ? 'yes' : 'no'}">
          ${linesMonitoring.cellSaverUsed ? '✓' : '○'} Cell Saver
        </div>
        <div class="complication-badge ${linesMonitoring.pressurePoints ? 'yes' : 'no'}">
          ${linesMonitoring.pressurePoints ? '✓' : '○'} Puntos de apoyo
        </div>
        <div class="complication-badge ${linesMonitoring.thermalBlanket ? 'yes' : 'no'}">
          ${linesMonitoring.thermalBlanket ? '✓' : '○'} Cobertor aire caliente
        </div>
        ${linesMonitoring.prophylacticATB ? `
        <div class="complication-badge yes">
          ✓ Protocolo ATB: ${linesMonitoring.prophylacticATB}
        </div>
        ` : ''}
      </div>
    </div>

    <!-- Inducción Anestésica -->
    <div style="margin-top: 15px;">
      <h4 style="font-size: 9pt; font-weight: 600; color: #374151; margin-bottom: 8px;">Inducción Anestésica:</h4>
      <div class="info-grid">
        ${linesMonitoring.premedication ? `
        <div class="info-item">
          <div class="info-label">Premedicación</div>
          <div class="info-value">${linesMonitoring.premedication}</div>
        </div>
        ` : ''}
        ${linesMonitoring.airwayType ? `
        <div class="info-item">
          <div class="info-label">Vía Aérea</div>
          <div class="info-value">${linesMonitoring.airwayType}</div>
        </div>
        ` : ''}
        <div class="info-item">
          <div class="info-label">Sellick</div>
          <div class="info-value">${linesMonitoring.tubeSellick ? 'Sí' : 'No'}</div>
        </div>
        ${linesMonitoring.laryngoscopy ? `
        <div class="info-item">
          <div class="info-label">Laringoscopía Grado</div>
          <div class="info-value">Cormack Lehane ${linesMonitoring.laryngoscopy}</div>
        </div>
        ` : ''}
        ${linesMonitoring.anesthesiaType ? `
        <div class="info-item">
          <div class="info-label">Tipo de Anestesia</div>
          <div class="info-value">${linesMonitoring.anesthesiaType}</div>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- Patrón Ventilatorio Intraoperatorio -->
    ${intraopByPhase.INDUCCION && intraopByPhase.INDUCCION.length > 0 ? `
    <div style="margin-top: 15px;">
      <h4 style="font-size: 9pt; font-weight: 600; color: #374151; margin-bottom: 8px;">Patrón Ventilatorio Intraoperatorio:</h4>
      <div class="info-grid">
        ${intraopByPhase.INDUCCION[0].fio2 ? `
        <div class="info-item">
          <div class="info-label">FIO₂</div>
          <div class="info-value">${(intraopByPhase.INDUCCION[0].fio2 * 100).toFixed(0)}%</div>
        </div>
        ` : ''}
        ${intraopByPhase.INDUCCION[0].tidalVolume ? `
        <div class="info-item">
          <div class="info-label">VC (ml)</div>
          <div class="info-value">${intraopByPhase.INDUCCION[0].tidalVolume}</div>
        </div>
        ` : ''}
        ${intraopByPhase.INDUCCION[0].respRate ? `
        <div class="info-item">
          <div class="info-label">Fr (rpm)</div>
          <div class="info-value">${intraopByPhase.INDUCCION[0].respRate}</div>
        </div>
        ` : ''}
        ${intraopByPhase.INDUCCION[0].peakPressure ? `
        <div class="info-item">
          <div class="info-label">PVA (cmH₂O)</div>
          <div class="info-value">${intraopByPhase.INDUCCION[0].peakPressure}</div>
        </div>
        ` : ''}
        ${intraopByPhase.INDUCCION[0].peep ? `
        <div class="info-item">
          <div class="info-label">PEEP (cmH₂O)</div>
          <div class="info-value">${intraopByPhase.INDUCCION[0].peep}</div>
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}
  </div>
  ` : ''}

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
                <th>BIS</th>
              </tr>
            </thead>
            <tbody>
              ${records.map(r => `
              <tr>
                <td>${r.timestamp ? formatDate(r.timestamp, 'HH:mm:ss') : '-'}</td>
                <td>${r.heartRate || '-'}</td>
                <td>${r.pas && r.pad ? `${r.pas}/${r.pad}` : '-'}</td>
                <td>${r.pam || '-'}</td>
                <td>${r.satO2 ? r.satO2 + '%' : '-'}</td>
                <td>${r.temp ? r.temp + '°C' : '-'}</td>
                <td>${r.fio2 ? (r.fio2 * 100).toFixed(0) + '%' : '-'}</td>
                <td>${r.peep || '-'}</td>
                <td>${r.cvp || '-'}</td>
                <td>${r.bis || '-'}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>

          ${generateLabSection(records)}
          ${generateFluidsSection(fluidsByPhase[phase] || [])}
          ${generateDrugsDetailSection(records)}
        </div>
      </div>
      `;
    }).join('')}
  </div>

  <!-- Resumen Final / Totales -->
  <div class="patient-section" style="background: linear-gradient(to right, #eff6ff, #f0f9ff);">
    <div class="section-title">
      <span class="section-title-icon"></span>
      RESUMEN FINAL DEL BALANCE DE INGRESOS Y EGRESOS
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-top: 15px;">
      <!-- Total Sangrado -->
      <div style="background: white; border-radius: 8px; padding: 10px; border-left: 4px solid #ef4444; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 7pt; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">SANGRADO TOTAL</div>
        <div style="font-size: 18pt; font-weight: 700; color: #dc2626;">${totals.totalBloodLoss || 0} <span style="font-size: 8pt; color: #6b7280;">ml</span></div>
      </div>

      <!-- Total Diuresis -->
      <div style="background: white; border-radius: 8px; padding: 10px; border-left: 4px solid #f59e0b; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 7pt; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">DIURESIS TOTAL</div>
        <div style="font-size: 18pt; font-weight: 700; color: #d97706;">${totals.totalUrine || 0} <span style="font-size: 8pt; color: #6b7280;">ml</span></div>
      </div>

      <!-- Pérdidas Insensibles -->
      <div style="background: white; border-radius: 8px; padding: 10px; border-left: 4px solid #fb923c; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 7pt; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">PÉRD. INSENSIBLES</div>
        <div style="font-size: 18pt; font-weight: 700; color: #ea580c;">${totals.totalInsensibleLoss || 0} <span style="font-size: 8pt; color: #6b7280;">ml</span></div>
      </div>

      <!-- Cristaloides -->
      <div style="background: white; border-radius: 8px; padding: 10px; border-left: 4px solid #10b981; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 7pt; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">CRISTALOIDES</div>
        <div style="font-size: 18pt; font-weight: 700; color: #059669;">${totals.totalCristalloids || 0} <span style="font-size: 8pt; color: #6b7280;">ml</span></div>
      </div>

      <!-- Coloides -->
      <div style="background: white; border-radius: 8px; padding: 10px; border-left: 4px solid #06b6d4; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 7pt; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">COLOIDES</div>
        <div style="font-size: 18pt; font-weight: 700; color: #0891b2;">${totals.totalColloids || 0} <span style="font-size: 8pt; color: #6b7280;">ml</span></div>
      </div>

      <!-- Albúmina -->
      <div style="background: white; border-radius: 8px; padding: 10px; border-left: 4px solid #8b5cf6; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 7pt; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">ALBÚMINA</div>
        <div style="font-size: 18pt; font-weight: 700; color: #7c3aed;">${totals.totalAlbumin || 0} <span style="font-size: 8pt; color: #6b7280;">ml</span></div>
      </div>

      ${totals.totalRBC > 0 ? `
      <!-- Glóbulos Rojos -->
      <div style="background: white; border-radius: 8px; padding: 10px; border-left: 4px solid #dc2626; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 7pt; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">GLÓBULOS ROJOS</div>
        <div style="font-size: 18pt; font-weight: 700; color: #dc2626;">${totals.totalRBC} <span style="font-size: 8pt; color: #6b7280;">U</span></div>
      </div>
      ` : ''}

      ${totals.totalPlasma > 0 ? `
      <!-- Plasma Fresco -->
      <div style="background: white; border-radius: 8px; padding: 10px; border-left: 4px solid #f59e0b; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 7pt; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">PLASMA FRESCO</div>
        <div style="font-size: 18pt; font-weight: 700; color: #f59e0b;">${totals.totalPlasma} <span style="font-size: 8pt; color: #6b7280;">U</span></div>
      </div>
      ` : ''}

      ${totals.totalPlatelets > 0 ? `
      <!-- Plaquetas -->
      <div style="background: white; border-radius: 8px; padding: 10px; border-left: 4px solid #a855f7; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 7pt; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">PLAQUETAS</div>
        <div style="font-size: 18pt; font-weight: 700; color: #a855f7;">${totals.totalPlatelets} <span style="font-size: 8pt; color: #6b7280;">U</span></div>
      </div>
      ` : ''}

      ${totals.totalCryoprecip > 0 ? `
      <!-- Crioprecipitados -->
      <div style="background: white; border-radius: 8px; padding: 10px; border-left: 4px solid #3b82f6; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 7pt; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">CRIOPRECIP.</div>
        <div style="font-size: 18pt; font-weight: 700; color: #3b82f6;">${totals.totalCryoprecip} <span style="font-size: 8pt; color: #6b7280;">ml</span></div>
      </div>
      ` : ''}

      ${totals.totalFibrinogen > 0 ? `
      <!-- Fibrinógeno -->
      <div style="background: white; border-radius: 8px; padding: 10px; border-left: 4px solid #14b8a6; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 7pt; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">FIBRINÓGENO</div>
        <div style="font-size: 18pt; font-weight: 700; color: #14b8a6;">${totals.totalFibrinogen} <span style="font-size: 8pt; color: #6b7280;">g</span></div>
      </div>
      ` : ''}

      ${totals.totalPCC > 0 ? `
      <!-- Complejo Protrombínico -->
      <div style="background: white; border-radius: 8px; padding: 10px; border-left: 4px solid #8b5cf6; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 7pt; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">COMPLEJO PROTR.</div>
        <div style="font-size: 18pt; font-weight: 700; color: #8b5cf6;">${totals.totalPCC} <span style="font-size: 8pt; color: #6b7280;">U</span></div>
      </div>
      ` : ''}

      <!-- Balance Neto -->
      <div style="background: white; border-radius: 8px; padding: 10px; border-left: 4px solid #3b82f6; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="font-size: 7pt; color: #6b7280; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">BALANCE NETO</div>
        <div style="font-size: 18pt; font-weight: 700; color: ${(totals.netBalance || 0) >= 0 ? '#059669' : '#dc2626'};">${(totals.netBalance || 0) >= 0 ? '+' : ''}${totals.netBalance || 0} <span style="font-size: 8pt; color: #6b7280;">ml</span></div>
      </div>
    </div>

    <!-- Hemoderivados Detalle -->
    <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h4 style="font-size: 10pt; font-weight: 600; color: #374151; margin-bottom: 12px;">HEMODERIVADOS ADMINISTRADOS</h4>
      <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 15px;">
        <div>
          <div style="font-size: 7.5pt; color: #6b7280; font-weight: 600; text-transform: uppercase;">Glóbulos Rojos</div>
          <div style="font-size: 16pt; font-weight: 700; color: #dc2626;">${totals.totalRBC || 0} U</div>
        </div>
        <div>
          <div style="font-size: 7.5pt; color: #6b7280; font-weight: 600; text-transform: uppercase;">Plasma Fresco</div>
          <div style="font-size: 16pt; font-weight: 700; color: #f59e0b;">${totals.totalPlasma || 0} U</div>
        </div>
        <div>
          <div style="font-size: 7.5pt; color: #6b7280; font-weight: 600; text-transform: uppercase;">Plaquetas</div>
          <div style="font-size: 16pt; font-weight: 700; color: #a855f7;">${totals.totalPlatelets || 0} U</div>
        </div>
        <div>
          <div style="font-size: 7.5pt; color: #6b7280; font-weight: 600; text-transform: uppercase;">Crioprecipitados</div>
          <div style="font-size: 16pt; font-weight: 700; color: #3b82f6;">${totals.totalCryoprecip || 0} ml</div>
        </div>
        <div>
          <div style="font-size: 7.5pt; color: #6b7280; font-weight: 600; text-transform: uppercase;">Fibrinógeno</div>
          <div style="font-size: 16pt; font-weight: 700; color: #14b8a6;">${totals.totalFibrinogen || 0} g</div>
        </div>
        <div>
          <div style="font-size: 7.5pt; color: #6b7280; font-weight: 600; text-transform: uppercase;">Complejo Protromb.</div>
          <div style="font-size: 16pt; font-weight: 700; color: #8b5cf6;">${totals.totalPCC || 0} U</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Eventos y Tiempos -->
  <div class="patient-section">
    <div class="section-title">
      <span class="section-title-icon"></span>
      EVENTOS Y TIEMPOS
    </div>

    <div class="info-grid">
      ${caseData.duration ? `
      <div class="info-item">
        <div class="info-label">Duración Total (min)</div>
        <div class="info-value" style="font-size: 11pt; font-weight: 700; color: #2563eb;">${caseData.duration}</div>
      </div>
      ` : ''}
      ${caseData.coldIschemiaTime ? `
      <div class="info-item">
        <div class="info-label">Tiempo Isquemia Fría (min)</div>
        <div class="info-value" style="font-size: 11pt; font-weight: 700; color: #0891b2;">${caseData.coldIschemiaTime}</div>
      </div>
      ` : ''}
      ${caseData.warmIschemiaTime ? `
      <div class="info-item">
        <div class="info-label">Tiempo Isquemia Caliente (min)</div>
        <div class="info-value" style="font-size: 11pt; font-weight: 700; color: #dc2626;">${caseData.warmIschemiaTime}</div>
      </div>
      ` : ''}
    </div>

    ${caseData.observations ? `
    <div style="margin-top: 15px; padding: 15px; background: linear-gradient(to right, #fef3c7, #fef9c3); border-left: 4px solid #f59e0b; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <h4 style="font-size: 9pt; font-weight: 700; color: #92400e; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.3px;">📌 EVENTOS INTRAOPERATORIOS DESTACADOS:</h4>
      <div style="font-size: 9.5pt; color: #78350f; line-height: 1.5; white-space: pre-wrap; font-weight: 500;">${caseData.observations}</div>
    </div>
    ` : ''}
  </div>

  <!-- Condiciones de Traslado a CTI -->
  ${postop ? `
  <div class="patient-section" style="background: linear-gradient(to right, #fef3c7, #fef9c3);">
    <div class="section-title">
      <span class="section-title-icon"></span>
      CONDICIONES DE TRASLADO A CTI
    </div>

    <div class="info-grid">
      ${postop.airway ? `
      <div class="info-item">
        <div class="info-label">Vía Aérea</div>
        <div class="info-value" style="font-weight: 600; color: #374151;">${postop.airway}</div>
      </div>
      ` : ''}
      ${postop.ventilationMode ? `
      <div class="info-item">
        <div class="info-label">Ventilación</div>
        <div class="info-value" style="font-weight: 600; color: #374151;">${postop.ventilationMode}</div>
      </div>
      ` : ''}
      ${postop.hemodynamicStatus ? `
      <div class="info-item">
        <div class="info-label">Hemodinámica</div>
        <div class="info-value" style="font-weight: 600; color: ${postop.hemodynamicStatus.includes('ESTABLE') ? '#059669' : '#dc2626'};">${postop.hemodynamicStatus}</div>
      </div>
      ` : ''}
      ${postop.metabolicStatus ? `
      <div class="info-item">
        <div class="info-label">Metabólico</div>
        <div class="info-value" style="font-weight: 600; color: ${postop.metabolicStatus.includes('ESTABLE') ? '#059669' : '#d97706'};">${postop.metabolicStatus}</div>
      </div>
      ` : ''}
      ${postop.transferDateTime ? `
      <div class="info-item">
        <div class="info-label">Fecha/Hora Traslado a CTI</div>
        <div class="info-value" style="font-weight: 600; color: #374151;">${formatDate(postop.transferDateTime, 'dd/MM/yyyy HH:mm:ss')}</div>
      </div>
      ` : ''}
    </div>

    ${postop.complications ? `
    <div style="margin-top: 15px; padding: 15px; background: white; border-left: 4px solid #ef4444; border-radius: 4px;">
      <h4 style="font-size: 9pt; font-weight: 600; color: #991b1b; text-transform: uppercase; margin-bottom: 6px;">Observaciones del Traslado:</h4>
      <div style="font-size: 9.5pt; color: #7f1d1d; white-space: pre-wrap;">${postop.complications}</div>
    </div>
    ` : ''}
  </div>
  ` : ''}

  <!-- Gráficas de Tendencias Temporales -->
  <div class="charts-section">
    <div class="chart-page">
      <div class="chart-container">
        <h2 class="chart-title">📊 TENDENCIAS TEMPORALES - VARIABLES HEMODINÁMICAS</h2>
        <canvas id="hemodynamicChart" class="chart-canvas"></canvas>
      </div>
    </div>

    <div class="chart-page">
      <div class="chart-container">
        <h2 class="chart-title">🩸 TENDENCIAS TEMPORALES - BALANCE DE FLUIDOS</h2>
        <canvas id="fluidBalanceChart" class="chart-canvas"></canvas>
      </div>
    </div>

    <div class="chart-page">
      <div class="chart-container">
        <h2 class="chart-title">🧪 TENDENCIAS TEMPORALES - PARÁMETROS DE LABORATORIO</h2>
        <canvas id="labChart" class="chart-canvas"></canvas>
      </div>
    </div>
  </div>

  <script>
    // Esperar a que Chart.js esté completamente cargado
    window.addEventListener('load', function() {
      // Marcar que las gráficas están listas (para Puppeteer)
      window.chartsReady = false;

      // Datos de las gráficas
      const chartData = ${JSON.stringify(chartData)};

      // Colores por fase
    const phaseColors = {
      'ESTADO_BASAL': 'rgba(148, 163, 184, 0.15)',
      'INDUCCION': 'rgba(96, 165, 250, 0.15)',
      'DISECCION': 'rgba(52, 211, 153, 0.15)',
      'ANHEPATICA': 'rgba(251, 191, 36, 0.15)',
      'PRE_REPERFUSION': 'rgba(249, 115, 22, 0.15)',
      'POST_REPERFUSION': 'rgba(236, 72, 153, 0.15)',
      'VIA_BILIAR': 'rgba(167, 139, 250, 0.15)',
      'CIERRE': 'rgba(99, 102, 241, 0.15)',
      'SALIDA_BQ': 'rgba(139, 92, 246, 0.15)'
    };

    // Nombres de fases para etiquetas
    const phaseLabels = {
      'ESTADO_BASAL': 'Basal',
      'INDUCCION': 'Inducción',
      'DISECCION': 'Disección',
      'ANHEPATICA': 'Anhepática',
      'PRE_REPERFUSION': 'Pre-Reperfusión',
      'POST_REPERFUSION': 'Post-Reperfusión',
      'VIA_BILIAR': 'Vía Biliar',
      'CIERRE': 'Cierre',
      'SALIDA_BQ': 'Salida BQ'
    };

    // Plugin para dibujar bandas de colores de fondo por fase con etiquetas
    const phaseBackgroundPlugin = {
      id: 'phaseBackground',
      beforeDraw: (chart, args, options) => {
        const { ctx, chartArea: { left, right, top, bottom }, scales: { x } } = chart;
        const phases = options.phases || [];

        if (phases.length === 0) return;

        ctx.save();

        // Identificar segmentos de fases
        const phaseSegments = [];
        let currentPhase = phases[0];
        let phaseStartIndex = 0;

        for (let i = 1; i <= phases.length; i++) {
          if (i === phases.length || phases[i] !== currentPhase) {
            phaseSegments.push({
              phase: currentPhase,
              startIndex: phaseStartIndex,
              endIndex: i - 1
            });

            if (i < phases.length) {
              currentPhase = phases[i];
              phaseStartIndex = i;
            }
          }
        }

        // Dibujar bandas y etiquetas
        phaseSegments.forEach((segment, idx) => {
          // Calcular inicio y fin de la banda
          // La banda va desde el punto actual hasta el punto siguiente (o el final del gráfico)
          const startX = idx === 0 ? left : x.getPixelForValue(segment.startIndex);
          const endX = idx === phaseSegments.length - 1
            ? right
            : x.getPixelForValue(phaseSegments[idx + 1].startIndex);
          const width = endX - startX;

          // Dibujar banda de color
          ctx.fillStyle = phaseColors[segment.phase] || 'rgba(200, 200, 200, 0.1)';
          ctx.fillRect(startX, top, width, bottom - top);

          // Dibujar etiqueta en la parte superior
          if (width > 40) { // Solo dibujar etiqueta si hay espacio suficiente
            const centerX = startX + width / 2;

            ctx.fillStyle = '#374151';
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            const label = phaseLabels[segment.phase] || segment.phase;
            ctx.fillText(label, centerX, top - 20);
          }
        });

        ctx.restore();
      }
    };

    // Registrar el plugin
    Chart.register(phaseBackgroundPlugin);

    // Configuración común para todas las gráficas
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 30, // Espacio para las etiquetas de fase
          bottom: 10
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            font: { size: 10 },
            padding: 12
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          titleFont: { size: 11 },
          bodyFont: { size: 10 }
        }
      },
      scales: {
        x: {
          ticks: { font: { size: 9 } },
          grid: { display: false }
        },
        y: {
          ticks: { font: { size: 9 } },
          grid: { color: 'rgba(0, 0, 0, 0.05)' }
        }
      }
    };

    // Gráfica 1: Variables Hemodinámicas
    if (chartData.hemodynamicData.labels.length > 0) {
      const ctx1 = document.getElementById('hemodynamicChart').getContext('2d');
      new Chart(ctx1, {
        type: 'line',
        data: {
          labels: chartData.hemodynamicData.labels,
          datasets: [
            {
              label: 'FC (lpm)',
              data: chartData.hemodynamicData.heartRate,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 3,
              yAxisID: 'y'
            },
            {
              label: 'PAM (mmHg)',
              data: chartData.hemodynamicData.map,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 3,
              yAxisID: 'y'
            },
            {
              label: 'PVC (mmHg)',
              data: chartData.hemodynamicData.cvp,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 3,
              yAxisID: 'y'
            },
            {
              label: 'SatO₂ (%)',
              data: chartData.hemodynamicData.satO2,
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 3,
              yAxisID: 'y1'
            },
            {
              label: 'Temp (°C)',
              data: chartData.hemodynamicData.temp,
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 3,
              yAxisID: 'y2'
            }
          ]
        },
        options: {
          ...commonOptions,
          plugins: {
            ...commonOptions.plugins,
            phaseBackground: {
              phases: chartData.hemodynamicData.phases
            }
          },
          scales: {
            x: commonOptions.scales.x,
            y: {
              ...commonOptions.scales.y,
              type: 'linear',
              display: true,
              position: 'left',
              title: { display: true, text: 'FC / PAM / PVC', font: { size: 9 } }
            },
            y1: {
              ...commonOptions.scales.y,
              type: 'linear',
              display: true,
              position: 'right',
              min: 80,
              max: 100,
              title: { display: true, text: 'SatO₂ (%)', font: { size: 9 } },
              grid: { drawOnChartArea: false }
            },
            y2: {
              ...commonOptions.scales.y,
              type: 'linear',
              display: false,
              position: 'right',
              min: 30,
              max: 40
            }
          }
        }
      });
    }

    // Gráfica 2: Balance de Fluidos
    if (chartData.fluidBalanceData.labels.length > 0) {
      const ctx2 = document.getElementById('fluidBalanceChart').getContext('2d');
      new Chart(ctx2, {
        type: 'line',
        data: {
          labels: chartData.fluidBalanceData.labels,
          datasets: [
            {
              label: 'Sangrado (ml)',
              data: chartData.fluidBalanceData.bloodLoss,
              borderColor: '#dc2626',
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 3,
              fill: true
            },
            {
              label: 'Diuresis (ml)',
              data: chartData.fluidBalanceData.urine,
              borderColor: '#fbbf24',
              backgroundColor: 'rgba(251, 191, 36, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 3,
              fill: true
            },
            {
              label: 'Cristaloides (ml)',
              data: chartData.fluidBalanceData.crystalloids,
              borderColor: '#06b6d4',
              backgroundColor: 'rgba(6, 182, 212, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 3,
              fill: true
            },
            {
              label: 'Coloides (ml)',
              data: chartData.fluidBalanceData.colloids,
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 3,
              fill: true
            },
            {
              label: 'GR (ml)',
              data: chartData.fluidBalanceData.rbc,
              borderColor: '#be123c',
              backgroundColor: 'rgba(190, 18, 60, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 3,
              fill: true
            }
          ]
        },
        options: {
          ...commonOptions,
          plugins: {
            ...commonOptions.plugins,
            phaseBackground: {
              phases: chartData.fluidBalanceData.phases
            }
          },
          scales: {
            ...commonOptions.scales,
            y: {
              ...commonOptions.scales.y,
              title: { display: true, text: 'Volumen (ml)', font: { size: 9 } },
              beginAtZero: true
            }
          }
        }
      });
    }

    // Gráfica 3: Parámetros de Laboratorio
    if (chartData.labData.labels.length > 0) {
      const ctx3 = document.getElementById('labChart').getContext('2d');
      new Chart(ctx3, {
        type: 'line',
        data: {
          labels: chartData.labData.labels,
          datasets: [
            {
              label: 'Hb (g/dL)',
              data: chartData.labData.hb,
              borderColor: '#dc2626',
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 3,
              yAxisID: 'y'
            },
            {
              label: 'Lactato (mmol/L)',
              data: chartData.labData.lactate,
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 3,
              yAxisID: 'y1'
            },
            {
              label: 'Glucosa (mg/dL)',
              data: chartData.labData.glucose,
              borderColor: '#a855f7',
              backgroundColor: 'rgba(168, 85, 247, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 3,
              yAxisID: 'y8'
            },
            {
              label: 'pH',
              data: chartData.labData.pH,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 3,
              yAxisID: 'y2'
            },
            {
              label: 'PaFI',
              data: chartData.labData.pafi,
              borderColor: '#06b6d4',
              backgroundColor: 'rgba(6, 182, 212, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 3,
              yAxisID: 'y3'
            },
            {
              label: 'BE (mEq/L)',
              data: chartData.labData.be,
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 3,
              yAxisID: 'y4'
            },
            {
              label: 'Na (mEq/L)',
              data: chartData.labData.na,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 3,
              yAxisID: 'y5'
            },
            {
              label: 'K (mEq/L)',
              data: chartData.labData.k,
              borderColor: '#ec4899',
              backgroundColor: 'rgba(236, 72, 153, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 3,
              yAxisID: 'y6'
            },
            {
              label: 'Ca (mg/dL)',
              data: chartData.labData.ca,
              borderColor: '#84cc16',
              backgroundColor: 'rgba(132, 204, 22, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 3,
              yAxisID: 'y7'
            }
          ]
        },
        options: {
          ...commonOptions,
          plugins: {
            ...commonOptions.plugins,
            phaseBackground: {
              phases: chartData.labData.phases
            }
          },
          scales: {
            x: commonOptions.scales.x,
            y: {
              ...commonOptions.scales.y,
              type: 'linear',
              display: true,
              position: 'left',
              title: { display: true, text: 'Hb (g/dL)', font: { size: 8 } }
            },
            y1: {
              ...commonOptions.scales.y,
              type: 'linear',
              display: true,
              position: 'right',
              title: { display: true, text: 'Lactato', font: { size: 8 } },
              grid: { drawOnChartArea: false }
            },
            y2: {
              ...commonOptions.scales.y,
              type: 'linear',
              display: false,
              position: 'right',
              min: 7.0,
              max: 7.6
            },
            y3: {
              ...commonOptions.scales.y,
              type: 'linear',
              display: false,
              position: 'right',
              min: 0,
              max: 600
            },
            y4: {
              ...commonOptions.scales.y,
              type: 'linear',
              display: false,
              position: 'right',
              min: -15,
              max: 10
            },
            y5: {
              ...commonOptions.scales.y,
              type: 'linear',
              display: false,
              position: 'right',
              min: 125,
              max: 155
            },
            y6: {
              ...commonOptions.scales.y,
              type: 'linear',
              display: false,
              position: 'right',
              min: 2.5,
              max: 6.5
            },
            y7: {
              ...commonOptions.scales.y,
              type: 'linear',
              display: false,
              position: 'right',
              min: 6,
              max: 12
            },
            y8: {
              ...commonOptions.scales.y,
              type: 'linear',
              display: false,
              position: 'right',
              min: 50,
              max: 400
            }
          }
        }
      });
    }

      // Marcar que las gráficas están completamente renderizadas
      setTimeout(() => {
        window.chartsReady = true;
        console.log('Charts are ready');
      }, 1000);
    });
  </script>

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
  const browser = await launchBrowser();

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  // Esperar a que las gráficas estén completamente renderizadas
  await page.waitForFunction(() => window.chartsReady === true, { timeout: 10000 });

  // Esperar un poco más para asegurar que todo esté pintado
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));

  const pdfBuffer = await page.pdf({
    format: 'A4',
    landscape: true,
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>', // Header vacío
    footerTemplate: `
      <div style="font-size: 8px; color: #6b7280; text-align: right; width: 100%; padding-right: 15mm;">
        Página <span class="pageNumber"></span> de <span class="totalPages"></span>
      </div>
    `,
    margin: {
      top: '12mm',
      right: '15mm',
      bottom: '15mm', // Aumentado para dejar espacio al footer
      left: '15mm',
    },
  });

  await browser.close();

  return pdfBuffer;
}

/**
 * Obtener datos completos de evaluación preoperatoria para PDF
 */
async function getPreopDataForPDF(preopId) {
  const preop = await prisma.preopEvaluation.findUnique({
    where: { id: preopId },
    include: {
      patient: true,
      clinician: true,
      case: true, // Incluir caso de trasplante si existe
      labs: {
        orderBy: { labDate: 'desc' },
      },
      etiologies: {
        include: {
          etiology: true, // Incluir datos de la etiología
        },
        orderBy: { order: 'asc' },
      },
      attachments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!preop) {
    throw new NotFoundError('Evaluación preoperatoria no encontrada');
  }

  return preop;
}

/**
 * Generar HTML para PDF de evaluación preoperatoria
 */
function generatePreopHTML(preop) {
  const { patient, clinician, labs, attachments, etiologies } = preop;
  const transplantCase = preop.case; // 'case' es palabra reservada

  // Cargar logo
  const logoBase64 = getLogoBase64();

  // Calcular edad
  const calculateAge = (birthDate) => {
    if (!birthDate) return '-';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Calcular IMC
  const calculateBMI = (weight, height) => {
    if (!weight || !height) return null;
    const heightM = height / 100;
    return (weight / (heightM * heightM)).toFixed(1);
  };

  const bmi = calculateBMI(patient.weight, patient.height);

  // Comorbilidades cardiovasculares
  const cardioComorbidities = [];
  if (preop.coronaryDisease) cardioComorbidities.push('Enfermedad coronaria');
  if (preop.hypertension) cardioComorbidities.push('Hipertensión arterial');
  if (preop.valvulopathy) cardioComorbidities.push(`Valvulopatía: ${preop.valvulopathy}`);
  if (preop.arrhythmia) cardioComorbidities.push('Arritmia');
  if (preop.dilatedCardio) cardioComorbidities.push('Cardiopatía dilatada');
  if (preop.hypertensiveCardio) cardioComorbidities.push('Cardiopatía hipertensiva');

  // Comorbilidades respiratorias
  const respComorbidities = [];
  if (preop.smokerCOPD) respComorbidities.push('Tabaquismo/EPOC');
  if (preop.asthma) respComorbidities.push('Asma');

  // Otras comorbilidades
  const otherComorbidities = [];
  if (preop.renalFailure) otherComorbidities.push('Insuficiencia renal');
  if (preop.singleKidney) otherComorbidities.push('Riñón único');
  if (preop.diabetes) otherComorbidities.push('Diabetes');
  if (preop.thyroidDysfunction) otherComorbidities.push('Disfunción tiroidea');
  if (preop.previousAbdSurgery) otherComorbidities.push('Cirugía abdominal previa');
  if (preop.refluxUlcer) otherComorbidities.push('Reflujo/Úlcera');
  if (preop.pregnancy) otherComorbidities.push('Embarazo/Puerperio');

  // Complicaciones de la cirrosis
  const cirrhosisComplications = [];
  if (preop.hepatoRenalSyndrome) cirrhosisComplications.push('Síndrome hepatorrenal');
  if (preop.hepatoPulmonarySyndr) cirrhosisComplications.push('Síndrome hepatopulmonar');
  if (preop.pulmonaryHypertension) cirrhosisComplications.push('Hipertensión pulmonar');
  if (preop.portalHypertension) cirrhosisComplications.push('Hipertensión portal');
  if (preop.ascites) cirrhosisComplications.push('Ascitis');
  if (preop.hydrothorax) cirrhosisComplications.push('Hidrotórax');
  if (preop.sbe) cirrhosisComplications.push('PBE');
  if (preop.portalThrombosis) cirrhosisComplications.push('Trombosis portal');
  if (preop.esophagealVarices) cirrhosisComplications.push('Várices esofágicas');
  if (preop.encephalopathy) cirrhosisComplications.push('Encefalopatía');
  if (preop.hepatocarcinoma) cirrhosisComplications.push('Hepatocarcinoma');
  if (preop.bleeding) cirrhosisComplications.push('Sangrado');
  if (preop.hyponatremia) cirrhosisComplications.push('Hiponatremia');

  // Obtener el último laboratorio
  const lastLab = labs && labs.length > 0 ? labs[0] : null;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Evaluación Pretrasplante - ${patient.name}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
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
      padding: 12mm 15mm 15mm 15mm;
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%);
      color: white;
      padding: 20px 25px;
      border-radius: 8px;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-left h1 {
      font-size: 18pt;
      font-weight: 700;
      margin-bottom: 5px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .header-left .subtitle {
      font-size: 10pt;
      opacity: 0.95;
      font-weight: 300;
    }

    .header-right {
      text-align: right;
    }

    .header-right .patient-name {
      font-size: 14pt;
      font-weight: 600;
      margin-bottom: 3px;
    }

    .header-right .patient-info {
      font-size: 9pt;
      opacity: 0.9;
    }

    /* Dashboard de Resumen */
    .dashboard {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 15px;
    }

    .metric-card {
      background: white;
      border-radius: 6px;
      padding: 12px;
      border-left: 4px solid #8b5cf6;
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

    .metric-card.info {
      border-left-color: #3b82f6;
    }

    .metric-label {
      font-size: 7.5pt;
      color: #6b7280;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }

    .metric-value {
      font-size: 16pt;
      font-weight: 700;
      color: #111827;
      line-height: 1;
    }

    .metric-unit {
      font-size: 8pt;
      color: #6b7280;
      font-weight: 400;
    }

    /* Secciones */
    .section {
      background: white;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .section-title {
      font-size: 10pt;
      font-weight: 700;
      color: #7c3aed;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 2px solid #e5e7eb;
      display: flex;
      align-items: center;
    }

    .section-title-icon {
      width: 16px;
      height: 16px;
      background: #7c3aed;
      border-radius: 4px;
      display: inline-block;
      margin-right: 8px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px 15px;
    }

    .info-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px 15px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
    }

    .info-label {
      font-size: 7pt;
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

    /* Badges */
    .badge-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    .badge {
      background: #f3f4f6;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 7.5pt;
      font-weight: 500;
    }

    .badge.present {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fcd34d;
    }

    .badge.absent {
      background: #ecfdf5;
      color: #065f46;
    }

    .badge.danger {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }

    .badge.info {
      background: #dbeafe;
      color: #1e40af;
    }

    /* Tabla de laboratorios */
    .lab-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8pt;
      margin-top: 10px;
    }

    .lab-table th {
      background: #f9fafb;
      padding: 6px 8px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
      font-size: 7pt;
      text-transform: uppercase;
    }

    .lab-table td {
      padding: 5px 8px;
      border-bottom: 1px solid #f3f4f6;
    }

    .lab-table tr:hover {
      background: #f9fafb;
    }

    /* Estado en lista */
    .list-status {
      padding: 15px;
      border-radius: 8px;
      margin-top: 12px;
    }

    .list-status.in-list {
      background: linear-gradient(to right, #dcfce7, #d1fae5);
      border-left: 4px solid #10b981;
    }

    .list-status.not-in-list {
      background: linear-gradient(to right, #fef3c7, #fef9c3);
      border-left: 4px solid #f59e0b;
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

    /* Observaciones */
    .observations-box {
      background: #f9fafb;
      border-radius: 6px;
      padding: 12px;
      margin-top: 10px;
      border-left: 3px solid #8b5cf6;
    }

    .observations-title {
      font-size: 8pt;
      font-weight: 600;
      color: #6b7280;
      margin-bottom: 6px;
      text-transform: uppercase;
    }

    .observations-text {
      font-size: 9pt;
      color: #374151;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    /* Página 2 */
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      ${logoBase64 ? `<img src="${logoBase64}" alt="Logo TxH" style="height: 45px; margin-bottom: 8px;">` : ''}
      <h1>Evaluación Pretrasplante</h1>
      <div class="subtitle">Programa Nacional de Trasplante Hepático</div>
    </div>
    <div class="header-right">
      <div class="patient-name">${patient.name}</div>
      <div class="patient-info">CI: ${formatCI(patient.id)} • ${patient.sex === 'M' ? 'Masculino' : patient.sex === 'F' ? 'Femenino' : '-'} • ${calculateAge(patient.birthDate)} años</div>
      <div class="patient-info" style="margin-top: 3px;">Evaluación: ${formatDate(preop.evaluationDate, 'dd/MM/yyyy')}</div>
      <div class="patient-info" style="margin-top: 3px;"><strong>Anestesiólogo:</strong> ${clinician ? clinician.name : '-'}</div>
    </div>
  </div>

  <!-- Dashboard de Scores -->
  <div class="dashboard">
    <div class="metric-card ${preop.meld >= 25 ? 'danger' : preop.meld >= 15 ? 'warning' : ''}">
      <div class="metric-label">MELD</div>
      <div class="metric-value">${preop.meld || '-'}</div>
    </div>
    <div class="metric-card ${preop.meldNa >= 25 ? 'danger' : preop.meldNa >= 15 ? 'warning' : ''}">
      <div class="metric-label">MELD-Na</div>
      <div class="metric-value">${preop.meldNa || '-'}</div>
    </div>
    <div class="metric-card ${preop.child === 'C' ? 'danger' : preop.child === 'B' ? 'warning' : 'success'}">
      <div class="metric-label">Child-Pugh</div>
      <div class="metric-value">${preop.child || '-'}</div>
    </div>
    <div class="metric-card info">
      <div class="metric-label">Clase Funcional</div>
      <div class="metric-value" style="font-size: 14pt;">${preop.functionalClass || '-'}</div>
    </div>
  </div>

  <!-- Datos del Paciente -->
  <div class="section">
    <div class="section-title">
      <span class="section-title-icon"></span>
      DATOS DEL PACIENTE
    </div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">CI</div>
        <div class="info-value">${formatCI(patient.id)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Nombre</div>
        <div class="info-value">${patient.name}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Fecha Nacimiento</div>
        <div class="info-value">${formatDate(patient.birthDate, 'dd/MM/yyyy')}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Edad</div>
        <div class="info-value">${calculateAge(patient.birthDate)} años</div>
      </div>
      <div class="info-item">
        <div class="info-label">Sexo</div>
        <div class="info-value">${patient.sex === 'M' ? 'Masculino' : patient.sex === 'F' ? 'Femenino' : '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Grupo Sanguíneo</div>
        <div class="info-value" style="font-weight: 700; color: #dc2626;">${patient.bloodGroup || '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Peso / Talla</div>
        <div class="info-value">${patient.weight || '-'} kg / ${patient.height || '-'} cm</div>
      </div>
      <div class="info-item">
        <div class="info-label">IMC</div>
        <div class="info-value">${bmi || '-'} kg/m²</div>
      </div>
      <div class="info-item">
        <div class="info-label">Prestador</div>
        <div class="info-value">${patient.provider || '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">ASA</div>
        <div class="info-value" style="font-weight: 700;">${patient.asa || '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Anestesiólogo Evaluador</div>
        <div class="info-value">${clinician ? clinician.name : '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Fecha Evaluación</div>
        <div class="info-value">${formatDate(preop.evaluationDate, 'dd/MM/yyyy')}</div>
      </div>
    </div>
  </div>

  <!-- Caso de Trasplante Vinculado -->
  ${transplantCase ? `
  <div class="section" style="background: linear-gradient(to right, #dbeafe, #e0e7ff);">
    <div class="section-title" style="color: #1e40af;">
      <span class="section-title-icon" style="background: #3b82f6;"></span>
      CASO DE TRASPLANTE VINCULADO
    </div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">ID Caso</div>
        <div class="info-value" style="font-weight: 600;">#${transplantCase.id}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Fecha del Trasplante</div>
        <div class="info-value">${formatDate(transplantCase.startAt, 'dd/MM/yyyy')}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Duración</div>
        <div class="info-value">${transplantCase.duration ? formatDuration(transplantCase.duration) : '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Estado</div>
        <div class="info-value" style="font-weight: 600; color: #059669;">TRASPLANTADO</div>
      </div>
    </div>
  </div>
  ` : ''}

  <!-- Etiología -->
  <div class="section">
    <div class="section-title">
      <span class="section-title-icon"></span>
      ETIOLOGÍA DE LA HEPATOPATÍA
    </div>
    <div class="info-grid-3">
      <div class="info-item">
        <div class="info-label">Etiología Principal</div>
        <div class="info-value" style="font-weight: 600;">${preop.etiology1 || '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Etiología Secundaria</div>
        <div class="info-value">${preop.etiology2 || '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Falla Hepática Fulminante</div>
        <div class="info-value" style="font-weight: 700; color: ${preop.isFulminant ? '#dc2626' : '#10b981'};">${preop.isFulminant ? 'SÍ' : 'NO'}</div>
      </div>
    </div>
    ${etiologies && etiologies.length > 0 ? `
    <div style="margin-top: 10px;">
      <div style="font-size: 8pt; font-weight: 600; color: #374151; margin-bottom: 6px; text-transform: uppercase;">Etiologías Registradas (Catálogo)</div>
      <div class="badge-grid">
        ${etiologies.map(e => `<span class="badge ${e.isPrimary ? 'present' : 'info'}">${e.isPrimary ? '★ ' : ''}${e.etiology?.name || 'Sin nombre'}</span>`).join('')}
      </div>
    </div>
    ` : ''}
  </div>

  <!-- Examen Físico -->
  <div class="section">
    <div class="section-title">
      <span class="section-title-icon"></span>
      EXAMEN FÍSICO - VÍA AÉREA
    </div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Mallampati</div>
        <div class="info-value" style="font-weight: 600;">${preop.mpt || '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Apertura Bucal</div>
        <div class="info-value">${preop.mouthOpening || '-'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Ventilación Mecánica</div>
        <div class="info-value" style="font-weight: 700; color: ${preop.mechanicalVent ? '#dc2626' : '#10b981'};">${preop.mechanicalVent ? 'SÍ' : 'NO'}</div>
      </div>
    </div>
    ${preop.physicalExamObs ? `
    <div class="observations-box">
      <div class="observations-title">Observaciones del Examen Físico</div>
      <div class="observations-text">${preop.physicalExamObs}</div>
    </div>
    ` : ''}
  </div>

  <!-- Comorbilidades -->
  <div class="section">
    <div class="section-title">
      <span class="section-title-icon"></span>
      COMORBILIDADES
    </div>

    <div style="margin-bottom: 12px;">
      <div style="font-size: 8pt; font-weight: 600; color: #374151; margin-bottom: 6px; text-transform: uppercase;">Cardiovasculares</div>
      <div class="badge-grid">
        ${cardioComorbidities.length > 0 ?
          cardioComorbidities.map(c => `<span class="badge present">${c}</span>`).join('') :
          '<span class="badge absent">Sin comorbilidades cardiovasculares</span>'
        }
      </div>
    </div>

    <div style="margin-bottom: 12px;">
      <div style="font-size: 8pt; font-weight: 600; color: #374151; margin-bottom: 6px; text-transform: uppercase;">Respiratorias</div>
      <div class="badge-grid">
        ${respComorbidities.length > 0 ?
          respComorbidities.map(c => `<span class="badge present">${c}</span>`).join('') :
          '<span class="badge absent">Sin comorbilidades respiratorias</span>'
        }
      </div>
    </div>

    <div>
      <div style="font-size: 8pt; font-weight: 600; color: #374151; margin-bottom: 6px; text-transform: uppercase;">Otras Comorbilidades</div>
      <div class="badge-grid">
        ${otherComorbidities.length > 0 ?
          otherComorbidities.map(c => `<span class="badge present">${c}</span>`).join('') :
          '<span class="badge absent">Sin otras comorbilidades</span>'
        }
      </div>
    </div>

    ${preop.allergies ? `
    <div class="observations-box" style="background: #fee2e2; border-left-color: #ef4444;">
      <div class="observations-title" style="color: #991b1b;">⚠️ Alergias</div>
      <div class="observations-text" style="color: #991b1b;">${preop.allergies}</div>
    </div>
    ` : ''}

    ${preop.abdSurgeryDetail ? `
    <div class="observations-box">
      <div class="observations-title">Detalle Cirugía Abdominal Previa</div>
      <div class="observations-text">${preop.abdSurgeryDetail}</div>
    </div>
    ` : ''}

    ${preop.comorbiditiesObs ? `
    <div class="observations-box">
      <div class="observations-title">Observaciones Comorbilidades</div>
      <div class="observations-text">${preop.comorbiditiesObs}</div>
    </div>
    ` : ''}
  </div>

  <!-- Complicaciones de la Cirrosis -->
  <div class="section">
    <div class="section-title">
      <span class="section-title-icon"></span>
      COMPLICACIONES DE LA CIRROSIS
    </div>
    <div class="badge-grid">
      ${cirrhosisComplications.length > 0 ?
        cirrhosisComplications.map(c => `<span class="badge danger">${c}</span>`).join('') :
        '<span class="badge absent">Sin complicaciones documentadas</span>'
      }
    </div>
    ${preop.complicationsObs ? `
    <div class="observations-box">
      <div class="observations-title">Observaciones</div>
      <div class="observations-text">${preop.complicationsObs}</div>
    </div>
    ` : ''}
  </div>

  <!-- Medicación Habitual -->
  ${preop.habitualMeds ? `
  <div class="section">
    <div class="section-title">
      <span class="section-title-icon"></span>
      MEDICACIÓN HABITUAL
    </div>
    <div class="observations-text" style="padding: 10px; background: #f9fafb; border-radius: 6px;">${preop.habitualMeds}</div>
  </div>
  ` : ''}

  <!-- Laboratorios -->
  ${lastLab ? `
  <div class="section">
    <div class="section-title">
      <span class="section-title-icon"></span>
      LABORATORIOS (${formatDate(lastLab.labDate, 'dd/MM/yyyy')})
    </div>
    <table class="lab-table">
      <thead>
        <tr>
          <th colspan="2" style="background: #fef3c7; color: #92400e;">Hematología</th>
          <th colspan="2" style="background: #dbeafe; color: #1e40af;">Coagulación</th>
          <th colspan="2" style="background: #dcfce7; color: #166534;">Bioquímica</th>
          <th colspan="2" style="background: #fce7f3; color: #9d174d;">Función Hepática</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Hb</strong></td>
          <td>${lastLab.hb ? lastLab.hb.toFixed(1) + ' g/dL' : '-'}</td>
          <td><strong>TP</strong></td>
          <td>${lastLab.pt ? lastLab.pt.toFixed(1) + ' seg' : '-'}</td>
          <td><strong>Glucosa</strong></td>
          <td>${lastLab.glucose ? lastLab.glucose.toFixed(0) + ' mg/dL' : '-'}</td>
          <td><strong>TGO/AST</strong></td>
          <td>${lastLab.sgot ? lastLab.sgot.toFixed(0) + ' U/L' : '-'}</td>
        </tr>
        <tr>
          <td><strong>Hto</strong></td>
          <td>${lastLab.hto ? lastLab.hto.toFixed(1) + ' %' : '-'}</td>
          <td><strong>INR</strong></td>
          <td style="font-weight: 700; color: ${lastLab.inr > 2 ? '#dc2626' : '#374151'};">${lastLab.inr ? lastLab.inr.toFixed(2) : '-'}</td>
          <td><strong>Na+</strong></td>
          <td style="font-weight: ${lastLab.sodium && lastLab.sodium < 130 ? '700; color: #dc2626' : '500'};">${lastLab.sodium ? lastLab.sodium.toFixed(0) + ' mEq/L' : '-'}</td>
          <td><strong>TGP/ALT</strong></td>
          <td>${lastLab.sgpt ? lastLab.sgpt.toFixed(0) + ' U/L' : '-'}</td>
        </tr>
        <tr>
          <td><strong>Plaquetas</strong></td>
          <td style="font-weight: ${lastLab.platelets && lastLab.platelets < 100 ? '700; color: #dc2626' : '500'};">${lastLab.platelets ? lastLab.platelets.toFixed(0) + ' x10³/µL' : '-'}</td>
          <td><strong>Fibrinógeno</strong></td>
          <td>${lastLab.fibrinogen ? lastLab.fibrinogen.toFixed(0) + ' mg/dL' : '-'}</td>
          <td><strong>K+</strong></td>
          <td>${lastLab.potassium ? lastLab.potassium.toFixed(1) + ' mEq/L' : '-'}</td>
          <td><strong>Bilirrubina T</strong></td>
          <td style="font-weight: ${lastLab.totalBili && lastLab.totalBili > 3 ? '700; color: #dc2626' : '500'};">${lastLab.totalBili ? lastLab.totalBili.toFixed(1) + ' mg/dL' : '-'}</td>
        </tr>
        <tr>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td><strong>Creatinina</strong></td>
          <td style="font-weight: ${lastLab.creatinine && lastLab.creatinine > 1.5 ? '700; color: #dc2626' : '500'};">${lastLab.creatinine ? lastLab.creatinine.toFixed(2) + ' mg/dL' : '-'}</td>
          <td><strong>Albúmina</strong></td>
          <td style="font-weight: ${lastLab.albumin && lastLab.albumin < 3 ? '700; color: #dc2626' : '500'};">${lastLab.albumin ? lastLab.albumin.toFixed(1) + ' g/dL' : '-'}</td>
        </tr>
        <tr>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td><strong>Ca++ iónico</strong></td>
          <td>${lastLab.ionicCalcium ? lastLab.ionicCalcium.toFixed(2) + ' mmol/L' : '-'}</td>
          <td><strong>TSH</strong></td>
          <td>${lastLab.tsh ? lastLab.tsh.toFixed(2) + ' µUI/mL' : '-'}</td>
        </tr>
        <tr>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td><strong>IFG</strong></td>
          <td>${lastLab.gfr ? lastLab.gfr.toFixed(0) + ' mL/min' : '-'}</td>
          <td></td>
          <td></td>
        </tr>
      </tbody>
    </table>
  </div>
  ` : ''}

  <!-- Estado en Lista -->
  <div class="list-status ${preop.inList ? 'in-list' : 'not-in-list'}">
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="font-size: 24pt;">${preop.inList ? '✓' : '⏳'}</div>
      <div>
        <div style="font-size: 11pt; font-weight: 700; color: ${preop.inList ? '#065f46' : '#92400e'};">
          ${preop.inList ? 'INGRESA EN LISTA DE TRASPLANTE' : 'PENDIENTE DE INCLUSIÓN EN LISTA'}
        </div>
        ${!preop.inList && preop.reasonNotInList ? `
        <div style="font-size: 9pt; color: #78350f; margin-top: 4px;">
          <strong>Motivo:</strong> ${preop.reasonNotInList}
        </div>
        ` : ''}
      </div>
    </div>
  </div>

  <!-- Problemas/Notas -->
  ${preop.problems ? `
  <div class="section" style="background: linear-gradient(to right, #fef3c7, #fef9c3);">
    <div class="section-title" style="color: #92400e;">
      <span class="section-title-icon" style="background: #f59e0b;"></span>
      PROBLEMAS / NOTAS IMPORTANTES
    </div>
    <div class="observations-text" style="color: #78350f; font-weight: 500;">${preop.problems}</div>
  </div>
  ` : ''}

  <!-- Archivos Adjuntos -->
  ${attachments && attachments.length > 0 ? `
  <div class="section">
    <div class="section-title">
      <span class="section-title-icon"></span>
      ESTUDIOS Y ARCHIVOS ADJUNTOS (${attachments.length})
    </div>
    <table class="lab-table">
      <thead>
        <tr>
          <th>Tipo</th>
          <th>Archivo</th>
          <th>Fecha del Estudio</th>
          <th>Descripción</th>
        </tr>
      </thead>
      <tbody>
        ${attachments.map(att => `
        <tr>
          <td><span class="badge info">${att.type || 'Otro'}</span></td>
          <td style="font-size: 7.5pt;">${att.fileName || '-'}</td>
          <td>${att.studyDate ? formatDate(att.studyDate, 'dd/MM/yyyy') : '-'}</td>
          <td style="font-size: 7.5pt;">${att.description || '-'}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <!-- Metadata -->
  <div style="margin-top: 15px; padding: 10px; background: #f3f4f6; border-radius: 6px; font-size: 7.5pt; color: #6b7280;">
    <div style="display: flex; justify-content: space-between;">
      <span><strong>ID Evaluación:</strong> ${preop.id}</span>
      <span><strong>Creado:</strong> ${formatDate(preop.createdAt, 'dd/MM/yyyy HH:mm')}</span>
      <span><strong>Actualizado:</strong> ${formatDate(preop.updatedAt, 'dd/MM/yyyy HH:mm')}</span>
    </div>
  </div>

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
 * Generar PDF de evaluación preoperatoria
 */
async function generatePreopPDF(preopId) {
  // Obtener datos
  const data = await getPreopDataForPDF(preopId);

  // Generar HTML
  const html = generatePreopHTML(data);

  // Generar PDF con Puppeteer
  const browser = await launchBrowser();

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    landscape: false, // Portrait para preop
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="font-size: 8px; color: #6b7280; text-align: right; width: 100%; padding-right: 15mm;">
        Página <span class="pageNumber"></span> de <span class="totalPages"></span>
      </div>
    `,
    margin: {
      top: '12mm',
      right: '15mm',
      bottom: '15mm',
      left: '15mm',
    },
  });

  await browser.close();

  return pdfBuffer;
}

/**
 * Obtener datos completos del procedimiento para PDF
 */
async function getProcedureDataForPDF(procedureId) {
  const procedure = await prisma.procedure.findUnique({
    where: { id: procedureId },
    include: {
      patient: true,
      clinician: true,
      intraopRecordsProcedure: {
        orderBy: { timestamp: 'asc' },
      },
    },
  });

  if (!procedure) {
    throw new NotFoundError('Procedimiento no encontrado');
  }

  return procedure;
}

/**
 * Generar HTML para PDF de procedimiento
 */
function generateProcedureHTML(procedure) {
  const { patient, clinician, intraopRecordsProcedure } = procedure;
  const logoBase64 = getLogoBase64();

  const calculateAge = (birthDate) => {
    if (!birthDate) return '-';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const procedureTypeLabels = {
    'BIOPSIA_HEPATICA_PERCUTANEA': 'Biopsia Hepática Percutánea',
    'BIOPSIA_HEPATICA_TRANSYUGULAR': 'Biopsia Hepática Transyugular',
    'BIOPSIA_HEPATICA_PROTOCOLO': 'Biopsia de Protocolo',
    'FGC_DIAGNOSTICA': 'FGC Diagnóstica',
    'FGC_TERAPEUTICA': 'FGC Terapéutica',
    'FGC_LIGADURA_VARICES': 'Ligadura de Várices',
    'CPRE_DIAGNOSTICA': 'CPRE Diagnóstica',
    'CPRE_ESFINTEROTOMIA': 'CPRE con Esfinterotomía',
    'TIPS': 'TIPS',
    'PARACENTESIS_EVACUADORA': 'Paracentesis Evacuadora',
    'HEMODIALISIS': 'Hemodiálisis',
    'COLOCACION_CVC': 'Colocación CVC',
    'TRASPLANTE_HEPATICO': 'Trasplante Hepático',
    'CER': 'CER',
    'OTRO': 'Otro',
  };

  const airwayLabels = { 'VAN': 'Vía Aérea Natural', 'IOT': 'Intubación Orotraqueal', 'TQT': 'Traqueostomía', 'MF': 'Máscara Facial', 'ML': 'Máscara Laríngea' };
  const ventilationLabels = { 'VAN': 'Sin Ventilación', 'VESP': 'Espontánea', 'ARM': 'ARM', 'MF_ESPONTANEA': 'MF Espontánea' };
  const anesthesiaLabels = { 'AGB': 'Anestesia General Balanceada', 'AL_POTENCIADA': 'AL Potenciada', 'SEDACION_LEVE': 'Sedación Leve', 'SEDACION_PROFUNDA': 'Sedación Profunda', 'REGIONAL': 'Regional', 'COMBINADA': 'Combinada' };
  const hemodynamicLabels = { 'ESTABLE': 'Estable', 'INESTABLE': 'Inestable', 'CRITICO': 'Crítico' };

  const procedureTypeLabel = procedureTypeLabels[procedure.procedureType] || procedure.procedureType || 'No especificado';

  let totalCristalloids = 0, totalRBC = 0, totalPlasma = 0;
  let totalPlasmalyte = 0, totalRinger = 0, totalSaline = 0;
  intraopRecordsProcedure.forEach(r => {
    totalPlasmalyte += r.plasmalyte || 0;
    totalRinger += r.ringer || 0;
    totalSaline += r.saline || 0;
    totalCristalloids += (r.plasmalyte || 0) + (r.ringer || 0) + (r.saline || 0);
    totalRBC += r.redBloodCells || 0;
    totalPlasma += r.plasma || 0;
  });

  // Build HTML parts using string concatenation to avoid template literal escaping issues
  const logoHtml = logoBase64 ? '<img src="' + logoBase64 + '" alt="Logo TxH" style="height: 45px; margin-bottom: 8px;">' : '';
  const patientSex = patient.sex === 'M' ? 'M' : patient.sex === 'F' ? 'F' : '-';
  const patientSexFull = patient.sex === 'M' ? 'Masculino' : patient.sex === 'F' ? 'Femenino' : '-';
  const patientAge = calculateAge(patient.birthDate);

  // Build intraop hemodynamics rows
  let intraopHemoRowsHtml = '';
  if (intraopRecordsProcedure && intraopRecordsProcedure.length > 0) {
    intraopHemoRowsHtml = intraopRecordsProcedure.map(r => {
      const temp = r.temp ? r.temp.toFixed(1) : '-';
      const fio2 = r.fio2 ? (r.fio2 * 100).toFixed(0) + '%' : '-';
      return '<tr>' +
        '<td>' + formatDate(r.timestamp, 'HH:mm') + '</td>' +
        '<td>' + (r.heartRate || '-') + '</td>' +
        '<td>' + (r.pas || '-') + '</td>' +
        '<td>' + (r.pad || '-') + '</td>' +
        '<td>' + (r.pam || '-') + '</td>' +
        '<td>' + (r.satO2 || '-') + '</td>' +
        '<td>' + temp + '</td>' +
        '<td>' + fio2 + '</td>' +
        '</tr>';
    }).join('');
  }

  // Build intraop ventilation rows
  let intraopVentRowsHtml = '';
  const hasVentData = intraopRecordsProcedure.some(r => r.tidalVolume || r.respRate || r.peep || r.peakPressure);
  if (intraopRecordsProcedure && intraopRecordsProcedure.length > 0 && hasVentData) {
    intraopVentRowsHtml = intraopRecordsProcedure.map(r => {
      return '<tr>' +
        '<td>' + formatDate(r.timestamp, 'HH:mm') + '</td>' +
        '<td>' + (r.tidalVolume || '-') + '</td>' +
        '<td>' + (r.respRate || '-') + '</td>' +
        '<td>' + (r.peep || '-') + '</td>' +
        '<td>' + (r.peakPressure || '-') + '</td>' +
        '<td>' + (r.inhalAgent || '-') + '</td>' +
        '</tr>';
    }).join('');
  }

  // Build intraop drugs/fluids rows
  let intraopDrugsRowsHtml = '';
  const hasDrugsData = intraopRecordsProcedure.some(r => r.opioids || r.hypnotics || r.relaxants || r.vasopressors || r.antibiotics || r.otherDrugs);
  if (intraopRecordsProcedure && intraopRecordsProcedure.length > 0 && hasDrugsData) {
    intraopDrugsRowsHtml = intraopRecordsProcedure.map(r => {
      const drugs = [];
      if (r.opioids) drugs.push('Opioides');
      if (r.hypnotics) drugs.push('Hipnóticos');
      if (r.relaxants) drugs.push('Relajantes');
      if (r.vasopressors) drugs.push('Vasopresores');
      if (r.antibiotics) drugs.push('ATB');
      const drugsStr = drugs.length > 0 ? drugs.join(', ') : '-';
      return '<tr>' +
        '<td>' + formatDate(r.timestamp, 'HH:mm') + '</td>' +
        '<td>' + drugsStr + '</td>' +
        '<td>' + (r.otherDrugs || '-') + '</td>' +
        '<td>' + (r.plasmalyte || 0) + '</td>' +
        '<td>' + (r.ringer || 0) + '</td>' +
        '<td>' + (r.saline || 0) + '</td>' +
        '<td>' + (r.redBloodCells || 0) + '</td>' +
        '<td>' + (r.plasma || 0) + '</td>' +
        '</tr>';
    }).join('');
  }

  // Build intraop lab rows
  let intraopLabRowsHtml = '';
  const hasLabData = intraopRecordsProcedure.some(r =>
    r.hb || r.hto || r.platelets || r.pt || r.inr || r.fibrinogen ||
    r.sodium || r.potassium || r.ionicCalcium ||
    r.pH || r.paO2 || r.paCO2 || r.hco3 || r.baseExcess || r.lactate ||
    r.creatinine || r.glucose
  );
  if (intraopRecordsProcedure && intraopRecordsProcedure.length > 0 && hasLabData) {
    intraopLabRowsHtml = intraopRecordsProcedure.map(r => {
      return '<tr>' +
        '<td>' + formatDate(r.timestamp, 'HH:mm') + '</td>' +
        '<td>' + (r.hb ? r.hb.toFixed(1) : '-') + '</td>' +
        '<td>' + (r.hto ? r.hto.toFixed(1) : '-') + '</td>' +
        '<td>' + (r.platelets ? Math.round(r.platelets) : '-') + '</td>' +
        '<td>' + (r.inr ? r.inr.toFixed(2) : '-') + '</td>' +
        '<td>' + (r.fibrinogen ? Math.round(r.fibrinogen) : '-') + '</td>' +
        '<td>' + (r.sodium ? r.sodium.toFixed(1) : '-') + '</td>' +
        '<td>' + (r.potassium ? r.potassium.toFixed(1) : '-') + '</td>' +
        '<td>' + (r.ionicCalcium ? r.ionicCalcium.toFixed(2) : '-') + '</td>' +
        '<td>' + (r.pH ? r.pH.toFixed(2) : '-') + '</td>' +
        '<td>' + (r.lactate ? r.lactate.toFixed(1) : '-') + '</td>' +
        '<td>' + (r.glucose ? Math.round(r.glucose) : '-') + '</td>' +
        '</tr>';
    }).join('');
  }

  // Helper for hemodynamic badge class
  const getHemoBadgeClass = (status) => {
    if (status === 'ESTABLE') return 'success';
    if (status === 'INESTABLE') return 'warning';
    if (status === 'CRITICO') return 'danger';
    return '';
  };

  // Conditional sections
  const procedureTypeDetailHtml = procedure.procedureTypeDetail
    ? '<div class="info-item"><div class="info-label">Detalle</div><div class="info-value">' + procedure.procedureTypeDetail + '</div></div>'
    : '';
  const regionalAnesthesiaHtml = procedure.regionalAnesthesia
    ? '<div class="info-item"><div class="info-label">Anestesia Regional</div><div class="info-value">' + procedure.regionalAnesthesia + '</div></div>'
    : '';
  const ventModeDetailHtml = procedure.ventModeDetail
    ? '<div class="info-item"><div class="info-label">Modo Ventilatorio</div><div class="info-value">' + procedure.ventModeDetail + '</div></div>'
    : '';

  const fluidsHtml = (totalCristalloids > 0 || totalRBC > 0 || totalPlasma > 0) ?
    '<div class="section">' +
    '<div class="section-title"><span class="section-title-icon"></span>RESUMEN DE FLUIDOS Y HEMODERIVADOS</div>' +
    '<div class="fluid-summary">' +
    '<div class="fluid-card"><div class="fluid-label">Plasmalyte</div><div class="fluid-value">' + totalPlasmalyte + ' <span style="font-size: 8pt; color: #6b7280;">ml</span></div></div>' +
    '<div class="fluid-card"><div class="fluid-label">Ringer</div><div class="fluid-value">' + totalRinger + ' <span style="font-size: 8pt; color: #6b7280;">ml</span></div></div>' +
    '<div class="fluid-card"><div class="fluid-label">Solución Salina</div><div class="fluid-value">' + totalSaline + ' <span style="font-size: 8pt; color: #6b7280;">ml</span></div></div>' +
    '<div class="fluid-card blood"><div class="fluid-label">Glóbulos Rojos</div><div class="fluid-value">' + totalRBC + ' <span style="font-size: 8pt; color: #6b7280;">U</span></div></div>' +
    '<div class="fluid-card blood"><div class="fluid-label">Plasma</div><div class="fluid-value">' + totalPlasma + ' <span style="font-size: 8pt; color: #6b7280;">U</span></div></div>' +
    '</div>' +
    '<div style="margin-top: 10px; padding: 8px; background: #f3f4f6; border-radius: 4px; text-align: center;">' +
    '<span style="font-weight: 600; color: #374151;">Total Cristaloides: ' + totalCristalloids + ' ml</span>' +
    '</div>' +
    '</div>' : '';

  // Hemodynamics table
  const intraopHemoHtml = (intraopRecordsProcedure && intraopRecordsProcedure.length > 0) ?
    '<div class="section">' +
    '<div class="section-title"><span class="section-title-icon"></span>REGISTROS INTRAOPERATORIOS - HEMODINAMIA</div>' +
    '<table class="data-table">' +
    '<thead><tr><th>Hora</th><th>FC</th><th>PAS</th><th>PAD</th><th>PAM</th><th>SpO2</th><th>Temp</th><th>FiO2</th></tr></thead>' +
    '<tbody>' + intraopHemoRowsHtml + '</tbody></table>' +
    '<div style="margin-top: 8px; font-size: 7.5pt; color: #6b7280;">FC: Frecuencia Cardíaca (lpm) | PAS/PAD/PAM: Presión Arterial (mmHg) | SpO2: Saturación O2 (%) | Temp: Temperatura (°C) | FiO2: Fracción Inspirada O2</div>' +
    '</div>' : '';

  // Ventilation table (only if there's data)
  const intraopVentHtml = (hasVentData) ?
    '<div class="section">' +
    '<div class="section-title"><span class="section-title-icon"></span>REGISTROS INTRAOPERATORIOS - VENTILACIÓN</div>' +
    '<table class="data-table">' +
    '<thead><tr><th>Hora</th><th>VT (ml)</th><th>FR (rpm)</th><th>PEEP (cmH2O)</th><th>PVA (cmH2O)</th><th>Agente Inhalatorio</th></tr></thead>' +
    '<tbody>' + intraopVentRowsHtml + '</tbody></table>' +
    '<div style="margin-top: 8px; font-size: 7.5pt; color: #6b7280;">VT: Volumen Tidal | FR: Frecuencia Respiratoria | PEEP: Presión Positiva al Final de Espiración | PVA: Presión de Vía Aérea</div>' +
    '</div>' : '';

  // Drugs and fluids table (only if there's data)
  const intraopDrugsHtml = (hasDrugsData) ?
    '<div class="section">' +
    '<div class="section-title"><span class="section-title-icon"></span>REGISTROS INTRAOPERATORIOS - FÁRMACOS Y FLUIDOS</div>' +
    '<table class="data-table">' +
    '<thead><tr><th>Hora</th><th>Fármacos</th><th>Otros</th><th>Plasmalyte</th><th>Ringer</th><th>SF</th><th>GR</th><th>Plasma</th></tr></thead>' +
    '<tbody>' + intraopDrugsRowsHtml + '</tbody></table>' +
    '<div style="margin-top: 8px; font-size: 7.5pt; color: #6b7280;">Fluidos en ml | GR: Glóbulos Rojos (U) | Plasma (U)</div>' +
    '</div>' : '';

  // Lab table (only if there's data)
  const intraopLabHtml = (hasLabData) ?
    '<div class="section">' +
    '<div class="section-title"><span class="section-title-icon"></span>REGISTROS INTRAOPERATORIOS - LABORATORIO</div>' +
    '<table class="data-table">' +
    '<thead><tr><th>Hora</th><th>Hb</th><th>Hto</th><th>Plaq</th><th>INR</th><th>Fib</th><th>Na+</th><th>K+</th><th>Ca++</th><th>pH</th><th>Lac</th><th>Glic</th></tr></thead>' +
    '<tbody>' + intraopLabRowsHtml + '</tbody></table>' +
    '<div style="margin-top: 8px; font-size: 7.5pt; color: #6b7280;">Hb: g/dL | Hto: % | Plaq: 10³/µL | Fib: mg/dL | Na+/K+: mEq/L | Ca++: mmol/L | Lac: mmol/L | Glic: mg/dL</div>' +
    '</div>' : '';

  const complicationsHtml = procedure.complications ?
    '<div class="section" style="background: linear-gradient(to right, #fee2e2, #fecaca);">' +
    '<div class="section-title" style="color: #991b1b;"><span class="section-title-icon" style="background: #dc2626;"></span>COMPLICACIONES</div>' +
    '<div class="observations-text" style="color: #991b1b; background: transparent;">' + procedure.complications + '</div></div>' : '';

  const observationsHtml = procedure.observations ?
    '<div class="section">' +
    '<div class="section-title"><span class="section-title-icon"></span>OBSERVACIONES</div>' +
    '<div class="observations-text">' + procedure.observations + '</div></div>' : '';

  return '<!DOCTYPE html>' +
'<html lang="es">' +
'<head>' +
'  <meta charset="UTF-8">' +
'  <title>Procedimiento - ' + patient.name + '</title>' +
'  <style>' +
'    @page { size: A4 portrait; margin: 0; }' +
'    * { margin: 0; padding: 0; box-sizing: border-box; }' +
'    body { font-family: "Segoe UI", Arial, sans-serif; font-size: 9pt; line-height: 1.3; color: #1f2937; background: #f9fafb; padding: 12mm 15mm 15mm 15mm; }' +
'    .header { background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); color: white; padding: 20px 25px; border-radius: 8px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }' +
'    .header-left h1 { font-size: 18pt; font-weight: 700; margin-bottom: 5px; }' +
'    .header-left .subtitle { font-size: 10pt; opacity: 0.95; }' +
'    .header-right { text-align: right; }' +
'    .header-right .patient-name { font-size: 14pt; font-weight: 600; margin-bottom: 3px; }' +
'    .header-right .patient-info { font-size: 9pt; opacity: 0.9; }' +
'    .section { background: white; border-radius: 6px; padding: 15px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }' +
'    .section-title { font-size: 10pt; font-weight: 700; color: #0891b2; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 2px solid #e5e7eb; }' +
'    .section-title-icon { width: 16px; height: 16px; background: #0891b2; border-radius: 4px; display: inline-block; margin-right: 8px; }' +
'    .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px 15px; }' +
'    .info-item { display: flex; flex-direction: column; }' +
'    .info-label { font-size: 7pt; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 2px; }' +
'    .info-value { font-size: 9pt; color: #111827; font-weight: 500; }' +
'    .badge { display: inline-block; background: #f3f4f6; padding: 4px 10px; border-radius: 4px; font-size: 7.5pt; font-weight: 500; }' +
'    .badge.success { background: #dcfce7; color: #166534; }' +
'    .badge.warning { background: #fef3c7; color: #92400e; }' +
'    .badge.danger { background: #fee2e2; color: #991b1b; }' +
'    .data-table { width: 100%; border-collapse: collapse; font-size: 8pt; margin-top: 10px; }' +
'    .data-table th { background: #f9fafb; padding: 6px 8px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; font-size: 7pt; text-transform: uppercase; }' +
'    .data-table td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; }' +
'    .fluid-summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-top: 10px; }' +
'    .fluid-card { background: #f9fafb; padding: 12px; border-radius: 6px; text-align: center; border-left: 4px solid #0891b2; }' +
'    .fluid-card.blood { border-left-color: #dc2626; }' +
'    .fluid-label { font-size: 7.5pt; color: #6b7280; text-transform: uppercase; font-weight: 600; }' +
'    .fluid-value { font-size: 16pt; font-weight: 700; color: #111827; }' +
'    .footer { margin-top: 20px; padding-top: 15px; border-top: 2px solid #e5e7eb; text-align: center; font-size: 7.5pt; color: #9ca3af; }' +
'    .observations-text { font-size: 9pt; color: #374151; line-height: 1.5; white-space: pre-wrap; padding: 10px; background: #f9fafb; border-radius: 6px; }' +
'  </style>' +
'</head>' +
'<body>' +
'  <div class="header">' +
'    <div class="header-left">' +
       logoHtml +
'      <h1>Reporte de Procedimiento</h1>' +
'      <div class="subtitle">' + procedureTypeLabel + '</div>' +
'    </div>' +
'    <div class="header-right">' +
'      <div class="patient-name">' + patient.name + '</div>' +
'      <div class="patient-info">CI: ' + formatCI(patient.id) + ' &bull; ' + patientSex + ' &bull; ' + patientAge + ' años</div>' +
'      <div class="patient-info" style="margin-top: 3px;">Fecha: ' + formatDate(procedure.startAt, 'dd/MM/yyyy') + '</div>' +
'      <div class="patient-info" style="margin-top: 3px;"><strong>Anestesiólogo:</strong> ' + (clinician ? clinician.name : '-') + '</div>' +
'    </div>' +
'  </div>' +
'  <div class="section">' +
'    <div class="section-title"><span class="section-title-icon"></span>DATOS DEL PACIENTE</div>' +
'    <div class="info-grid">' +
'      <div class="info-item"><div class="info-label">CI</div><div class="info-value">' + formatCI(patient.id) + '</div></div>' +
'      <div class="info-item"><div class="info-label">Nombre</div><div class="info-value">' + patient.name + '</div></div>' +
'      <div class="info-item"><div class="info-label">Fecha Nacimiento</div><div class="info-value">' + formatDate(patient.birthDate, 'dd/MM/yyyy') + '</div></div>' +
'      <div class="info-item"><div class="info-label">Edad</div><div class="info-value">' + patientAge + ' años</div></div>' +
'      <div class="info-item"><div class="info-label">Sexo</div><div class="info-value">' + patientSexFull + '</div></div>' +
'      <div class="info-item"><div class="info-label">Grupo Sanguíneo</div><div class="info-value" style="font-weight: 700; color: #dc2626;">' + (patient.bloodGroup || '-') + '</div></div>' +
'      <div class="info-item"><div class="info-label">Peso / Talla</div><div class="info-value">' + (patient.weight || '-') + ' kg / ' + (patient.height || '-') + ' cm</div></div>' +
'      <div class="info-item"><div class="info-label">Prestador</div><div class="info-value">' + (patient.provider || '-') + '</div></div>' +
'    </div>' +
'  </div>' +
'  <div class="section">' +
'    <div class="section-title"><span class="section-title-icon"></span>DATOS DEL PROCEDIMIENTO</div>' +
'    <div class="info-grid">' +
'      <div class="info-item"><div class="info-label">Tipo</div><div class="info-value" style="font-weight: 600;">' + procedureTypeLabel + '</div></div>' +
       procedureTypeDetailHtml +
'      <div class="info-item"><div class="info-label">Inicio</div><div class="info-value">' + formatDate(procedure.startAt, 'dd/MM/yyyy HH:mm') + '</div></div>' +
'      <div class="info-item"><div class="info-label">Fin</div><div class="info-value">' + formatDate(procedure.endAt, 'dd/MM/yyyy HH:mm') + '</div></div>' +
'      <div class="info-item"><div class="info-label">Duración</div><div class="info-value" style="font-weight: 600;">' + (procedure.duration ? formatDuration(procedure.duration) : '-') + '</div></div>' +
'      <div class="info-item"><div class="info-label">Ubicación</div><div class="info-value">' + (procedure.location || '-') + '</div></div>' +
'      <div class="info-item"><div class="info-label">ASA</div><div class="info-value" style="font-weight: 700;">' + (procedure.asa || '-') + '</div></div>' +
'      <div class="info-item"><div class="info-label">Anestesiólogo</div><div class="info-value">' + (clinician ? clinician.name : '-') + '</div></div>' +
'    </div>' +
'  </div>' +
'  <div class="section">' +
'    <div class="section-title"><span class="section-title-icon"></span>ESTADO PREOPERATORIO</div>' +
'    <div class="info-grid">' +
'      <div class="info-item"><div class="info-label">Vía Aérea</div><div class="info-value">' + (airwayLabels[procedure.airwayPreop] || procedure.airwayPreop || '-') + '</div></div>' +
'      <div class="info-item"><div class="info-label">Ventilación</div><div class="info-value">' + (ventilationLabels[procedure.ventilationPreop] || procedure.ventilationPreop || '-') + '</div></div>' +
'      <div class="info-item"><div class="info-label">Hemodinamia</div><div class="info-value"><span class="badge ' + getHemoBadgeClass(procedure.hemodynamicsPreop) + '">' + (hemodynamicLabels[procedure.hemodynamicsPreop] || procedure.hemodynamicsPreop || '-') + '</span></div></div>' +
'      <div class="info-item"><div class="info-label">Glasgow</div><div class="info-value" style="font-weight: 600;">' + (procedure.gcs || '-') + '</div></div>' +
'      <div class="info-item"><div class="info-label">Procedencia</div><div class="info-value">' + (procedure.provenance || '-') + '</div></div>' +
'    </div>' +
'  </div>' +
'  <div class="section">' +
'    <div class="section-title"><span class="section-title-icon"></span>MANEJO ANESTÉSICO</div>' +
'    <div class="info-grid">' +
'      <div class="info-item"><div class="info-label">Técnica</div><div class="info-value" style="font-weight: 600;">' + (anesthesiaLabels[procedure.anesthesiaTech] || procedure.anesthesiaTech || '-') + '</div></div>' +
'      <div class="info-item"><div class="info-label">Vía Aérea Intraop</div><div class="info-value">' + (airwayLabels[procedure.airwayIntraop] || procedure.airwayIntraop || '-') + '</div></div>' +
'      <div class="info-item"><div class="info-label">Ventilación Intraop</div><div class="info-value">' + (ventilationLabels[procedure.ventilationIntraop] || procedure.ventilationIntraop || '-') + '</div></div>' +
'      <div class="info-item"><div class="info-label">Posición</div><div class="info-value">' + (procedure.position || '-') + '</div></div>' +
'      <div class="info-item"><div class="info-label">Premedicación</div><div class="info-value">' + (procedure.premedication ? 'Sí' : 'No') + '</div></div>' +
'      <div class="info-item"><div class="info-label">ATB Profiláctico</div><div class="info-value">' + (procedure.prophylacticATB || '-') + '</div></div>' +
'      <div class="info-item"><div class="info-label">Estómago Ocupado</div><div class="info-value" style="color: ' + (procedure.fullStomach ? '#dc2626' : '#10b981') + ';">' + (procedure.fullStomach ? 'Sí' : 'No') + '</div></div>' +
'      <div class="info-item"><div class="info-label">Secuencia Rápida</div><div class="info-value">' + (procedure.rapidSequence ? 'Sí' : 'No') + '</div></div>' +
'      <div class="info-item"><div class="info-label">IOT Difícil</div><div class="info-value" style="color: ' + (procedure.difficultAirway ? '#dc2626' : '#10b981') + ';">' + (procedure.difficultAirway ? 'Sí' : 'No') + '</div></div>' +
       regionalAnesthesiaHtml +
       ventModeDetailHtml +
'    </div>' +
'  </div>' +
'  <div class="section">' +
'    <div class="section-title"><span class="section-title-icon"></span>ESTADO POSTOPERATORIO</div>' +
'    <div class="info-grid">' +
'      <div class="info-item"><div class="info-label">Destino</div><div class="info-value" style="font-weight: 600;">' + (procedure.destination || '-') + '</div></div>' +
'      <div class="info-item"><div class="info-label">Vía Aérea</div><div class="info-value">' + (airwayLabels[procedure.airwayPostop] || procedure.airwayPostop || '-') + '</div></div>' +
'      <div class="info-item"><div class="info-label">Ventilación</div><div class="info-value">' + (ventilationLabels[procedure.ventilationPostop] || procedure.ventilationPostop || '-') + '</div></div>' +
'      <div class="info-item"><div class="info-label">Hemodinamia</div><div class="info-value"><span class="badge ' + getHemoBadgeClass(procedure.hemodynamicsPostop) + '">' + (hemodynamicLabels[procedure.hemodynamicsPostop] || procedure.hemodynamicsPostop || '-') + '</span></div></div>' +
'    </div>' +
'  </div>' +
   intraopHemoHtml +
   intraopVentHtml +
   intraopDrugsHtml +
   intraopLabHtml +
   fluidsHtml +
   complicationsHtml +
   observationsHtml +
'  <div style="margin-top: 15px; padding: 10px; background: #f3f4f6; border-radius: 6px; font-size: 7.5pt; color: #6b7280;">' +
'    <div style="display: flex; justify-content: space-between;">' +
'      <span><strong>ID:</strong> ' + procedure.id + '</span>' +
'      <span><strong>Creado:</strong> ' + formatDate(procedure.createdAt, 'dd/MM/yyyy HH:mm') + '</span>' +
'      <span><strong>Actualizado:</strong> ' + formatDate(procedure.updatedAt, 'dd/MM/yyyy HH:mm') + '</span>' +
'    </div>' +
'  </div>' +
'  <div class="footer">' +
'    <strong>Sistema de Registro Anestesiológico TxH</strong><br>' +
'    Generado el ' + formatDate(new Date(), "dd/MM/yyyy 'a las' HH:mm") + ' &bull; Programa Nacional de Trasplante Hepático' +
'  </div>' +
'</body>' +
'</html>';
}

/**
 * Generar PDF de procedimiento
 */
async function generateProcedurePDF(procedureId) {
  const data = await getProcedureDataForPDF(procedureId);
  const html = generateProcedureHTML(data);

  const browser = await launchBrowser();

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    landscape: false,
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="font-size: 8px; color: #6b7280; text-align: right; width: 100%; padding-right: 15mm;">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>',
    margin: { top: '12mm', right: '15mm', bottom: '15mm', left: '15mm' },
  });

  await browser.close();
  return pdfBuffer;
}

module.exports = {
  generateCasePDF,
  getCaseDataForPDF,
  generatePreopPDF,
  getPreopDataForPDF,
  generateProcedurePDF,
  getProcedureDataForPDF,
};
