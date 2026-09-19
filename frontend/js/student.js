// ==============================================================================
// frontend/js/student.js - Complete Student Module & Placement Portal
// Handles: Dashboard, Profile, Available Jobs, Eligibility Engine, Applications
// ==============================================================================

const API_BASE = '';

// In-memory cache for live filtering on jobs and applications pages
let cachedDashboard = null;
let activeApplicationFilter = 'ALL';

// ------------------------------------------------------------------------------
// 1. Authentication & Token Helpers (Stored in LocalStorage)
// ------------------------------------------------------------------------------
function getToken() {
    return localStorage.getItem('placement_token') || '';
}

function setToken(token) {
    localStorage.setItem('placement_token', token);
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem('placement_user')) || null;
    } catch (e) {
        return null;
    }
}

function setUser(user) {
    localStorage.setItem('placement_user', JSON.stringify(user));
}

function logout() {
    localStorage.removeItem('placement_token');
    localStorage.removeItem('placement_user');
    window.location.href = 'index.html';
}

// ------------------------------------------------------------------------------
// 2. Generic Fetch API Wrapper with Automatic JWT Header Attachment
// ------------------------------------------------------------------------------
async function apiCall(endpoint, method = 'GET', body = null) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method,
        headers
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(endpoint, options);
        const data = await response.json();
        return { ok: response.ok, status: response.status, data };
    } catch (error) {
        console.error(`API Error calling ${endpoint}:`, error.message);
        return { ok: false, status: 0, data: { success: false, message: error.message } };
    }
}

// ------------------------------------------------------------------------------
// 3. Demo Quick-Login Switcher
// ------------------------------------------------------------------------------
async function demoLogin(email, password) {
    const res = await apiCall('/api/auth/student/login', 'POST', { email, password });
    if (res.ok && res.data.token) {
        setToken(res.data.token);
        setUser(res.data.user);
        alert(`Logged in as ${res.data.user.name} (${res.data.user.role})!`);
        window.location.reload();
    } else {
        alert(res.data.message || 'Demo login failed. Make sure MySQL database is initialized.');
    }
}

// ------------------------------------------------------------------------------
// 4. Server & Database Quick Health Indicator
// ------------------------------------------------------------------------------
async function checkSystemHealth() {
    const serverDot = document.getElementById('server-status-dot');
    const serverText = document.getElementById('server-status-text');
    const dbDot = document.getElementById('db-status-dot');
    const dbText = document.getElementById('db-status-text');

    if (serverDot && serverText) {
        try {
            const res = await fetch('/api/health');
            if (res.ok) {
                serverDot.style.background = '#28a745';
                serverText.textContent = 'Server Online (Port 5000)';
            } else {
                serverDot.style.background = '#dc3545';
                serverText.textContent = 'Server Error';
            }
        } catch (e) {
            serverDot.style.background = '#dc3545';
            serverText.textContent = 'Server Offline';
        }
    }

    if (dbDot && dbText) {
        try {
            const res = await fetch('/api/db-test');
            const data = await res.json();
            if (res.ok && data.success) {
                dbDot.style.background = '#28a745';
                dbText.textContent = `MySQL Connected (${data.tablesCount} tables)`;
            } else {
                dbDot.style.background = '#dc3545';
                dbText.textContent = 'MySQL Disconnected';
            }
        } catch (e) {
            dbDot.style.background = '#dc3545';
            dbText.textContent = 'MySQL Unreachable';
        }
    }
}

