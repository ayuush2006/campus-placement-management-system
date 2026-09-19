// ==============================================================================
// test/test-student.js - Automated Tests for Phase 5 Student Module
// Tests Eligibility Logic, Duplicate Prevention, and Student Dashboard
// ==============================================================================

const http = require('http');
const { checkEligibility } = require('../utils/eligibilityHelper');
const { generateToken } = require('../utils/tokenHelper');

const BASE_URL = 'http://localhost:5000';

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

function makeRequest(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: headers
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runStudentTests() {
    console.log('================================================================');
    console.log('🎓 Starting Phase 5 Student Module Test Suite');
    console.log('================================================================\n');

    // --------------------------------------------------------------------------
    // Part 1: Eligibility Engine Unit Tests
    // --------------------------------------------------------------------------
    console.log('--- 1. Eligibility Logic Unit Tests ---');

    const sampleJob = {
        title: 'Google SDE-1',
        minimum_cgpa: 8.00,
        allowed_branch: 'CSE,IT,ECE',
        maximum_backlogs: 0
    };

    // Case 1: Fully Eligible Student
    const eligibleStudent = { name: 'Rahul', cgpa: 8.50, branch: 'CSE', backlogs: 0 };
    const res1 = checkEligibility(eligibleStudent, sampleJob);
    assert(res1.eligible === true && res1.reasons.length === 0, 'Eligible student (8.5 CGPA, CSE, 0 backlogs) returns eligible: true');

    // Case 2: Low CGPA
    const lowCgpaStudent = { name: 'Sneha', cgpa: 7.20, branch: 'CSE', backlogs: 0 };
    const res2 = checkEligibility(lowCgpaStudent, sampleJob);
    assert(res2.eligible === false && res2.reasons.some(r => r.includes('CGPA')), 'Low CGPA student (7.2 vs 8.0) fails with CGPA reason');

    // Case 3: Disallowed Branch
    const wrongBranchStudent = { name: 'Vikas', cgpa: 8.80, branch: 'MECH', backlogs: 0 };
    const res3 = checkEligibility(wrongBranchStudent, sampleJob);
    assert(res3.eligible === false && res3.reasons.some(r => r.includes('Branch')), 'Wrong branch student (MECH vs CSE,IT,ECE) fails with Branch reason');

    // Case 4: Backlogs exceeded
    const backlogsStudent = { name: 'Kunal', cgpa: 8.50, branch: 'IT', backlogs: 2 };
    const res4 = checkEligibility(backlogsStudent, sampleJob);
    assert(res4.eligible === false && res4.reasons.some(r => r.includes('Backlogs')), 'Student with backlogs (2 vs max 0) fails with Backlogs reason');

    // Case 5: Multiple Failures
    const multiFailStudent = { name: 'Amit', cgpa: 6.20, branch: 'CIVIL', backlogs: 3 };
    const res5 = checkEligibility(multiFailStudent, sampleJob);
    assert(res5.eligible === false && res5.reasons.length === 3, 'Student with 3 failed criteria returns all 3 failure reasons in array');

    // Case 6: Open Branch ('ALL')
    const openJob = { title: 'TCS Digital', minimum_cgpa: 6.50, allowed_branch: 'ALL', maximum_backlogs: 1 };
    const civilStudent = { name: 'Ravi', cgpa: 7.00, branch: 'CIVIL', backlogs: 0 };
    const res6 = checkEligibility(civilStudent, openJob);
    assert(res6.eligible === true, 'Student from any branch is eligible when allowed_branch is "ALL"');

    // --------------------------------------------------------------------------
    // Part 2: HTTP Integration Tests (when server & DB are running)
    // --------------------------------------------------------------------------
    console.log('\n--- 2. HTTP Server Endpoint Tests ---');
    try {
        const studentToken = generateToken({ user_id: 2, email: 'rahul@student.edu', role: 'student' });

        // Test A: Student Dashboard
        const dashRes = await makeRequest('GET', '/api/students/dashboard?studentId=2', null, studentToken);
        if (dashRes.status === 200) {
            assert(dashRes.body.success === true, 'GET /api/students/dashboard returns 200');
            assert(dashRes.body.dashboard.student !== undefined, 'Dashboard contains student profile');
            assert(dashRes.body.dashboard.stats !== undefined, 'Dashboard contains application statistics');
            assert(Array.isArray(dashRes.body.dashboard.jobs), 'Dashboard contains annotated jobs feed');

            // Test B: Check Eligibility Endpoint
            const eligRes = await makeRequest('GET', '/api/applications/check-eligibility/1?studentId=2', null, studentToken);
            assert(eligRes.status === 200, 'GET /api/applications/check-eligibility/:jobId returns 200');
            assert(eligRes.body.eligible !== undefined, 'Eligibility check returns boolean status and reasons');

            // Test C: View My Applications
            const myAppsRes = await makeRequest('GET', '/api/applications/my-applications?studentId=2', null, studentToken);
            assert(myAppsRes.status === 200 && Array.isArray(myAppsRes.body.applications), 'GET /api/applications/my-applications returns student history');
        } else {
            console.log('ℹ️ HTTP Server returned:', dashRes.body.message || dashRes.status);
            console.log('💡 Live database needed for HTTP endpoints. Start MySQL and run "npm start".');
        }
    } catch (httpErr) {
        console.log('ℹ️ Server not reachable on port 5000. Start with "npm start" for live HTTP tests.');
    }

    console.log('\n================================================================');
    console.log(`📊 Student Module Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log('================================================================');
}

runStudentTests();
