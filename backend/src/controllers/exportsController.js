// backend/src/controllers/exportsController.js
/**
 * Exports Controller
 * Handles PDF and CSV export requests
 */

const pdfService = require('../services/pdfService');
const csvService = require('../services/csvService');
const emailService = require('../services/emailService');
const logger = require('../lib/logger');
const prisma = require('../lib/prisma');
const archiver = require('archiver');

/**
 * Export case as PDF
 * GET /api/exports/case/:id/pdf
 */
async function exportCasePDF(req, res) {
  try {
    const { id } = req.params;

    logger.info(`Exporting case ${id} as PDF`);

    // Generate PDF
    const pdfBuffer = await pdfService.generateCasePDF(id);

    // Ensure it's a proper Buffer
    const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="caso-${id}.pdf"`);
    res.setHeader('Content-Length', buffer.length);

    // Send PDF as binary
    res.end(buffer);

    logger.info(`Successfully exported case ${id} as PDF`);
  } catch (error) {
    logger.error('Error exporting PDF:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Case not found',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to generate PDF',
      message: error.message,
    });
  }
}

/**
 * Export case as CSV (complete view)
 * GET /api/exports/case/:id/csv
 */
async function exportCaseCSV(req, res) {
  try {
    const { id } = req.params;
    const { format = 'complete' } = req.query; // complete | summary | intraop

    logger.info(`Exporting case ${id} as CSV (format: ${format})`);

    let csv;

    // Generate CSV based on format
    switch (format) {
      case 'summary':
        csv = await csvService.generateCaseSummaryCSV(id);
        break;
      case 'intraop':
        csv = await csvService.generateIntraopRecordsCSV(id);
        break;
      case 'complete':
      default:
        csv = await csvService.generateCompleteCaseCSV(id);
        break;
    }

    // Set headers for download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="caso-${id}-${format}.csv"`);

    // Add UTF-8 BOM for Excel compatibility and send
    res.send('\ufeff' + csv);

    logger.info(`Successfully exported case ${id} as CSV (${format})`);
  } catch (error) {
    logger.error('Error exporting CSV:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Case not found',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to generate CSV',
      message: error.message,
    });
  }
}

/**
 * Export multiple cases as CSV (batch export)
 * POST /api/exports/cases/csv
 * Body: { caseIds: [1, 2, 3], format: 'complete' }
 */
async function exportMultipleCasesCSV(req, res) {
  try {
    const { caseIds, format = 'complete' } = req.body;

    if (!caseIds || !Array.isArray(caseIds) || caseIds.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'caseIds must be a non-empty array',
      });
    }

    logger.info(`Exporting ${caseIds.length} cases as CSV (format: ${format})`);

    // Generate CSV for each case
    const csvPromises = caseIds.map(async (id) => {
      switch (format) {
        case 'summary':
          return csvService.generateCaseSummaryCSV(id);
        case 'intraop':
          return csvService.generateIntraopRecordsCSV(id);
        case 'complete':
        default:
          return csvService.generateCompleteCaseCSV(id);
      }
    });

    const csvResults = await Promise.all(csvPromises);

    // Combine CSVs (skip headers for all but first)
    let combinedCSV = csvResults[0];
    for (let i = 1; i < csvResults.length; i++) {
      const lines = csvResults[i].split('\n');
      // Skip header line
      combinedCSV += '\n' + lines.slice(1).join('\n');
    }

    // Set headers for download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="casos-${format}.csv"`);

    // Add UTF-8 BOM for Excel compatibility and send
    res.send('\ufeff' + combinedCSV);

    logger.info(`Successfully exported ${caseIds.length} cases as CSV (${format})`);
  } catch (error) {
    logger.error('Error exporting multiple cases CSV:', error);

    res.status(500).json({
      error: 'Failed to generate CSV',
      message: error.message,
    });
  }
}

