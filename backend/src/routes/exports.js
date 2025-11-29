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
  authorize('ADMIN', 'ANESTESIOLOGO', 'VIEWER'),
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
  authorize('ADMIN', 'ANESTESIOLOGO', 'VIEWER'),
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
  authorize('ADMIN', 'VIEWER'),
  exportsController.exportMultipleCasesCSV
);

/**
 * Email case PDF to distribution list
 * POST /api/exports/case/:id/email
 *
 * Body:
 * {
 *   "recipients": ["email1@example.com", "email2@example.com"] // Optional
 * }
 *
 * Roles: admin, anestesiologo
 *
 * Example:
 * POST /api/exports/case/123/email
 * { "recipients": ["doctor@hospital.uy"] }
 *
 * Response: { success: true, message: "PDF sent successfully", recipients: 1 }
 */
router.post(
  '/case/:id/email',
  authorize('ADMIN', 'ANESTESIOLOGO'),
  exportsController.emailCasePDF
);

// ============================================================================
// PREOP EVALUATION EXPORTS
// ============================================================================

/**
 * Export preop evaluation as PDF
 * GET /api/exports/preop/:id/pdf
 *
 * Roles: admin, anestesiologo, viewer
 *
 * Example: GET /api/exports/preop/clxx123abc/pdf
 * Response: PDF file download
 */
router.get(
  '/preop/:id/pdf',
  authorize('ADMIN', 'ANESTESIOLOGO', 'VIEWER'),
  exportsController.exportPreopPDF
);

/**
 * Email preop evaluation PDF to distribution list
 * POST /api/exports/preop/:id/email
 *
 * Body:
 * {
 *   "recipients": ["email1@example.com", "email2@example.com"] // Optional
 * }
 *
 * Roles: admin, anestesiologo
 *
 * Example:
 * POST /api/exports/preop/clxx123abc/email
 * { "recipients": ["doctor@hospital.uy"] }
 *
 * Response: { success: true, message: "PDF enviado exitosamente", recipients: 1 }
 */
router.post(
  '/preop/:id/email',
  authorize('ADMIN', 'ANESTESIOLOGO'),
  exportsController.emailPreopPDF
);

// ============================================================================
// PROCEDURE EXPORTS
// ============================================================================

/**
 * Export procedure as PDF
 * GET /api/exports/procedure/:id/pdf
 *
 * Roles: admin, anestesiologo, viewer
 *
 * Example: GET /api/exports/procedure/clxx123abc/pdf
 * Response: PDF file download
 */
router.get(
  '/procedure/:id/pdf',
  authorize('ADMIN', 'ANESTESIOLOGO', 'VIEWER'),
  exportsController.exportProcedurePDF
);

/**
 * Email procedure PDF to distribution list
 * POST /api/exports/procedure/:id/email
 *
 * Body:
 * {
 *   "recipients": ["email1@example.com", "email2@example.com"] // Optional
 * }
 *
 * Roles: admin, anestesiologo
 *
 * Example:
 * POST /api/exports/procedure/clxx123abc/email
 * { "recipients": ["doctor@hospital.uy"] }
 *
 * Response: { success: true, message: "PDF enviado exitosamente", recipients: 1 }
 */
router.post(
  '/procedure/:id/email',
  authorize('ADMIN', 'ANESTESIOLOGO'),
  exportsController.emailProcedurePDF
);

module.exports = router;
