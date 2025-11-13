// src/controllers/caseController.js - Controladores de casos
const caseService = require('../services/caseService');
const { asyncHandler } = require('../middlewares/errorHandler');

const getAllCases = asyncHandler(async (req, res) => {
  const { page, limit, patientId, startDate, endDate } = req.query;
  const result = await caseService.getAllCases({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    patientId,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  });
  res.json(result);
});

const getCaseById = asyncHandler(async (req, res) => {
  const transplantCase = await caseService.getCaseById(req.params.id);
  res.json(transplantCase);
});

const createCase = asyncHandler(async (req, res) => {
  const transplantCase = await caseService.createCase(req.body);
  res.status(201).json(transplantCase);
});

const updateCase = asyncHandler(async (req, res) => {
  const transplantCase = await caseService.updateCase(req.params.id, req.body);
  res.json(transplantCase);
});

const deleteCase = asyncHandler(async (req, res) => {
  await caseService.deleteCase(req.params.id);
  res.status(204).send();
});

module.exports = { getAllCases, getCaseById, createCase, updateCase, deleteCase };
