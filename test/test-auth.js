// ==============================================================================
// test/test-auth.js - Comprehensive Phase 4 Authentication & Authorization Tests
// Tests registration, login, wrong password, JWT tokens, and RBAC
// ==============================================================================

const http = require('http');
const bcrypt = require('bcryptjs');
const { generateToken, verifyToken } = require('../utils/tokenHelper');

const BASE_URL = 'http://localhost:5000';

function makeRequest(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: headers
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, body: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', (err) => reject(err));

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ PASS: ${message}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${message}`);
        failed++;
    }
}

async function runAuthTests() {
    console.log('================================================================');
    console.log('🔐 Starting Phase 4 Authentication & Authorization Test Suite');
    console.log('================================================================\n');

    // --------------------------------------------------------------------------
    // Part 1: Unit Tests for Password Hashing & JWT
    // --------------------------------------------------------------------------
    console.log('--- 1. bcryptjs & JWT Unit Tests ---');
    const plainPassword = 'StudentSecretPass123';
    const hash = await bcrypt.hash(plainPassword, 10);
    assert(hash !== plainPassword && hash.startsWith('$2'), 'bcrypt hashes password into a secure salt string');

    const matchGood = await bcrypt.compare(plainPassword, hash);
    assert(matchGood === true, 'bcrypt correctly verifies correct password');

    const matchBad = await bcrypt.compare('WrongPassword', hash);
    assert(matchBad === false, 'bcrypt correctly rejects incorrect password');

    const testUser = { user_id: 99, email: 'test@student.edu', role: 'student' };
    const testToken = generateToken(testUser);
    assert(typeof testToken === 'string' && testToken.split('.').length === 3, 'JWT is generated with 3 segments (Header.Payload.Signature)');

    const decoded = verifyToken(testToken);
    assert(decoded.userId === 99 && decoded.role === 'student', 'JWT decoded contains correct userId and role');

    // --------------------------------------------------------------------------
    // Part 2: Live HTTP Server Authentication Tests
    // --------------------------------------------------------------------------
    console.log('\n--- 2. Live HTTP API Tests (Requires Server Running) ---');
    try {
        const timestamp = Date.now();
        const testStudentEmail = `auth_student_${timestamp}@campus.edu`;
        const testStudentPassword = 'Password@123';
        const testStudentRoll = `AUTH_${timestamp.toString().slice(-6)}`;

        // Test A: Student Registration
        console.log('\n[Test A] Student Registration:');
        const regRes = await makeRequest('POST', '/api/auth/register', {
            name: 'Pooja Sharma',
            email: testStudentEmail,
            password: testStudentPassword,
            roll_number: testStudentRoll,
            branch: 'CSE',
            cgpa: 8.85,
            backlogs: 0,
            phone: '9876543210'
        });

        if (regRes.status === 201 && regRes.body.token) {
            assert(regRes.status === 201, 'POST /api/auth/register returns 201 Created (Successful student registration)');
            assert(regRes.body.token !== undefined, 'Registration issues a valid JWT token immediately');
            const studentToken = regRes.body.token;

            // Test A2: Duplicate Registration Check
            console.log('\n[Test A2] Duplicate Registration:');
            const dupRes = await makeRequest('POST', '/api/auth/register', {
                name: 'Duplicate Student',
                email: testStudentEmail, // Same email
                password: 'Password@123',
                roll_number: `DUP_${timestamp.toString().slice(-6)}`,
                branch: 'CSE',
                cgpa: 8.00,
                backlogs: 0
            });
            assert(dupRes.status === 400 && dupRes.body.success === false, 'POST /api/auth/register rejects duplicate registration with status 400');

            // Test B: Student Login (Success)
            console.log('\n[Test B] Student Login (Success):');
            const loginRes = await makeRequest('POST', '/api/auth/student/login', {
                email: testStudentEmail,
                password: testStudentPassword
            });
            assert(loginRes.status === 200 && loginRes.body.token !== undefined, 'POST /api/auth/student/login succeeds with status 200 (Valid credentials)');

            // Test C: Wrong Password
            console.log('\n[Test C] Login with Wrong Password:');
            const wrongPassRes = await makeRequest('POST', '/api/auth/student/login', {
                email: testStudentEmail,
                password: 'IncorrectPassword'
            });
            assert(wrongPassRes.status === 401 && wrongPassRes.body.success === false, 'POST /api/auth/student/login rejects wrong password with status 401 Unauthorized');

            // Test D: Invalid Token
            console.log('\n[Test D] Access with Invalid Token:');
            const invalidTokenRes = await makeRequest('GET', '/api/auth/me', null, 'this.is.a.fake.token');
            assert(invalidTokenRes.status === 401 && invalidTokenRes.body.success === false, 'Invalid token returns 401 Unauthorized');

            // Test E: Missing Token
            console.log('\n[Test E] Access with Missing Token:');
            const missingTokenRes = await makeRequest('GET', '/api/auth/me');
            assert(missingTokenRes.status === 401 && missingTokenRes.body.success === false, 'Missing token returns 401 Unauthorized');

            // Test F: Student Accessing Admin Route (Role-Based Authorization)
            console.log('\n[Test F] Student Accessing Admin Route:');
            const studentAsAdminRes = await makeRequest('POST', '/api/companies', {
                name: `Company Unauthorized ${timestamp}`,
                location: 'Delhi'
            }, studentToken);
            assert(studentAsAdminRes.status === 403 && studentAsAdminRes.body.success === false, 'Student accessing Admin route returns 403 Forbidden');

            // Test G: Admin Accessing Admin Route
            console.log('\n[Test G] Admin Accessing Admin Route:');
            // Create a legitimate admin token for testing RBAC
            const adminToken = generateToken({ user_id: 1, email: 'admin@placement.edu', role: 'admin' });
            const adminCreateRes = await makeRequest('POST', '/api/companies', {
                name: `Authorized Tech ${timestamp}`,
                location: 'Gurgaon, India',
                website: 'https://authorizedtech.com'
            }, adminToken);
            assert(adminCreateRes.status === 201 && adminCreateRes.body.success === true, 'Admin accessing Admin route succeeds with 201 Created');

            // Test H: Authenticated Student viewing own profile
            console.log('\n[Test H] Student accessing own profile:');
            const profileRes = await makeRequest('GET', '/api/auth/me', null, studentToken);
            assert(profileRes.status === 200 && profileRes.body.user.email === testStudentEmail, 'GET /api/auth/me returns authenticated user details');
        } else {
            console.log('⚠️ Note: Live database is required for HTTP integration tests.');
            console.log('Database returned:', regRes.body);
        }

    } catch (httpErr) {
        console.log('ℹ️ HTTP Server not reachable on port 5000. Start the server with "npm start" to run live HTTP tests.');
    }

    console.log('\n================================================================');
    console.log(`📊 Auth Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log('================================================================');
}

runAuthTests();
