// backend/src/controllers/exportsController.js
/**
 * Exports Controller
 * Handles PDF and CSV export requests
 */

const pdfService = require('../services/pdfService');
const csvService = require('../services/csvService');
const logger = require('../lib/logger');

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

    // Add UTF-8 BOM for Excel compatibility
    res.write('\ufeff');
    res.send(csv);

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

    // Add UTF-8 BOM for Excel compatibility
    res.write('\ufeff');
    res.send(combinedCSV);

    logger.info(`Successfully exported ${caseIds.length} cases as CSV (${format})`);
  } catch (error) {
    logger.error('Error exporting multiple cases CSV:', error);

    res.status(500).json({
      error: 'Failed to generate CSV',
      message: error.message,
    });
  }
}

module.exports = {
  exportCasePDF,
  exportCaseCSV,
  exportMultipleCasesCSV,
};
