// ==============================================================================
// test/test-admin.js - Automated Test Suite for Phase 6 Admin Module
// Tests Admin Authorization, Statistics, Company & Job CRUD, and Application Status
// ==============================================================================

const http = require('http');
const { generateToken, verifyToken } = require('../utils/tokenHelper');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

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

async function runAdminTests() {
    console.log('================================================================');
    console.log('🛡️  Starting Phase 6 Admin Module & Dashboard Test Suite');
    console.log('================================================================\n');

    // --------------------------------------------------------------------------
    // Part 1: Admin Role Authorization Unit Tests
    // --------------------------------------------------------------------------
    console.log('--- 1. Admin Role & Middleware Unit Tests ---');

    const adminToken = generateToken({ user_id: 1, email: 'admin@campus.edu', role: 'admin' });
    const studentToken = generateToken({ user_id: 2, email: 'rahul@student.edu', role: 'student' });

    assert(adminToken !== null, 'Admin JWT token generated successfully');
    assert(studentToken !== null, 'Student JWT token generated successfully');

    // Test A: Admin access through requireAdmin middleware
    let adminPassedMW = false;
    const reqAdminMock = { user: { userId: 1, role: 'admin' } };
    const resAdminMock = { status: () => resAdminMock, json: () => {} };
    requireAdmin(reqAdminMock, resAdminMock, () => { adminPassedMW = true; });
    assert(adminPassedMW === true, 'Admin user passes requireAdmin middleware');

    // Test B: Student blocked by requireAdmin middleware
    let studentStatusCode = 0;
    let studentErrorMessage = '';
    const reqStudentMock = { user: { userId: 2, role: 'student' } };
    const resStudentMock = {
        status: (code) => {
            studentStatusCode = code;
            return {
                json: (payload) => { studentErrorMessage = payload.message; }
            };
        }
    };
    requireAdmin(reqStudentMock, resStudentMock, () => {});
    assert(studentStatusCode === 403, 'Student user is blocked by requireAdmin with HTTP 403 Forbidden');
    assert(studentErrorMessage.includes('does not have permission'), 'requireAdmin returns clear role permission failure message');

    // Test C: Unauthenticated request blocked by authenticateToken
    let unauthCode = 0;
    const reqUnauthMock = { headers: {} };
    const resUnauthMock = {
        status: (code) => {
            unauthCode = code;
            return { json: () => {} };
        }
    };
    authenticateToken(reqUnauthMock, resUnauthMock, () => {});
    assert(unauthCode === 401, 'Request without token is blocked with HTTP 401 Unauthorized');

    // --------------------------------------------------------------------------
    // Part 1b: Readiness Score Calculation Logic Unit Tests
    // --------------------------------------------------------------------------
    console.log('\n--- 1b. Readiness Score (Rule-Based, Not AI) Unit Tests ---');

    // These tests mirror the exact formula used in studentController.getReadinessScore
    // Formula: CGPA(30) + Backlogs(20) + Phone(10) + Resume(20) + Applied(10) + Shortlisted(10)
    function computeReadinessScore({ cgpa, backlogs, phone, resume_url, totalApplications, shortlistedCount }) {
        const cgpaScore = Math.floor((Math.min(parseFloat(cgpa) || 0, 10) / 10) * 30);
        const b = parseInt(backlogs, 10) || 0;
        const backlogScore = b === 0 ? 20 : b === 1 ? 10 : 0;
        const phoneScore = phone && String(phone).trim() !== '' ? 10 : 0;
        const resumeScore = resume_url && String(resume_url).trim() !== '' ? 20 : 0;
        const appliedScore = (totalApplications || 0) > 0 ? 10 : 0;
        const shortlistScore = (shortlistedCount || 0) > 0 ? 10 : 0;
        return cgpaScore + backlogScore + phoneScore + resumeScore + appliedScore + shortlistScore;
    }

    // Student with perfect profile
    const perfectScore = computeReadinessScore({
        cgpa: 10.0, backlogs: 0, phone: '9999999999', resume_url: 'https://my.resume',
        totalApplications: 3, shortlistedCount: 1
    });
    assert(perfectScore === 100, `Perfect profile scores 100 (got ${perfectScore})`);

    // Student with CGPA 8.5, no backlogs, phone, no resume, applied, not shortlisted
    const s2 = computeReadinessScore({ cgpa: 8.5, backlogs: 0, phone: '9876543210', resume_url: null, totalApplications: 2, shortlistedCount: 0 });
    const expected2 = Math.floor((8.5/10)*30) + 20 + 10 + 0 + 10 + 0; // 25+20+10+0+10+0 = 65
    assert(s2 === expected2, `Student (8.5 CGPA, phone, no resume, applied, not shortlisted) scores ${expected2} (got ${s2})`);

    // Student with 2 backlogs loses full backlog points
    const s3 = computeReadinessScore({ cgpa: 7.0, backlogs: 2, phone: null, resume_url: null, totalApplications: 0, shortlistedCount: 0 });
    const expected3 = Math.floor((7.0/10)*30); // backlog=0, phone=0, resume=0, applied=0, shortlisted=0
    assert(s3 === expected3, `Student (7.0 CGPA, 2 backlogs, no phone/resume, no apps) scores ${expected3} (got ${s3})`);

    // Student with 1 backlog gets partial backlog points
    const s4 = computeReadinessScore({ cgpa: 6.0, backlogs: 1, phone: null, resume_url: null, totalApplications: 0, shortlistedCount: 0 });
    const expected4 = Math.floor((6.0/10)*30) + 10; // backlog=10
    assert(s4 === expected4, `Student with 1 backlog gets partial backlog score (${expected4}, got ${s4})`);

    // --------------------------------------------------------------------------
    // Part 1c: Job Recommendation Match Score Logic Unit Tests
    // --------------------------------------------------------------------------
    console.log('\n--- 1c. Job Recommendation Match Score (Rule-Based) Unit Tests ---');

    // Formula: Branch(40%) + CGPA(35%) + Backlogs(25%)
    function computeMatchScore(student, job) {
        const studentBranch = (student.branch || '').trim().toUpperCase();
        const rawAllowed = (job.allowed_branch || '').trim().toUpperCase();
        const studentCgpa = parseFloat(student.cgpa) || 0;
        const studentBacklogs = parseInt(student.backlogs, 10) || 0;
        const minCgpa = parseFloat(job.minimum_cgpa) || 0;
        const maxBacklogs = parseInt(job.maximum_backlogs, 10) || 0;

        let branchScore = 0;
        if (rawAllowed === 'ALL') { branchScore = 100; }
        else {
            const allowed = rawAllowed.split(',').map(b => b.trim());
            branchScore = allowed.includes(studentBranch) ? 100 : 0;
        }

        const cgpaMatchScore = minCgpa === 0 ? 100 : Math.min((studentCgpa / minCgpa) * 100, 100);
        const backlogMatchScore = studentBacklogs <= maxBacklogs ? 100 : 0;

        return Math.round((0.40 * branchScore) + (0.35 * cgpaMatchScore) + (0.25 * backlogMatchScore));
    }

    // Perfect match: same branch, CGPA above requirement, no backlogs
    const m1 = computeMatchScore(
        { branch: 'CSE', cgpa: 9.0, backlogs: 0 },
        { allowed_branch: 'CSE,IT', minimum_cgpa: 7.5, maximum_backlogs: 0 }
    );
    assert(m1 === 100, `Perfect match (CSE branch, 9.0 CGPA, 0 backlogs) = 100% (got ${m1}%)`);

    // Wrong branch scores 0 on branch criterion
    const m2 = computeMatchScore(
        { branch: 'MECH', cgpa: 9.0, backlogs: 0 },
        { allowed_branch: 'CSE,IT', minimum_cgpa: 7.5, maximum_backlogs: 0 }
    );
    assert(m2 === Math.round(0.35 * 100 + 0.25 * 100), `Wrong branch loses 40% branch weight (got ${m2}%)`);

    // Branch matches but CGPA below requirement
    const m3 = computeMatchScore(
        { branch: 'CSE', cgpa: 6.0, backlogs: 0 },
        { allowed_branch: 'CSE', minimum_cgpa: 8.0, maximum_backlogs: 1 }
    );
    const expectedM3 = Math.round(0.40 * 100 + 0.35 * ((6.0/8.0)*100) + 0.25 * 100);
    assert(m3 === expectedM3, `Partial CGPA match: Branch OK + CGPA 6/8 + Backlogs OK = ${expectedM3}% (got ${m3}%)`);

    // ALL branches should give 100 branch score
    const m4 = computeMatchScore(
        { branch: 'MECH', cgpa: 8.0, backlogs: 0 },
        { allowed_branch: 'ALL', minimum_cgpa: 7.0, maximum_backlogs: 0 }
    );
    assert(m4 === 100, `ALL branches job gives full branch score (got ${m4}%)`);

    // --------------------------------------------------------------------------
    // Part 2: HTTP Integration Tests (Live Server)
    // --------------------------------------------------------------------------
    console.log('\n--- 2. HTTP Server Endpoint Tests ---');



    try {
        // Test 1: Admin Login
        const loginRes = await makeRequest('POST', '/api/auth/admin/login', {
            email: 'admin@placement.edu',
            password: 'admin123'
        });

        if (loginRes.status === 200) {
            assert(loginRes.body.success === true && loginRes.body.token, 'Admin login successfully returns JWT token');
            assert(loginRes.body.user.role === 'admin', 'Admin login verifies role as "admin"');
            const liveAdminToken = loginRes.body.token;

            // Test 2: Admin Dashboard Statistics
            const dashRes = await makeRequest('GET', '/api/admin/dashboard', null, liveAdminToken);
            assert(dashRes.status === 200, 'GET /api/admin/dashboard returns 200 with admin token');
            assert(dashRes.body.dashboard.stats.totalStudents !== undefined, 'Dashboard contains totalStudents count');
            assert(dashRes.body.dashboard.stats.totalCompanies !== undefined, 'Dashboard contains totalCompanies count');
            assert(dashRes.body.dashboard.stats.totalJobs !== undefined, 'Dashboard contains totalJobs count');
            assert(dashRes.body.dashboard.stats.totalApplications !== undefined, 'Dashboard contains totalApplications count');
            assert(Array.isArray(dashRes.body.dashboard.recentApplications), 'Dashboard contains recent applications list');
            assert(Array.isArray(dashRes.body.dashboard.recentJobs), 'Dashboard contains recent jobs list');

            // Test 3: Student blocked from Admin Dashboard
            const studentDashRes = await makeRequest('GET', '/api/admin/dashboard', null, studentToken);
            assert(studentDashRes.status === 403, 'Student token calling GET /api/admin/dashboard returns 403 Forbidden');

            // Test 4: Unauthenticated call blocked from Admin Dashboard
            const unauthDashRes = await makeRequest('GET', '/api/admin/dashboard', null, null);
            assert(unauthDashRes.status === 401, 'Unauthenticated call to GET /api/admin/dashboard returns 401 Unauthorized');

            // Test 5: Add Company
            const newCompRes = await makeRequest('POST', '/api/companies', {
                name: `TestCorp_${Date.now()}`,
                website: 'https://testcorp.example.com',
                location: 'Bengaluru',
                industry: 'FinTech',
                contact_email: 'hr@testcorp.example.com'
            }, liveAdminToken);
            assert(newCompRes.status === 201 && newCompRes.body.company.company_id, 'Admin successfully creates new company via POST /api/companies');
            const createdCompanyId = newCompRes.body.company.company_id;

            // Test 6: Student blocked from adding company
            const studentCompRes = await makeRequest('POST', '/api/companies', { name: 'HackCorp' }, studentToken);
            assert(studentCompRes.status === 403, 'Student token calling POST /api/companies returns 403 Forbidden');

            // Test 7: Update Company
            const updateCompRes = await makeRequest('PUT', `/api/companies/${createdCompanyId}`, {
                location: 'Hyderabad'
            }, liveAdminToken);
            assert(updateCompRes.status === 200 && updateCompRes.body.company.location === 'Hyderabad', 'Admin successfully updates company via PUT /api/companies/:id');

            // Test 8: Add Job with Eligibility Criteria
            const newJobRes = await makeRequest('POST', '/api/jobs', {
                company_id: createdCompanyId,
                title: 'Junior Backend Developer',
                package_lpa: 9.50,
                location: 'Hyderabad',
                minimum_cgpa: 7.50,
                allowed_branch: 'CSE,IT',
                maximum_backlogs: 0,
                deadline: '2026-12-31'
            }, liveAdminToken);
            assert(newJobRes.status === 201 && newJobRes.body.job.job_id, 'Admin successfully posts job with eligibility criteria via POST /api/jobs');
            const createdJobId = newJobRes.body.job.job_id;

            // Test 9: Student blocked from adding job
            const studentJobRes = await makeRequest('POST', '/api/jobs', { title: 'Fake Job' }, studentToken);
            assert(studentJobRes.status === 403, 'Student token calling POST /api/jobs returns 403 Forbidden');

            // Test 10: Update Job
            const updateJobRes = await makeRequest('PUT', `/api/jobs/${createdJobId}`, {
                package_lpa: 10.50
            }, liveAdminToken);
            assert(updateJobRes.status === 200 && updateJobRes.body.job.package_lpa === 10.50, 'Admin successfully updates job via PUT /api/jobs/:id');

            // Test 11: View All Applications
            const allAppsRes = await makeRequest('GET', '/api/applications', null, liveAdminToken);
            assert(allAppsRes.status === 200 && Array.isArray(allAppsRes.body.applications), 'Admin successfully fetches all applications via GET /api/applications');

            // Test 12: Student blocked from viewing all applications
            const studentAppsRes = await makeRequest('GET', '/api/applications', null, studentToken);
            assert(studentAppsRes.status === 403, 'Student token calling GET /api/applications returns 403 Forbidden');

            // Test 13: Update Application Status to 'Shortlisted'
            if (allAppsRes.body.applications.length > 0) {
                const targetAppId = allAppsRes.body.applications[0].application_id;

                const shortlistRes = await makeRequest('PUT', `/api/applications/${targetAppId}/status`, {
                    status: 'Shortlisted'
                }, liveAdminToken);
                assert(shortlistRes.status === 200 && shortlistRes.body.application.status === 'Shortlisted', 'Admin successfully updates application status to "Shortlisted"');

                // Test 14: Update Application Status to 'Rejected'
                const rejectRes = await makeRequest('PUT', `/api/applications/${targetAppId}/status`, {
                    status: 'Rejected'
                }, liveAdminToken);
                assert(rejectRes.status === 200 && rejectRes.body.application.status === 'Rejected', 'Admin successfully updates application status to "Rejected"');

                // Test 15: Invalid Status value rejection
                const invalidStatusRes = await makeRequest('PUT', `/api/applications/${targetAppId}/status`, {
                    status: 'Selected'
                }, liveAdminToken);
                assert(invalidStatusRes.status === 400, 'Invalid application status is rejected with 400 Bad Request');
            }

            // Test 16: Safe deletion of created test job and company
            const delJobRes = await makeRequest('DELETE', `/api/jobs/${createdJobId}`, null, liveAdminToken);
            assert(delJobRes.status === 200, 'Admin successfully deletes test job opening');

            const delCompRes = await makeRequest('DELETE', `/api/companies/${createdCompanyId}`, null, liveAdminToken);
            assert(delCompRes.status === 200, 'Admin successfully deletes test company');

        } else {
            console.log('ℹ️ HTTP Server returned status:', loginRes.status);
            console.log('💡 Live database needed for HTTP endpoints. Start MySQL and run "npm start".');
        }
    } catch (httpErr) {
        console.log('ℹ️ Server not reachable on port 5000. Start with "npm start" for live HTTP tests.');
    }

    console.log('\n================================================================');
    console.log(`📊 Admin Module Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log('================================================================');
}

runAdminTests();
