// ==============================================================================
// config/initDb.js - Script to initialize Database Schema & Sample Data
// ==============================================================================

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function initializeDatabase() {
    console.log('====================================================');
    console.log('🚀 Initializing Campus Placement Database...');
    console.log('====================================================');

    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
        multipleStatements: true
    };

    let connection;

    try {
        // Step 1: Connect to MySQL server (without selecting database)
        console.log(`📡 Connecting to MySQL server at ${dbConfig.host}:${dbConfig.port} as user "${dbConfig.user}"...`);
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL server.');

        // Step 2: Read and execute schema.sql
        const schemaPath = path.join(__dirname, '..', 'schema.sql');
        console.log('📄 Reading schema.sql...');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('⚙️  Creating database and tables...');
        await connection.query(schemaSql);
        console.log('✅ Database "campus_placement_db" and tables created successfully:');
        console.log('   - users');
        console.log('   - student_profiles');
        console.log('   - companies');
        console.log('   - jobs');
        console.log('   - applications');

        // Step 3: Read and execute seed.sql
        const seedPath = path.join(__dirname, '..', 'seed.sql');
        console.log('🌱 Reading seed.sql...');
        const seedSql = fs.readFileSync(seedPath, 'utf8');

        console.log('📥 Inserting sample development data...');
        await connection.query(seedSql);
        console.log('✅ Sample data seeded successfully!');

        console.log('====================================================');
        console.log('🎉 Database setup complete! You are ready for Phase 2 testing.');
        console.log('====================================================');
    } catch (error) {
        console.error('\n❌ Database initialization failed:');
        console.error(error.message);
        console.log('\n💡 Troubleshooting Tips:');
        console.log('1. Make sure your MySQL service is running (e.g. MySQL80).');
        console.log('2. Check your DB_PASSWORD in the .env file.');
        console.log('3. Verify DB_USER and DB_PORT (default is 3306).\n');
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the initialization
initializeDatabase();