// ------------------------------------------------------------------------------
// 5. Load Student Dashboard & Profile
// ------------------------------------------------------------------------------
async function loadDashboard() {
    const token = getToken();

    // If no token exists, notify or trigger default demo login
    if (!token) {
        const headerName = document.getElementById('student-name-header') || document.getElementById('student-display-name');
        if (headerName) {
            headerName.textContent = 'Guest (Please select a demo student)';
        }
        return;
    }

    const res = await apiCall('/api/students/dashboard');
    if (res.ok && res.data.dashboard) {
        const d = res.data.dashboard;
        cachedDashboard = d;
        setUser(d.student);

        // Update Student Name in Headers
        const nameEl = document.getElementById('student-name-header') || document.getElementById('student-display-name');
        if (nameEl) nameEl.textContent = d.student.name;

        // Update Academic Profile info
        if (document.getElementById('prof-name')) document.getElementById('prof-name').textContent = d.student.name;
        if (document.getElementById('prof-email')) document.getElementById('prof-email').textContent = d.student.email;
        if (document.getElementById('prof-roll')) document.getElementById('prof-roll').textContent = d.student.roll_number || 'N/A';
        if (document.getElementById('prof-branch')) document.getElementById('prof-branch').textContent = d.student.branch || 'N/A';
        if (document.getElementById('prof-cgpa')) document.getElementById('prof-cgpa').textContent = d.student.cgpa !== null ? parseFloat(d.student.cgpa).toFixed(2) : 'N/A';
        if (document.getElementById('prof-backlogs')) document.getElementById('prof-backlogs').textContent = d.student.backlogs !== undefined ? d.student.backlogs : '0';
        if (document.getElementById('prof-phone')) document.getElementById('prof-phone').textContent = d.student.phone || 'Not provided';

        // Pre-fill Edit Profile form fields
        if (document.getElementById('input-name')) document.getElementById('input-name').value = d.student.name || '';
        if (document.getElementById('input-branch')) document.getElementById('input-branch').value = d.student.branch || 'CSE';
        if (document.getElementById('input-cgpa')) document.getElementById('input-cgpa').value = d.student.cgpa || '';
        if (document.getElementById('input-backlogs')) document.getElementById('input-backlogs').value = d.student.backlogs !== undefined ? d.student.backlogs : '0';
        if (document.getElementById('input-phone')) document.getElementById('input-phone').value = d.student.phone || '';

        // Update Dashboard Statistics Counters
        if (document.getElementById('stat-total-jobs')) document.getElementById('stat-total-jobs').textContent = d.stats.totalAvailableJobs;
        if (document.getElementById('stat-total-apps')) document.getElementById('stat-total-apps').textContent = d.stats.totalApplications;
        if (document.getElementById('stat-shortlisted')) document.getElementById('stat-shortlisted').textContent = d.stats.shortlistedCount;
        if (document.getElementById('stat-pending')) document.getElementById('stat-pending').textContent = d.stats.appliedCount;
        if (document.getElementById('stat-rejected')) document.getElementById('stat-rejected').textContent = d.stats.rejectedCount;

        // Render Available Jobs
        renderJobsList(d.jobs);

        // Render Applications Table
        renderApplicationsTable(d.recentApplications);

        // Update Jobs count pill if present
        const jobsCountEl = document.getElementById('jobs-count');
        if (jobsCountEl) jobsCountEl.textContent = d.jobs.length;
    }
}