/**
 * Email case PDF to distribution list
 * POST /api/exports/case/:id/email
 * Body: { recipients?: string[] } - Optional custom recipients
 */
async function emailCasePDF(req, res) {
  try {
    const { id } = req.params;
    const { recipients: customRecipients } = req.body;

    logger.info(`Emailing case ${id} PDF`);

    // Generate PDF
    const pdfBuffer = await pdfService.generateCasePDF(id);

    // Get case info for email
    const caseData = await prisma.transplantCase.findUnique({
      where: { id },
      include: {
        patient: true,
      },
    });

    if (!caseData) {
      return res.status(404).json({
        error: 'Case not found',
        message: `Case ${id} not found`,
      });
    }

    // Format case info
    const caseInfo = {
      patientName: caseData.patient.name,
      patientCI: caseData.patient.id,
      transplantDate: caseData.startAt
        ? new Date(caseData.startAt).toLocaleDateString('es-UY')
        : 'N/A',
      duration: caseData.duration
        ? `${Math.floor(caseData.duration / 60)}h ${caseData.duration % 60}min`
        : null,
    };

    // Get recipients (custom or default)
    const recipients =
      customRecipients && customRecipients.length > 0
        ? customRecipients
        : emailService.getDefaultDistributionList();

    if (recipients.length === 0) {
      return res.status(400).json({
        error: 'No recipients specified',
        message:
          'No recipients provided and no default distribution list configured',
      });
    }

    // Send email
    const result = await emailService.sendPDFReport({
      recipients,
      subject: `Reporte de Trasplante - ${caseInfo.patientName} (${caseInfo.transplantDate})`,
      pdfBuffer,
      filename: `trasplante-${id}.pdf`,
      caseInfo,
    });

    logger.info(`Successfully emailed case ${id} PDF to ${result.recipients} recipients`);

    res.json({
      success: true,
      message: `PDF sent successfully to ${result.recipients} recipient(s)`,
      recipients: result.recipients,
      messageId: result.messageId,
    });
  } catch (error) {
    logger.error('Error emailing PDF:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Case not found',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to email PDF',
      message: error.message,
    });
  }
}

/**
 * Export preop evaluation as PDF
 * GET /api/exports/preop/:id/pdf
 */
