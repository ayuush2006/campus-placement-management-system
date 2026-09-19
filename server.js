// ==============================================================================
// Campus Placement Management System - Backend Server
// Phase 1: Basic Server Setup & Health Check API
// ==============================================================================

// 1. Import necessary libraries
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// 2. Load environment variables from the .env file into process.env
dotenv.config();

// 3. Initialize the Express application instance
const app = express();

// 4. Define the port number (reads PORT from .env, or defaults to 5000)
const PORT = process.env.PORT || 5000;

// ==============================================================================
// Middlewares
// ==============================================================================

// Enable Cross-Origin Resource Sharing (CORS) so clients from different origins can connect
app.use(cors());

// Enable parsing of JSON data in the body of incoming HTTP requests (req.body)
app.use(express.json());

// Serve static frontend files (HTML, CSS, JS) from the 'frontend' directory
app.use(express.static(path.join(__dirname, 'frontend')));

// ==============================================================================
// Routes
// ==============================================================================

// Health-Check Route:
// GET /api/health
// Used to test if the backend server is up, running, and accessible.
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Campus Placement API is running'
    });
});

// Fallback Route for Undefined API Endpoints
app.use('/api', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// ==============================================================================
// Start Server
// ==============================================================================

// Start listening for incoming network requests on the specified PORT
app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🚀 Campus Placement Server is running on port ${PORT}`);
    console.log(`🌐 Frontend UI:  http://localhost:${PORT}`);
    console.log(`🩺 Health Check: http://localhost:${PORT}/api/health`);
    console.log('====================================================');
});