// ------------------------------------------------------------------------------
// 6. Render Available Jobs with Real-Time Eligibility Badges & Apply Actions
// ------------------------------------------------------------------------------
function renderJobsList(jobs) {
    const container = document.getElementById('jobs-list-container') || document.getElementById('jobs-container');
    if (!container) return;

    if (!jobs || jobs.length === 0) {
        container.innerHTML = '<p style="color:#666; font-style:italic; padding:1rem;">No placement drives found matching your criteria.</p>';
        return;
    }

    container.innerHTML = jobs.map(job => {
        let eligibilityPill = '';
        if (job.isEligible !== undefined) {
            eligibilityPill = job.isEligible
                ? '<span class="badge" style="background:#d1e7dd; color:#0f5132; margin-left:0.5rem;">Eligible</span>'
                : '<span class="badge" style="background:#f8d7da; color:#842029; margin-left:0.5rem;">Not Eligible</span>';
        }

        const appliedBadge = job.hasApplied
            ? '<span class="badge applied" style="margin-left:0.5rem;">Already Applied</span>'
            : '';

        return `
            <div class="job-item" id="job-card-${job.job_id}">
                <div class="job-header">
                    <div>
                        <h3>${job.title} ${eligibilityPill} ${appliedBadge}</h3>
                        <div class="job-company">🏢 ${job.company_name} | 📍 ${job.location || 'Pan India'}</div>
                    </div>
                    <div style="font-size: 1.25rem; font-weight: bold; color: #198754;">
                        ₹${parseFloat(job.package_lpa).toFixed(2)} LPA
                    </div>
                </div>

                <p style="font-size:0.9rem; color:#555; margin-bottom: 0.75rem;">${job.description || 'No description provided.'}</p>

                <div class="job-meta">
                    <span class="meta-pill">🎯 Min CGPA: <strong>${parseFloat(job.minimum_cgpa).toFixed(2)}</strong></span>
                    <span class="meta-pill">🎓 Allowed Branch: <strong>${job.allowed_branch}</strong></span>
                    <span class="meta-pill">⚠️ Max Backlogs: <strong>${job.maximum_backlogs}</strong></span>
                    <span class="meta-pill">📅 Deadline: <strong>${job.deadline ? job.deadline.split('T')[0] : 'Open'}</strong></span>
                </div>

                <!-- Live Eligibility Result Box for this job -->
                <div id="eligibility-box-${job.job_id}" style="display:none;"></div>

                <div style="display: flex; gap: 0.5rem; margin-top: 0.85rem; flex-wrap: wrap;">
                    <a href="job-details.html?id=${job.job_id}" class="btn secondary" style="font-size:0.85rem; padding:0.45rem 0.85rem; text-decoration:none;">
                        📄 View Details
                    </a>
                    <button class="btn secondary" onclick="checkJobEligibility(${job.job_id})" style="font-size:0.85rem; padding:0.45rem 0.85rem;">
                        🔍 Check Eligibility
                    </button>
                    ${!job.hasApplied ? `
                        <button class="btn success" onclick="applyForJob(${job.job_id})" style="font-size:0.85rem; padding:0.45rem 0.95rem;">
                            🚀 Apply Now
                        </button>
                    ` : `
                        <button class="btn" disabled style="background:#ced4da; color:#6c757d; cursor:not-allowed; font-size:0.85rem; padding:0.45rem 0.95rem;">
                            ✅ Applied
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

// ------------------------------------------------------------------------------
// 7. Check Job Eligibility Handler
// ------------------------------------------------------------------------------
async function checkJobEligibility(jobId) {
    const box = document.getElementById(`eligibility-box-${jobId}`);
    if (!box) return;

    box.style.display = 'block';
    box.className = 'eligibility-banner';
    box.innerHTML = '<em>Checking eligibility against criteria...</em>';

    const res = await apiCall(`/api/applications/check-eligibility/${jobId}`);
    if (res.ok && res.data) {
        const d = res.data;
        if (d.eligible) {
            box.className = 'eligibility-banner eligible';
            box.innerHTML = `
                <strong>✅ You are ELIGIBLE to apply for this job!</strong><br>
                Your Profile: CGPA ${parseFloat(d.studentProfile.cgpa).toFixed(2)} | Branch: ${d.studentProfile.branch} | Backlogs: ${d.studentProfile.backlogs}<br>
                Criteria: Min CGPA ${parseFloat(d.criteria.minimum_cgpa).toFixed(2)} | Allowed: ${d.criteria.allowed_branch} | Max Backlogs: ${d.criteria.maximum_backlogs}
            `;
        } else {
            box.className = 'eligibility-banner ineligible';
            const reasonsHtml = d.reasons.map(r => `<li>${r}</li>`).join('');
            box.innerHTML = `
                <strong>❌ You are NOT ELIGIBLE for this job:</strong>
                <ul>${reasonsHtml}</ul>
            `;
        }
    } else {
        box.className = 'eligibility-banner ineligible';
        box.innerHTML = `Error checking eligibility: ${res.data.message || 'Please log in'}`;
    }
}

// ------------------------------------------------------------------------------
// 8. Apply for Job Handler (Checks Eligibility & Duplicate Prevention)
// ------------------------------------------------------------------------------
async function applyForJob(jobId) {
    if (!confirm('Are you sure you want to submit your application for this job opening?')) {
        return;
    }

    const res = await apiCall('/api/applications', 'POST', { job_id: jobId });
    if (res.ok && res.data.success) {
        alert('🎉 Application submitted successfully! Status: Applied (Under Review)');
        loadDashboard(); // Refresh counts and status across dashboard
    } else {
        if (res.data.reasons && res.data.reasons.length > 0) {
            alert(`❌ Application Rejected:\n\n` + res.data.reasons.join('\n'));
        } else {
            alert(`⚠️ Notice: ${res.data.message || 'Submission failed'}`);
        }
    }
}

// ------------------------------------------------------------------------------
// 9. Render Applications Table with Status Pills
// ------------------------------------------------------------------------------
function renderApplicationsTable(applications) {
    const tbody = document.getElementById('apps-table-body') || document.getElementById('applications-tbody');
    if (!tbody) return;

    if (!applications || applications.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#777; padding:1.5rem;">No applications found.</td></tr>';
        return;
    }

    // Filter by active filter if set
    let filtered = applications;
    if (activeApplicationFilter !== 'ALL') {
        filtered = applications.filter(a => a.status === activeApplicationFilter);
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#777; padding:1.5rem;">No applications with status "${activeApplicationFilter}".</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map((app, index) => {
        let statusBadge = '';
        if (app.status === 'Applied') {
            statusBadge = '<span class="badge applied">Applied (Under Review)</span>';
        } else if (app.status === 'Shortlisted') {
            statusBadge = '<span class="badge shortlisted">🎉 Shortlisted</span>';
        } else if (app.status === 'Rejected') {
            statusBadge = '<span class="badge rejected">Rejected</span>';
        }

        const dateStr = app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'N/A';
        const pkgStr = app.package_lpa ? `₹${parseFloat(app.package_lpa).toFixed(2)} LPA` : '-';

        return `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${app.company_name}</strong></td>
                <td>${app.job_title}</td>
                <td>${pkgStr}</td>
                <td>${dateStr}</td>
                <td>${statusBadge}</td>
            </tr>
        `;
    }).join('');
}

// Filter applications by status tab
function filterApplications(status) {
    activeApplicationFilter = status;
    const buttons = ['filter-app-all', 'filter-app-applied', 'filter-app-shortlisted', 'filter-app-rejected'];
    buttons.forEach(btnId => {
        const el = document.getElementById(btnId);
        if (el) el.className = 'btn secondary';
    });

    const activeBtn = document.getElementById(`filter-app-${status.toLowerCase()}`);
    if (activeBtn) activeBtn.className = 'btn';

    if (cachedDashboard && cachedDashboard.recentApplications) {
        renderApplicationsTable(cachedDashboard.recentApplications);
    }
}

// ------------------------------------------------------------------------------
// 10. Update Profile Form Submission
// ------------------------------------------------------------------------------
async function handleProfileSubmit(e) {
    e.preventDefault();
    const msgEl = document.getElementById('edit-profile-msg');

    const updateData = {
        name: document.getElementById('input-name') ? document.getElementById('input-name').value : undefined,
        branch: document.getElementById('input-branch').value,
        cgpa: parseFloat(document.getElementById('input-cgpa').value),
        backlogs: parseInt(document.getElementById('input-backlogs').value, 10),
        phone: document.getElementById('input-phone').value
    };

    const res = await apiCall('/api/students/profile', 'PUT', updateData);
    if (res.ok && res.data.success) {
        if (msgEl) {
            msgEl.innerHTML = '<span style="color:#198754; font-weight:bold;">✅ Profile updated successfully!</span>';
        }
        setTimeout(() => {
            const editForm = document.getElementById('edit-profile-form');
            if (editForm && window.location.pathname.includes('index.html')) {
                editForm.style.display = 'none';
            }
            loadDashboard();
        }, 800);
    } else {
        if (msgEl) {
            msgEl.innerHTML = `<span style="color:#dc3545;">❌ ${res.data.message || 'Update failed'}</span>`;
        }
    }
}

// ------------------------------------------------------------------------------
// 11. Jobs Page Search & Filter Initialization
// ------------------------------------------------------------------------------
function initJobsPageFilters() {
    const searchInput = document.getElementById('filter-search');
    const branchSelect = document.getElementById('filter-branch');
    const eligSelect = document.getElementById('filter-eligibility');

    function applyFilters() {
        if (!cachedDashboard || !cachedDashboard.jobs) return;

        const term = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const branch = branchSelect ? branchSelect.value : 'ALL';
        const elig = eligSelect ? eligSelect.value : 'all';

        const filtered = cachedDashboard.jobs.filter(job => {
            // Search filter
            const matchSearch = !term ||
                job.title.toLowerCase().includes(term) ||
                job.company_name.toLowerCase().includes(term);

            // Branch filter
            let matchBranch = true;
            if (branch !== 'ALL') {
                const jobBranches = job.allowed_branch.split(',').map(b => b.trim().toUpperCase());
                matchBranch = job.allowed_branch === 'ALL' || jobBranches.includes(branch);
            }

            // Eligibility filter
            let matchElig = true;
            if (elig === 'eligible') {
                matchElig = job.isEligible === true;
            } else if (elig === 'applied') {
                matchElig = job.hasApplied === true;
            }

            return matchSearch && matchBranch && matchElig;
        });

        renderJobsList(filtered);
        const countEl = document.getElementById('jobs-count');
        if (countEl) countEl.textContent = filtered.length;
    }

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (branchSelect) branchSelect.addEventListener('change', applyFilters);
    if (eligSelect) eligSelect.addEventListener('change', applyFilters);
}

// ------------------------------------------------------------------------------
// 12. Job Details Page Handler
// ------------------------------------------------------------------------------
async function loadJobDetailsPage() {
    const detailCard = document.getElementById('job-detail-card');
    const loadingEl = document.getElementById('job-detail-loading');
    if (!detailCard) return;

    const urlParams = new URLSearchParams(window.location.search);
    const jobId = urlParams.get('id');

    if (!jobId) {
        if (loadingEl) loadingEl.innerHTML = '<p style="color:#dc3545;">No job ID specified. Please select a job from the <a href="jobs.html">Available Jobs</a> list.</p>';
        return;
    }

    // Fetch Job details and check eligibility
    const res = await apiCall(`/api/applications/check-eligibility/${jobId}`);
    if (!res.ok) {
        if (loadingEl) loadingEl.innerHTML = `<p style="color:#dc3545;">Error: ${res.data.message || 'Unable to load job details. Please ensure you are logged in.'}</p>`;
        return;
    }

    const d = res.data;
    if (loadingEl) loadingEl.style.display = 'none';
    detailCard.style.display = 'block';

    // Populate header & company info
    document.getElementById('detail-job-title').textContent = d.job_title;
    document.getElementById('detail-company-name').textContent = d.company_name;

    // Fetch full job data from /api/jobs/:id to get description and location
    const jobRes = await apiCall(`/api/jobs/${jobId}`);
    if (jobRes.ok && jobRes.data.job) {
        const fullJob = jobRes.data.job;
        document.getElementById('detail-package').textContent = `₹${parseFloat(fullJob.package_lpa).toFixed(2)} LPA`;
        document.getElementById('detail-job-location').textContent = fullJob.location || 'Pan India';
        document.getElementById('detail-deadline').textContent = `Deadline: ${fullJob.deadline ? fullJob.deadline.split('T')[0] : 'Open'}`;
        document.getElementById('detail-description').textContent = fullJob.description || 'No detailed description provided.';
        if (fullJob.company_website) {
            document.getElementById('detail-company-website').innerHTML = `<a href="${fullJob.company_website}" target="_blank" style="color:#1e3c72;">🌐 ${fullJob.company_website}</a>`;
        }
    }

    // Populate Side-by-Side Criteria Comparison Table
    const student = d.studentProfile;
    const criteria = d.criteria;

    const cgpaPass = parseFloat(student.cgpa) >= parseFloat(criteria.minimum_cgpa);
    const branchPass = criteria.allowed_branch === 'ALL' || criteria.allowed_branch.split(',').map(b => b.trim().toUpperCase()).includes(student.branch.toUpperCase());
    const backlogPass = parseInt(student.backlogs, 10) <= parseInt(criteria.maximum_backlogs, 10);

    document.getElementById('comp-min-cgpa').textContent = `Min ${parseFloat(criteria.minimum_cgpa).toFixed(2)}`;
    document.getElementById('comp-student-cgpa').textContent = `${parseFloat(student.cgpa).toFixed(2)}`;
    document.getElementById('comp-status-cgpa').innerHTML = cgpaPass ? '<span style="color:#198754; font-weight:bold;">✅ Met</span>' : '<span style="color:#dc3545; font-weight:bold;">❌ Not Met</span>';

    document.getElementById('comp-allowed-branch').textContent = criteria.allowed_branch;
    document.getElementById('comp-student-branch').textContent = student.branch;
    document.getElementById('comp-status-branch').innerHTML = branchPass ? '<span style="color:#198754; font-weight:bold;">✅ Met</span>' : '<span style="color:#dc3545; font-weight:bold;">❌ Not Met</span>';

    document.getElementById('comp-max-backlogs').textContent = `Max ${criteria.maximum_backlogs}`;
    document.getElementById('comp-student-backlogs').textContent = `${student.backlogs}`;
    document.getElementById('comp-status-backlogs').innerHTML = backlogPass ? '<span style="color:#198754; font-weight:bold;">✅ Met</span>' : '<span style="color:#dc3545; font-weight:bold;">❌ Not Met</span>';

    // Populate Eligibility Banner
    const box = document.getElementById('detail-eligibility-box');
    if (d.eligible) {
        box.className = 'eligibility-banner eligible';
        box.innerHTML = '<strong>✅ You meet all criteria and are eligible to apply for this job opening!</strong>';
    } else {
        box.className = 'eligibility-banner ineligible';
        const reasonsHtml = d.reasons.map(r => `<li>${r}</li>`).join('');
        box.innerHTML = `<strong>❌ You do not meet the eligibility requirements:</strong><ul>${reasonsHtml}</ul>`;
    }

    // Configure Action Button
    const applyBtn = document.getElementById('btn-detail-apply');
    if (d.hasApplied) {
        applyBtn.className = 'btn';
        applyBtn.disabled = true;
        applyBtn.style.background = '#ced4da';
        applyBtn.style.color = '#6c757d';
        applyBtn.style.cursor = 'not-allowed';
        applyBtn.textContent = `✅ Already Applied (Status: ${d.applicationStatus || 'Applied'})`;
    } else if (!d.eligible) {
        applyBtn.className = 'btn secondary';
        applyBtn.onclick = () => {
            alert(`You are not eligible for this job opening:\n\n${d.reasons.join('\n')}`);
        };
        applyBtn.textContent = '❌ Ineligible to Apply';
    } else {
        applyBtn.className = 'btn success';
        applyBtn.onclick = () => applyForJob(jobId);
        applyBtn.textContent = '🚀 Apply for this Position';
    }
}

// ------------------------------------------------------------------------------
// 13. DOM Ready Initialization
// ------------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
    // Check Server & DB
    checkSystemHealth();

    // If student token does not exist, default to demo student Rahul
    if (!getToken()) {
        await demoLogin('rahul@student.edu', 'student123');
    } else {
        await loadDashboard();
    }

    // Attach profile form handler
    const profForm = document.getElementById('edit-profile-form');
    if (profForm) {
        profForm.addEventListener('submit', handleProfileSubmit);
    }

    // Attach toggle edit profile button
    const toggleBtn = document.getElementById('btn-toggle-edit-profile');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const form = document.getElementById('edit-profile-form');
            if (form) {
                form.style.display = form.style.display === 'none' ? 'block' : 'none';
            }
        });
    }

    const cancelBtn = document.getElementById('btn-cancel-edit');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            const form = document.getElementById('edit-profile-form');
            if (form) form.style.display = 'none';
        });
    }

    // Attach Demo student switcher buttons on index.html
    const btnRahul = document.getElementById('btn-student-rahul');
    if (btnRahul) btnRahul.addEventListener('click', () => demoLogin('rahul@student.edu', 'student123'));

    const btnAmit = document.getElementById('btn-student-amit');
    if (btnAmit) btnAmit.addEventListener('click', () => demoLogin('amit@student.edu', 'student123'));

    const btnPriya = document.getElementById('btn-student-priya');
    if (btnPriya) btnPriya.addEventListener('click', () => demoLogin('priya@student.edu', 'student123'));

    // Initialize Jobs Page filters if on jobs.html
    initJobsPageFilters();

    // Initialize Job Details Page if on job-details.html
    loadJobDetailsPage();
});
