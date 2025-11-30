// src/routes/cases.js - Rutas de casos de trasplante
const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const linesMonitoringController = require('../controllers/linesMonitoringController');
const { authenticate, authorize, ROLES } = require('../middlewares/auth');
const { tenantMiddleware } = require('../middlewares/tenant');

// Todas las rutas de casos requieren autenticación y organización
router.get('/', authenticate, tenantMiddleware, caseController.getAllCases);
router.get('/:id', authenticate, tenantMiddleware, caseController.getCaseById);
router.get('/:id/team', authenticate, tenantMiddleware, caseController.getCaseTeam);
router.get('/:id/preop', authenticate, tenantMiddleware, caseController.getCasePreop);
router.get('/:id/intraop', authenticate, tenantMiddleware, caseController.getCaseIntraop);
router.get('/:id/fluids', authenticate, tenantMiddleware, caseController.getCaseFluids);
router.post(
  '/',
  authenticate,
  tenantMiddleware,
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  caseController.createCase
);
router.put(
  '/:id',
  authenticate,
  tenantMiddleware,
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  caseController.updateCase
);
router.delete('/:id', authenticate, tenantMiddleware, authorize(ROLES.ADMIN), caseController.deleteCase);

// Team management routes
router.post(
  '/:id/team',
  authenticate,
  tenantMiddleware,
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  caseController.addTeamMember
);
router.delete(
  '/:id/team/:teamAssignmentId',
  authenticate,
  tenantMiddleware,
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  caseController.removeTeamMember
);

// Lines and monitoring routes
router.get(
  '/:caseId/lines-monitoring',
  authenticate,
  tenantMiddleware,
  linesMonitoringController.getLinesMonitoring
);
router.post(
  '/:caseId/lines-monitoring',
  authenticate,
  tenantMiddleware,
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  linesMonitoringController.createLinesMonitoring
);
router.put(
  '/:caseId/lines-monitoring',
  authenticate,
  tenantMiddleware,
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  linesMonitoringController.updateLinesMonitoring
);
router.delete(
  '/:caseId/lines-monitoring',
  authenticate,
  tenantMiddleware,
  authorize(ROLES.ADMIN),
  linesMonitoringController.deleteLinesMonitoring
);

module.exports = router;
