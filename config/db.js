// ==============================================================================
// config/db.js - MySQL Database Connection Pool Configuration
// ==============================================================================

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();

// Create a connection pool.
// A connection pool maintains a cache of database connections so that connections
// can be reused across different requests without the overhead of reconnecting.
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'campus_placement_db',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    waitForConnections: true,
    connectionLimit: 10,       // Maximum active connections at any given time
    queueLimit: 0,             // Unlimited queue length for waiting requests
    multipleStatements: true   // Allows running batch SQL scripts (useful for setup/seeds)
});

// Helper function to test database connectivity
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL database successfully!');
        connection.release();
        return { success: true, message: 'Connected to MySQL database successfully' };
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    pool,
    testConnection
};
