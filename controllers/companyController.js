// ==============================================================================
// controllers/companyController.js - Company Management Controller
// Handles CRUD operations for companies visiting for campus placement
// ==============================================================================

const { pool } = require('../config/db');

// @desc    Get all companies
// @route   GET /api/companies
// @access  Public
const getAllCompanies = async (req, res) => {
    try {
        const [companies] = await pool.query('SELECT * FROM companies ORDER BY name ASC');
        res.status(200).json({
            success: true,
            count: companies.length,
            companies
        });
    } catch (error) {
        console.error('Error fetching companies:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching companies',
            error: error.message
        });
    }
};

// @desc    Get single company by ID
// @route   GET /api/companies/:id
// @access  Public
const getCompanyById = async (req, res) => {
    try {
        const companyId = parseInt(req.params.id, 10);

        if (isNaN(companyId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid company ID parameter'
            });
        }

        const [rows] = await pool.query('SELECT * FROM companies WHERE company_id = ?', [companyId]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Company not found with ID ${companyId}`
            });
        }

        res.status(200).json({
            success: true,
            company: rows[0]
        });
    } catch (error) {
        console.error('Error fetching company by ID:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching company details',
            error: error.message
        });
    }
};

// @desc    Create a new company
// @route   POST /api/companies
// @access  Public
const createCompany = async (req, res) => {
    try {
        const { name, website, location, industry, description, contact_email } = req.body;

        // Validation: Company name is required
        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Company name is required'
            });
        }

        // Check if company already exists
        const [existing] = await pool.query('SELECT company_id FROM companies WHERE name = ?', [name.trim()]);
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'A company with this name already exists'
            });
        }

        const [result] = await pool.query(
            'INSERT INTO companies (name, website, location, industry, description, contact_email) VALUES (?, ?, ?, ?, ?, ?)',
            [name.trim(), website || null, location || null, industry || null, description || null, contact_email || null]
        );

        res.status(201).json({
            success: true,
            message: 'Company created successfully',
            company: {
                company_id: result.insertId,
                name: name.trim(),
                website,
                location,
                industry,
                description,
                contact_email
            }
        });
    } catch (error) {
        console.error('Error creating company:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while creating company',
            error: error.message
        });
    }
};

// @desc    Update a company
// @route   PUT /api/companies/:id
// @access  Public
const updateCompany = async (req, res) => {
    try {
        const companyId = parseInt(req.params.id, 10);

        if (isNaN(companyId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid company ID parameter'
            });
        }

        // Check if company exists
        const [existing] = await pool.query('SELECT company_id FROM companies WHERE company_id = ?', [companyId]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Company not found with ID ${companyId}`
            });
        }

        const { name, website, location, industry, description, contact_email } = req.body;

        const updates = [];
        const params = [];

        if (name !== undefined) {
            updates.push('name = ?');
            params.push(name.trim());
        }
        if (website !== undefined) {
            updates.push('website = ?');
            params.push(website);
        }
        if (location !== undefined) {
            updates.push('location = ?');
            params.push(location);
        }
        if (industry !== undefined) {
            updates.push('industry = ?');
            params.push(industry);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            params.push(description);
        }
        if (contact_email !== undefined) {
            updates.push('contact_email = ?');
            params.push(contact_email);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide at least one field to update'
            });
        }

        params.push(companyId);
        await pool.query(`UPDATE companies SET ${updates.join(', ')} WHERE company_id = ?`, params);

        const [updatedRows] = await pool.query('SELECT * FROM companies WHERE company_id = ?', [companyId]);

        res.status(200).json({
            success: true,
            message: 'Company updated successfully',
            company: updatedRows[0]
        });
    } catch (error) {
        console.error('Error updating company:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while updating company',
            error: error.message
        });
    }
};

// @desc    Delete a company where safe and appropriate
// @route   DELETE /api/companies/:id
// @access  Public
const deleteCompany = async (req, res) => {
    try {
        const companyId = parseInt(req.params.id, 10);

        if (isNaN(companyId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid company ID parameter'
            });
        }

        // Check if company exists
        const [existing] = await pool.query('SELECT * FROM companies WHERE company_id = ?', [companyId]);
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Company not found with ID ${companyId}`
            });
        }

        // Delete company (ON DELETE CASCADE in MySQL handles linked jobs & applications)
        await pool.query('DELETE FROM companies WHERE company_id = ?', [companyId]);

        res.status(200).json({
            success: true,
            message: `Company "${existing[0].name}" and its associated jobs/applications were deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting company:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting company',
            error: error.message
        });
    }
};

module.exports = {
    getAllCompanies,
    getCompanyById,
    createCompany,
    updateCompany,
    deleteCompany
};
