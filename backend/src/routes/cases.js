// src/routes/cases.js - Rutas de casos de trasplante
const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const linesMonitoringController = require('../controllers/linesMonitoringController');
const { authenticate, authorize, ROLES } = require('../middlewares/auth');

router.get('/', authenticate, caseController.getAllCases);
router.get('/:id', authenticate, caseController.getCaseById);
router.get('/:id/team', authenticate, caseController.getCaseTeam);
router.get('/:id/preop', authenticate, caseController.getCasePreop);
router.get('/:id/intraop', authenticate, caseController.getCaseIntraop);
router.get('/:id/fluids', authenticate, caseController.getCaseFluids);
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  caseController.createCase
);
router.put(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  caseController.updateCase
);
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), caseController.deleteCase);

// Team management routes
router.post(
  '/:id/team',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  caseController.addTeamMember
);
router.delete(
  '/:id/team/:teamAssignmentId',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  caseController.removeTeamMember
);

// Lines and monitoring routes
router.get(
  '/:caseId/lines-monitoring',
  authenticate,
  linesMonitoringController.getLinesMonitoring
);
router.post(
  '/:caseId/lines-monitoring',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  linesMonitoringController.createLinesMonitoring
);
router.put(
  '/:caseId/lines-monitoring',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.ANESTESIOLOGO),
  linesMonitoringController.updateLinesMonitoring
);
router.delete(
  '/:caseId/lines-monitoring',
  authenticate,
  authorize(ROLES.ADMIN),
  linesMonitoringController.deleteLinesMonitoring
);

module.exports = router;
