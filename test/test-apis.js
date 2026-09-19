// ==============================================================================
// test/test-apis.js - Comprehensive Automated REST API Test Suite
// Runs automated tests against all Phase 3 endpoints on http://localhost:5000
// ==============================================================================

const http = require('http');

const BASE_URL = 'http://localhost:5000';

// Helper function to make HTTP requests
function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
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

async function runTests() {
    console.log('================================================================');
    console.log('🧪 Starting Phase 3 API Test Suite');
    console.log(`🔗 Target: ${BASE_URL}`);
    console.log('================================================================\n');

    try {
        // 1. System Health
        console.log('--- 1. Health & DB System Tests ---');
        const health = await makeRequest('GET', '/api/health');
        assert(health.status === 200 && health.body.success === true, 'GET /api/health returns 200');

        const dbTest = await makeRequest('GET', '/api/db-test');
        assert(dbTest.status === 200 && dbTest.body.success === true, 'GET /api/db-test returns 200 and lists tables');

        // 2. Company APIs
        console.log('\n--- 2. Company API Tests ---');
        const getAllComp = await makeRequest('GET', '/api/companies');
        assert(getAllComp.status === 200 && Array.isArray(getAllComp.body.companies), 'GET /api/companies returns list of companies');

        const timestamp = Date.now();
        const createComp = await makeRequest('POST', '/api/companies', {
            name: `Test Tech Corp ${timestamp}`,
            website: 'https://testtech.example.com',
            location: 'Mumbai, India',
            industry: 'FinTech',
            description: 'Financial technology innovations',
            contact_email: `hr_${timestamp}@testtech.example.com`
        });
        assert(createComp.status === 201 && createComp.body.success === true, 'POST /api/companies creates a new company');
        const companyId = createComp.body.company ? createComp.body.company.company_id : null;

        if (companyId) {
            const updateComp = await makeRequest('PUT', `/api/companies/${companyId}`, {
                location: 'Bengaluru, India'
            });
            assert(updateComp.status === 200 && updateComp.body.company.location === 'Bengaluru, India', 'PUT /api/companies/:id updates company location');
        }

        // 3. Student APIs
        console.log('\n--- 3. Student API Tests ---');
        const studentEmail = `student_${timestamp}@test.edu`;
        const studentRoll = `ROLL_${timestamp.toString().slice(-6)}`;
        const createStudent = await makeRequest('POST', '/api/students', {
            name: 'Karan Mehra',
            email: studentEmail,
            password: 'studentpassword123',
            roll_number: studentRoll,
            branch: 'CSE',
            cgpa: 8.92,
            backlogs: 0,
            phone: '9988776655',
            resume_url: 'https://example.com/resumes/karan.pdf'
        });
        assert(createStudent.status === 201 && createStudent.body.success === true, 'POST /api/students registers a new student with profile');
        const studentId = createStudent.body.student ? createStudent.body.student.userId : null;

        if (studentId) {
            const getStudent = await makeRequest('GET', `/api/students/${studentId}`);
            assert(getStudent.status === 200 && getStudent.body.student.roll_number === studentRoll, 'GET /api/students/:id fetches student by ID');

            const updateStudent = await makeRequest('PUT', `/api/students/${studentId}`, {
                cgpa: 9.10,
                phone: '9988770000'
            });
            assert(updateStudent.status === 200 && parseFloat(updateStudent.body.student.cgpa) === 9.10, 'PUT /api/students/:id updates student CGPA and phone');
        }

        // 4. Job APIs
        console.log('\n--- 4. Job API Tests ---');
        const getAllJobs = await makeRequest('GET', '/api/jobs');
        assert(getAllJobs.status === 200 && Array.isArray(getAllJobs.body.jobs), 'GET /api/jobs returns list of jobs with company details');

        // Create a job for the newly created company
        let testJobId = null;
        if (companyId) {
            const createJob = await makeRequest('POST', '/api/jobs', {
                company_id: companyId,
                title: `Full Stack Engineer ${timestamp}`,
                description: 'Build modern responsive web applications',
                package_lpa: 14.50,
                location: 'Remote',
                minimum_cgpa: 7.50,
                allowed_branch: 'CSE,IT',
                maximum_backlogs: 0,
                deadline: '2026-12-31'
            });
            assert(createJob.status === 201 && createJob.body.success === true, 'POST /api/jobs creates a new job opening');
            testJobId = createJob.body.job ? createJob.body.job.job_id : null;
        }

        if (testJobId) {
            const getJob = await makeRequest('GET', `/api/jobs/${testJobId}`);
            assert(getJob.status === 200 && getJob.body.job.job_id === testJobId, 'GET /api/jobs/:id fetches single job by ID');

            const updateJob = await makeRequest('PUT', `/api/jobs/${testJobId}`, {
                package_lpa: 16.00
            });
            assert(updateJob.status === 200 && parseFloat(updateJob.body.job.package_lpa) === 16.00, 'PUT /api/jobs/:id updates job package_lpa');
        }

        // 5. Application APIs
        console.log('\n--- 5. Application API Tests ---');
        if (studentId && testJobId) {
            const createApplication = await makeRequest('POST', '/api/applications', {
                student_id: studentId,
                job_id: testJobId
            });
            assert(createApplication.status === 201 && createApplication.body.success === true, 'POST /api/applications submits job application');

            // Test duplicate application prevention
            const duplicateApp = await makeRequest('POST', '/api/applications', {
                student_id: studentId,
                job_id: testJobId
            });
            assert(duplicateApp.status === 400 && duplicateApp.body.success === false, 'POST /api/applications rejects duplicate application (status 400)');

            // Get student applications
            const studentApps = await makeRequest('GET', `/api/applications/student/${studentId}`);
            assert(studentApps.status === 200 && studentApps.body.count >= 1, 'GET /api/applications/student/:studentId returns student applications');

            // Get job applications
            const jobApps = await makeRequest('GET', `/api/applications/job/${testJobId}`);
            assert(jobApps.status === 200 && jobApps.body.count >= 1, 'GET /api/applications/job/:jobId returns applications for a specific job');
        }

        // 6. Cleanup & Cascade Delete Test
        console.log('\n--- 6. Deletion & Cleanup Tests ---');
        if (testJobId) {
            const deleteJob = await makeRequest('DELETE', `/api/jobs/${testJobId}`);
            assert(deleteJob.status === 200, 'DELETE /api/jobs/:id deletes job and its applications');
        }
        if (companyId) {
            const deleteComp = await makeRequest('DELETE', `/api/companies/${companyId}`);
            assert(deleteComp.status === 200, 'DELETE /api/companies/:id deletes company safely');
        }

        console.log('\n================================================================');
        console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
        console.log('================================================================');
    } catch (err) {
        console.error('Fatal test error:', err.message);
        console.log('💡 Tip: Make sure the server is running on port 5000 ("npm start") and MySQL is initialized.');
    }
}

runTests();
