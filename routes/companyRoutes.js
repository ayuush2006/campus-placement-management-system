// ==============================================================================
// routes/companyRoutes.js - Company API Routes
// Maps HTTP requests to company controller functions
// Base Path: /api/companies
// ==============================================================================

const express = require('express');
const router = express.Router();
const {
    getAllCompanies,
    getCompanyById,
    createCompany,
    updateCompany,
    deleteCompany
} = require('../controllers/companyController');

// GET /api/companies - Get all companies
router.get('/', getAllCompanies);

// GET /api/companies/:id - Get single company by ID
router.get('/:id', getCompanyById);

// POST /api/companies - Create a new company
router.post('/', createCompany);

// PUT /api/companies/:id - Update company by ID
router.put('/:id', updateCompany);

// DELETE /api/companies/:id - Delete company by ID
router.delete('/:id', deleteCompany);

module.exports = router;
