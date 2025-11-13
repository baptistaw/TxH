// src/routes/cases.js - Rutas de casos de trasplante
const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const { authenticate, authorize, ROLES } = require('../middlewares/auth');

router.get('/', authenticate, caseController.getAllCases);
router.get('/:id', authenticate, caseController.getCaseById);
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

module.exports = router;