async function exportPreopPDF(req, res) {
  try {
    const { id } = req.params;

    logger.info(`Exporting preop evaluation ${id} as PDF`);

    // Generate PDF
    const pdfBuffer = await pdfService.generatePreopPDF(id);

    // Ensure it's a proper Buffer
    const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);

    // Get preop info for filename
    const preop = await prisma.preopEvaluation.findUnique({
      where: { id },
      include: { patient: true },
    });

    const patientName = preop?.patient?.name?.replace(/\s+/g, '_') || 'paciente';

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="evaluacion-pretrasplante-${patientName}-${id}.pdf"`);
    res.setHeader('Content-Length', buffer.length);

    // Send PDF as binary
    res.end(buffer);

    logger.info(`Successfully exported preop evaluation ${id} as PDF`);
  } catch (error) {
    logger.error('Error exporting preop PDF:', error);

    if (error.message.includes('no encontrada') || error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Evaluación no encontrada',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to generate PDF',
      message: error.message,
    });
  }
}

/**
 * Email preop evaluation PDF to distribution list
 * POST /api/exports/preop/:id/email
 * Body: { recipients?: string[] } - Optional custom recipients
 */
async function emailPreopPDF(req, res) {
  try {
    const { id } = req.params;
    const { recipients: customRecipients } = req.body;

    logger.info(`Emailing preop evaluation ${id} PDF`);

    // Generate PDF
    const pdfBuffer = await pdfService.generatePreopPDF(id);

    // Get preop info for email
    const preop = await prisma.preopEvaluation.findUnique({
      where: { id },
      include: {
        patient: true,
        clinician: true,
      },
    });

    if (!preop) {
      return res.status(404).json({
        error: 'Evaluación no encontrada',
        message: `Preop evaluation ${id} not found`,
      });
    }

    // Format preop info
    const preopInfo = {
      patientName: preop.patient.name,
      patientCI: preop.patient.id,
      evaluationDate: preop.evaluationDate
        ? new Date(preop.evaluationDate).toLocaleDateString('es-UY')
        : 'N/A',
      meld: preop.meld,
      child: preop.child,
      clinician: preop.clinician?.name || 'Sin asignar',
    };

    // Get recipients (custom or default)
    const recipients =
      customRecipients && customRecipients.length > 0
        ? customRecipients
        : emailService.getDefaultDistributionList();

    if (recipients.length === 0) {
      return res.status(400).json({
        error: 'No recipients specified',
        message:
          'No recipients provided and no default distribution list configured',
      });
    }

    // Send email
    const result = await emailService.sendPDFReport({
      recipients,
      subject: `Evaluación Pretrasplante - ${preopInfo.patientName} (${preopInfo.evaluationDate})`,
      pdfBuffer,
      filename: `evaluacion-pretrasplante-${preopInfo.patientName.replace(/\s+/g, '_')}.pdf`,
      caseInfo: {
        ...preopInfo,
        type: 'preop',
      },
    });

    logger.info(`Successfully emailed preop ${id} PDF to ${result.recipients} recipients`);

    res.json({
      success: true,
      message: `PDF enviado exitosamente a ${result.recipients} destinatario(s)`,
      recipients: result.recipients,
      messageId: result.messageId,
    });
  } catch (error) {
    logger.error('Error emailing preop PDF:', error);

    if (error.message.includes('no encontrada') || error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Evaluación no encontrada',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to email PDF',
      message: error.message,
    });
  }
}

// ============================================================================
// PROCEDURE EXPORTS
// ============================================================================

/**
 * Export procedure as PDF
 * GET /api/exports/procedure/:id/pdf
 */
async function exportProcedurePDF(req, res) {
  try {
    const { id } = req.params;

    logger.info(`Exporting procedure ${id} as PDF`);

    // Generate PDF
    const pdfBuffer = await pdfService.generateProcedurePDF(id);

    // Ensure it's a proper Buffer
    const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);

    // Get procedure info for filename
    const procedure = await prisma.procedure.findUnique({
      where: { id },
      include: { patient: true },
    });

    const patientName = procedure?.patient?.name?.replace(/\s+/g, '_') || 'paciente';

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="procedimiento-${patientName}-${id}.pdf"`);
    res.setHeader('Content-Length', buffer.length);

    // Send PDF as binary
    res.end(buffer);

    logger.info(`Successfully exported procedure ${id} as PDF`);
  } catch (error) {
    logger.error('Error exporting procedure PDF:', error);

    if (error.message.includes('no encontrado') || error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Procedimiento no encontrado',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to generate PDF',
      message: error.message,
    });
  }
}

/**
 * Email procedure PDF to distribution list
 * POST /api/exports/procedure/:id/email
 * Body: { recipients?: string[] } - Optional custom recipients
 */
