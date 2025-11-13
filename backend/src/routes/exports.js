// backend/src/routes/exports.js
/**
 * Exports Routes
 * API endpoints for PDF and CSV exports
 */

const express = require('express');
const router = express.Router();
const exportsController = require('../controllers/exportsController');
const { authenticate, authorize } = require('../middlewares/auth');

/**
 * All export routes require authentication
 */
router.use(authenticate);

/**
 * Export single case as PDF
 * GET /api/exports/case/:id/pdf
 *
 * Roles: admin, anestesiologo, data-analyst
 *
 * Example: GET /api/exports/case/123/pdf
 * Response: PDF file download
 */
router.get(
  '/case/:id/pdf',
  authorize(['admin', 'anestesiologo', 'data-analyst']),
  exportsController.exportCasePDF
);

/**
 * Export single case as CSV
 * GET /api/exports/case/:id/csv
 *
 * Query params:
 * - format: 'complete' | 'summary' | 'intraop' (default: 'complete')
 *
 * Roles: admin, anestesiologo, data-analyst
 *
 * Examples:
 * - GET /api/exports/case/123/csv (complete format with all intraop records)
 * - GET /api/exports/case/123/csv?format=summary (one row summary)
 * - GET /api/exports/case/123/csv?format=intraop (only intraop records)
 *
 * Response: CSV file download
 */
router.get(
  '/case/:id/csv',
  authorize(['admin', 'anestesiologo', 'data-analyst']),
  exportsController.exportCaseCSV
);

/**
 * Export multiple cases as CSV (batch)
 * POST /api/exports/cases/csv
 *
 * Body:
 * {
 *   "caseIds": [1, 2, 3],
 *   "format": "complete" | "summary" | "intraop"
 * }
 *
 * Roles: admin, data-analyst
 *
 * Example:
 * POST /api/exports/cases/csv
 * {
 *   "caseIds": [123, 124, 125],
 *   "format": "summary"
 * }
 *
 * Response: Combined CSV file download
 */
router.post(
  '/cases/csv',
  authorize(['admin', 'data-analyst']),
  exportsController.exportMultipleCasesCSV
);

module.exports = router;
