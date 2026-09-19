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

const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

// GET /api/companies - Get all companies (Public)
router.get('/', getAllCompanies);

// GET /api/companies/:id - Get single company by ID (Public)
router.get('/:id', getCompanyById);

// POST /api/companies - Create a new company (Admin Only)
router.post('/', authenticateToken, requireAdmin, createCompany);

// PUT /api/companies/:id - Update company by ID (Admin Only)
router.put('/:id', authenticateToken, requireAdmin, updateCompany);

// DELETE /api/companies/:id - Delete company by ID (Admin Only)
router.delete('/:id', authenticateToken, requireAdmin, deleteCompany);

module.exports = router;