async function emailProcedurePDF(req, res) {
  try {
    const { id } = req.params;
    const { recipients: customRecipients } = req.body;

    logger.info(`Emailing procedure ${id} PDF`);

    // Generate PDF
    const pdfBuffer = await pdfService.generateProcedurePDF(id);

    // Get procedure info for email
    const procedure = await prisma.procedure.findUnique({
      where: { id },
      include: {
        patient: true,
        clinician: true,
      },
    });

    if (!procedure) {
      return res.status(404).json({
        error: 'Procedimiento no encontrado',
        message: `Procedure ${id} not found`,
      });
    }

    // Format procedure info
    const procedureInfo = {
      patientName: procedure.patient.name,
      patientCI: procedure.patient.id,
      procedureDate: procedure.startAt
        ? new Date(procedure.startAt).toLocaleDateString('es-UY')
        : 'N/A',
      procedureType: procedure.procedureType,
      clinician: procedure.clinician?.name || 'Sin asignar',
    };

    // Get recipients (custom or default)
    const recipients =
      customRecipients && customRecipients.length > 0
        ? customRecipients
        : emailService.getDefaultDistributionList();

    if (recipients.length === 0) {
      return res.status(400).json({
        error: 'No recipients specified',
        message:
          'No recipients provided and no default distribution list configured',
      });
    }

    // Send email
    const result = await emailService.sendPDFReport({
      recipients,
      subject: `Procedimiento - ${procedureInfo.patientName} (${procedureInfo.procedureDate})`,
      pdfBuffer,
      filename: `procedimiento-${procedureInfo.patientName.replace(/\s+/g, '_')}.pdf`,
      caseInfo: {
        ...procedureInfo,
        type: 'procedure',
      },
    });

    // Track email sent for quality KPI (Objective 3)
    await prisma.procedure.update({
      where: { id },
      data: {
        pdfSentByEmail: true,
        pdfSentAt: new Date(),
      },
    });

    logger.info(`Successfully emailed procedure ${id} PDF to ${result.recipients} recipients`);

    res.json({
      success: true,
      message: `PDF enviado exitosamente a ${result.recipients} destinatario(s)`,
      recipients: result.recipients,
      messageId: result.messageId,
    });
  } catch (error) {
    logger.error('Error emailing procedure PDF:', error);

    if (error.message.includes('no encontrado') || error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Procedimiento no encontrado',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to email PDF',
      message: error.message,
    });
  }
}

// ============================================================================
// SPSS EXPORT ENDPOINTS
// ============================================================================

/**
 * Get available SPSS export profiles
 * GET /api/exports/spss/profiles
 */
async function getSPSSProfiles(req, res) {
  try {
    const profiles = csvService.getAvailableSPSSProfiles();

    res.json({
      success: true,
      profiles,
    });
  } catch (error) {
    logger.error('Error getting SPSS profiles:', error);
    res.status(500).json({
      error: 'Failed to get SPSS profiles',
      message: error.message,
    });
  }
}

/**
 * Export cases as SPSS-compatible CSV
 * POST /api/exports/spss
 * Body: {
 *   caseIds?: number[],      // Optional - if not provided, exports all cases for organization
 *   profile: string,          // Profile ID (demographic, comorbidities, etc.)
 *   filters?: {               // Optional filters when exporting all
 *     year?: number,
 *     dateFrom?: string,
 *     dateTo?: string
 *   }
 * }
 */
