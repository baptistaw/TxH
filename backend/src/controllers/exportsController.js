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

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="caso-${id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.send(pdfBuffer);

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

    // Get preop info for filename
    const preop = await prisma.preopEvaluation.findUnique({
      where: { id },
      include: { patient: true },
    });

    const patientName = preop?.patient?.name?.replace(/\s+/g, '_') || 'paciente';

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="evaluacion-pretrasplante-${patientName}-${id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.send(pdfBuffer);

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

    // Get procedure info for filename
    const procedure = await prisma.procedure.findUnique({
      where: { id },
      include: { patient: true },
    });

    const patientName = procedure?.patient?.name?.replace(/\s+/g, '_') || 'paciente';

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="procedimiento-${patientName}-${id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.send(pdfBuffer);

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

module.exports = {
  exportCasePDF,
  exportCaseCSV,
  exportMultipleCasesCSV,
  emailCasePDF,
  exportPreopPDF,
  emailPreopPDF,
  exportProcedurePDF,
  emailProcedurePDF,
};
