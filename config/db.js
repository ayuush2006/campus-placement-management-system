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
// Support standard DB_* environment variables or Railway's MYSQL* / DATABASE_URL environment variables
const dbHost = process.env.DB_HOST || process.env.MYSQLHOST || 'localhost';
const dbUser = process.env.DB_USER || process.env.MYSQLUSER || 'root';
const dbPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : (process.env.MYSQLPASSWORD !== undefined ? process.env.MYSQLPASSWORD : '');
const dbName = process.env.DB_NAME || process.env.MYSQLDATABASE || 'campus_placement_db';
const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : (process.env.MYSQLPORT ? parseInt(process.env.MYSQLPORT, 10) : 3306);

const poolConfig = (process.env.MYSQL_URL || process.env.DATABASE_URL) ? (process.env.MYSQL_URL || process.env.DATABASE_URL) : {
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    port: dbPort,
    waitForConnections: true,
    connectionLimit: 10,       // Maximum active connections at any given time
    queueLimit: 0,             // Unlimited queue length for waiting requests
    multipleStatements: true   // Allows running batch SQL scripts (useful for setup/seeds)
};

const pool = mysql.createPool(poolConfig);

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