async function exportSPSS(req, res) {
  logger.info('=== SPSS EXPORT ENDPOINT HIT ===', {
    body: req.body,
    user: req.user?.email,
    orgId: req.user?.orgId,
    headers: {
      origin: req.headers.origin,
      contentType: req.headers['content-type'],
      authorization: req.headers.authorization ? 'present' : 'missing',
    },
  });

  try {
    const { caseIds, profile = 'complete', filters = {} } = req.body;
    const organizationId = req.user?.orgId;

    if (!organizationId) {
      logger.warn('SPSS export failed: No organization ID');
      return res.status(400).json({
        error: 'Organization required',
        message: 'No organization ID found in request',
      });
    }

    logger.info(`SPSS export requested - profile: ${profile}, org: ${organizationId}, caseIds: ${JSON.stringify(caseIds)}`);

    // Get case IDs if not provided
    let targetCaseIds = caseIds;
    if (!targetCaseIds || targetCaseIds.length === 0) {
      targetCaseIds = await csvService.getAllCasesForOrganization(organizationId, filters);
    }

    if (targetCaseIds.length === 0) {
      return res.status(404).json({
        error: 'No cases found',
        message: 'No cases match the specified criteria',
      });
    }

    logger.info(`Exporting ${targetCaseIds.length} cases with profile: ${profile}`);

    // Generate SPSS export
    logger.info(`Calling generateSPSSExport with ${targetCaseIds.length} cases, profile: ${profile}`);
    const result = await csvService.generateSPSSExport(targetCaseIds, profile, {
      includeMetadata: true,
    });

    // Validar que el resultado no sea undefined
    if (!result || typeof result.csv !== 'string') {
      logger.error('generateSPSSExport returned invalid result:', {
        resultType: typeof result,
        hasCSV: result?.csv !== undefined,
        csvType: typeof result?.csv,
      });
      return res.status(500).json({
        error: 'CSV generation failed',
        message: 'El servicio de exportación no devolvió datos válidos',
      });
    }

    const { csv, metadata } = result;

    // Validación adicional
    if (!csv || csv.length === 0) {
      logger.error('CSV is empty or undefined');
      return res.status(500).json({
        error: 'CSV generation failed',
        message: 'El CSV generado está vacío',
      });
    }

    logger.info(`CSV generated successfully: ${csv.length} chars, ${metadata.totalRows} rows from ${metadata.totalCases} cases`);

    // Set headers for download
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `spss-export-${profile}-${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Add UTF-8 BOM for Excel compatibility and send
    res.send('\ufeff' + csv);

    logger.info(`Successfully exported ${metadata.totalRows} rows from ${metadata.totalCases} cases for SPSS (profile: ${profile})`);
  } catch (error) {
    logger.error('Error exporting SPSS:', error);
    res.status(500).json({
      error: 'Failed to generate SPSS export',
      message: error.message,
    });
  }
}

/**
 * Get SPSS syntax file for a profile
 * GET /api/exports/spss/syntax/:profile
 */
async function getSPSSSyntax(req, res) {
  try {
    const { profile } = req.params;

    const syntax = csvService.generateSPSSSyntax(profile);

    if (!syntax) {
      return res.status(404).json({
        error: 'Profile not found',
        message: `Profile "${profile}" not found`,
      });
    }

    // Set headers for download
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="spss-syntax-${profile}.sps"`);

    res.send(syntax);

    logger.info(`SPSS syntax downloaded for profile: ${profile}`);
  } catch (error) {
    logger.error('Error generating SPSS syntax:', error);
    res.status(500).json({
      error: 'Failed to generate SPSS syntax',
      message: error.message,
    });
  }
}

/**
 * Export all data as ZIP with CSV + SPSS syntax + data dictionary
 * POST /api/exports/spss/bundle
 * Body: {
 *   caseIds?: number[],
 *   profile: string,
 *   filters?: object
 * }
 */
async function exportSPSSBundle(req, res) {
  try {
    const { caseIds, profile = 'complete', filters = {} } = req.body;
    const organizationId = req.user?.orgId;

    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization required',
        message: 'No organization ID found in request',
      });
    }

    // Get case IDs if not provided
    let targetCaseIds = caseIds;
    if (!targetCaseIds || targetCaseIds.length === 0) {
      targetCaseIds = await csvService.getAllCasesForOrganization(organizationId, filters);
    }

    if (targetCaseIds.length === 0) {
      return res.status(404).json({
        error: 'No cases found',
        message: 'No cases match the specified criteria',
      });
    }

    logger.info(`SPSS bundle export - ${targetCaseIds.length} cases, profile: ${profile}`);

    // Generate all components
    const result = await csvService.generateSPSSExport(targetCaseIds, profile, {
      includeMetadata: true,
      includeDataDictionary: true,
    });

    // Validar que el resultado no sea undefined
    if (!result || typeof result.csv !== 'string') {
      logger.error('generateSPSSExport (bundle) returned invalid result:', {
        resultType: typeof result,
        hasCSV: result?.csv !== undefined,
      });
      return res.status(500).json({
        error: 'CSV generation failed',
        message: 'El servicio de exportación no devolvió datos válidos',
      });
    }

    const { csv, metadata, dataDictionary } = result;

    const syntax = csvService.generateSPSSSyntax(profile);

    // Create ZIP archive
    const timestamp = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="spss-bundle-${profile}-${timestamp}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(res);

    // Add files to ZIP
    archive.append('\ufeff' + csv, { name: `datos-${profile}.csv` });
    archive.append(syntax, { name: `sintaxis-spss-${profile}.sps` });
    archive.append(dataDictionary, { name: 'diccionario-datos.txt' });

    // Add README
    const readme = `EXPORTACIÓN SPSS - Sistema de Registro Anestesiológico TxH
========================================================

Fecha de exportación: ${new Date().toLocaleString('es-UY')}
Perfil: ${profile}
Total de casos: ${metadata.totalCases}
Variables incluidas: ${metadata.variableCount}

CONTENIDO DEL ARCHIVO:
- datos-${profile}.csv: Datos en formato CSV (compatible con SPSS)
- sintaxis-spss-${profile}.sps: Archivo de sintaxis SPSS con etiquetas de variables
- diccionario-datos.txt: Diccionario de datos con descripción de cada variable

INSTRUCCIONES DE USO EN SPSS:
1. Importar datos-${profile}.csv usando File > Open > Data
2. Seleccionar delimitador: punto y coma (;)
3. Ejecutar sintaxis-spss-${profile}.sps para aplicar etiquetas

CODIFICACIÓN DE VARIABLES:
- Variables booleanas: 1 = Sí, 0 = No
- Valores faltantes: celda vacía
- Encoding: UTF-8 con BOM

Generado automáticamente por Sistema TxH
`;

    archive.append(readme, { name: 'LEAME.txt' });

    await archive.finalize();

    logger.info(`SPSS bundle exported successfully - ${metadata.totalCases} cases`);
  } catch (error) {
    logger.error('Error exporting SPSS bundle:', error);
    res.status(500).json({
      error: 'Failed to generate SPSS bundle',
      message: error.message,
    });
  }
}

/**
 * Get data dictionary for export
 * GET /api/exports/data-dictionary
 */
async function getDataDictionary(req, res) {
  try {
    const dictionary = csvService.DATA_DICTIONARY;

    // Format as readable text
    let text = 'DICCIONARIO DE DATOS - Sistema de Registro Anestesiológico TxH\n';
    text += '='.repeat(70) + '\n\n';
    text += `Generado: ${new Date().toLocaleString('es-UY')}\n`;
    text += `Total de variables: ${Object.keys(dictionary).length}\n\n`;
    text += '='.repeat(70) + '\n\n';

    for (const [key, info] of Object.entries(dictionary)) {
      text += `VARIABLE: ${key}\n`;
      text += `-`.repeat(50) + '\n';
      text += `  Etiqueta: ${info.label}\n`;
      text += `  Tipo: ${info.type}\n`;
      if (info.unit) text += `  Unidad: ${info.unit}\n`;
      if (info.description) text += `  Descripción: ${info.description}\n`;
      if (info.values) text += `  Valores: ${JSON.stringify(info.values)}\n`;
      text += '\n';
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="diccionario-datos.txt"');

    res.send(text);
  } catch (error) {
    logger.error('Error generating data dictionary:', error);
    res.status(500).json({
      error: 'Failed to generate data dictionary',
      message: error.message,
    });
  }
}

module.exports = {
  exportCasePDF,
  exportCaseCSV,
  exportMultipleCasesCSV,
  emailCasePDF,
  exportPreopPDF,
  emailPreopPDF,
  exportProcedurePDF,
  emailProcedurePDF,
  // SPSS exports
  getSPSSProfiles,
  exportSPSS,
  getSPSSSyntax,
  exportSPSSBundle,
  getDataDictionary,
};
