// ==============================================================================
// frontend/js/admin.js - Complete Admin Portal Client Logic
// Handles Admin Authentication, Dashboard Statistics, Companies, Jobs & Applications
// ==============================================================================

const API_BASE = '';

// In-memory cache for live filtering on admin pages
let cachedCompanies = [];
let cachedJobs = [];
let cachedApplications = [];
let activeAppStatusFilter = 'ALL';

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
// 2. Generic Fetch API Wrapper with JWT Authentication
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
        console.error(`Admin API Error calling ${endpoint}:`, error.message);
        return { ok: false, status: 0, data: { success: false, message: error.message } };
    }
}

// ------------------------------------------------------------------------------
// 3. Demo Admin Quick-Login & Access Guard
// ------------------------------------------------------------------------------
async function demoAdminLogin(email = 'admin@placement.edu', password = 'admin123') {
    const res = await apiCall('/api/auth/admin/login', 'POST', { email, password });
    if (res.ok && res.data.token) {
        setToken(res.data.token);
        setUser(res.data.user);
        alert(`Logged in successfully as Administrator: ${res.data.user.name}`);
        window.location.reload();
    } else {
        alert(res.data.message || 'Admin login failed. Please ensure MySQL database is initialized with admin seed data.');
    }
}

function checkAdminRole() {
    const user = getUser();
    const token = getToken();

    // If no token or role is student
    if (!token || !user || user.role !== 'admin') {
        const guardEl = document.getElementById('admin-access-guard');
        if (guardEl) {
            guardEl.style.display = 'block';
            guardEl.innerHTML = `
                <div class="card" style="border-left: 4px solid #dc3545; background: #fff5f5; padding: 1.25rem; margin-bottom: 1.5rem;">
                    <h3 style="color: #dc3545; margin-bottom: 0.5rem;">🔒 Admin Authorization Required</h3>
                    <p style="margin-bottom: 0.75rem;">
                        You are currently ${!token ? 'not logged in' : `logged in as <strong>${user.name}</strong> (${user.role})`}.
                        This page is strictly restricted to users with the <strong>admin</strong> role.
                    </p>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button class="btn success" onclick="demoAdminLogin('admin@placement.edu', 'admin123')">
                            🔑 Log in as Demo Administrator
                        </button>
                        <a href="index.html" class="btn secondary">Back to Student Portal</a>
                    </div>
                </div>
            `;
        }
        return false;
    }

    // Admin authenticated: update header display
    const nameEl = document.getElementById('admin-display-name');
    if (nameEl) nameEl.textContent = user.name;
    return true;
}

// ------------------------------------------------------------------------------
// 4. Load Admin Dashboard (Real-time SQL Counts & Activity)
// ------------------------------------------------------------------------------
async function loadAdminDashboard() {
    if (!checkAdminRole()) return;

    const res = await apiCall('/api/admin/dashboard');
    if (res.ok && res.data.dashboard) {
        const d = res.data.dashboard;
        const stats = d.stats;

        // Statistics Counters
        if (document.getElementById('stat-total-students')) document.getElementById('stat-total-students').textContent = stats.totalStudents;
        if (document.getElementById('stat-total-companies')) document.getElementById('stat-total-companies').textContent = stats.totalCompanies;
        if (document.getElementById('stat-total-jobs')) document.getElementById('stat-total-jobs').textContent = stats.totalJobs;
        if (document.getElementById('stat-total-applications')) document.getElementById('stat-total-applications').textContent = stats.totalApplications;
        if (document.getElementById('stat-total-shortlisted')) document.getElementById('stat-total-shortlisted').textContent = stats.totalShortlisted;
        if (document.getElementById('stat-total-rejected')) document.getElementById('stat-total-rejected').textContent = stats.totalRejected;
        if (document.getElementById('stat-total-review')) document.getElementById('stat-total-review').textContent = stats.totalUnderReview;

        // Render Recent Applications Table
        const recentAppsTbody = document.getElementById('recent-applications-tbody');
        if (recentAppsTbody) {
            if (!d.recentApplications || d.recentApplications.length === 0) {
                recentAppsTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#777; padding:1.5rem;">No recent applications.</td></tr>';
            } else {
                recentAppsTbody.innerHTML = d.recentApplications.map((app, idx) => {
                    const statusBadge = getStatusBadge(app.status);
                    const dateStr = app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'N/A';
                    return `
                        <tr>
                            <td>${idx + 1}</td>
                            <td><strong>${app.student_name}</strong><br><small style="color:#666;">${app.student_email}</small></td>
                            <td>${app.company_name}</td>
                            <td>${app.job_title}</td>
                            <td>${dateStr}</td>
                            <td>${statusBadge}</td>
                        </tr>
                    `;
                }).join('');
            }
        }

        // Render Recent Jobs Table
        const recentJobsTbody = document.getElementById('recent-jobs-tbody');
        if (recentJobsTbody) {
            if (!d.recentJobs || d.recentJobs.length === 0) {
                recentJobsTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#777; padding:1.5rem;">No jobs posted yet.</td></tr>';
            } else {
                recentJobsTbody.innerHTML = d.recentJobs.map(job => {
                    return `
                        <tr>
                            <td><strong>${job.company_name}</strong></td>
                            <td>${job.title}</td>
                            <td>₹${parseFloat(job.package_lpa).toFixed(2)} LPA</td>
                            <td><span class="badge info">${job.applicant_count || 0} applicants</span></td>
                            <td><a href="admin-applications.html?job_id=${job.job_id}" class="btn secondary" style="font-size:0.75rem; padding:0.25rem 0.6rem;">View Applicants</a></td>
                        </tr>
                    `;
                }).join('');
            }
        }
    } else {
        console.error('Failed to load dashboard statistics:', res.data.message);
    }

    // Also load analytics section
    loadAdminAnalytics();
}

// ------------------------------------------------------------------------------
// 4b. Load Admin Analytics (Applications by Status, Branch, Company)
// Uses real MySQL GROUP BY / COUNT data — nothing is hardcoded.
// ------------------------------------------------------------------------------
async function loadAdminAnalytics() {
    const res = await apiCall('/api/admin/analytics');
    if (!res.ok || !res.data.analytics) return;

    const a = res.data.analytics;

    // Applications by Status
    const statusEl = document.getElementById('analytics-by-status');
    if (statusEl && a.applicationsByStatus) {
        const statusColors = { Applied: '#ffc107', Shortlisted: '#198754', Rejected: '#dc3545' };
        statusEl.innerHTML = a.applicationsByStatus.map(row => {
            const color = statusColors[row.status] || '#0d6efd';
            return `
                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.6rem;">
                    <span class="badge" style="background:${color}20; color:${color}; min-width:90px; text-align:center; font-size:0.82rem; padding:0.25rem 0.5rem;">${row.status}</span>
                    <div style="flex:1; background:#e9ecef; border-radius:4px; height:10px; overflow:hidden;">
                        <div style="background:${color}; height:100%; border-radius:4px;" 
                             title="${row.count} applications"></div>
                    </div>
                    <span style="font-weight:bold; min-width:30px;">${row.count}</span>
                </div>
            `;
        }).join('') || '<p style="color:#777; font-size:0.9rem;">No application data yet.</p>';

        // Set bar widths proportionally
        const maxCount = Math.max(...a.applicationsByStatus.map(r => parseInt(r.count)));
        if (maxCount > 0) {
            const bars = statusEl.querySelectorAll('[style*="background:"][style*="height:100%"]');
            a.applicationsByStatus.forEach((row, i) => {
                if (bars[i]) bars[i].style.width = `${Math.round((row.count / maxCount) * 100)}%`;
            });
        }
    }

    // Applications by Branch
    const branchEl = document.getElementById('analytics-by-branch');
    if (branchEl && a.applicationsByBranch) {
        if (a.applicationsByBranch.length === 0) {
            branchEl.innerHTML = '<p style="color:#777; font-size:0.9rem;">No branch data yet.</p>';
        } else {
            const maxBranchCount = Math.max(...a.applicationsByBranch.map(r => parseInt(r.application_count)));
            branchEl.innerHTML = a.applicationsByBranch.map(row => {
                const barW = maxBranchCount > 0 ? Math.round((row.application_count / maxBranchCount) * 100) : 0;
                return `
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.6rem;">
                        <span class="badge info" style="min-width:60px; text-align:center; font-size:0.82rem;">${row.branch}</span>
                        <div style="flex:1; background:#e9ecef; border-radius:4px; height:10px; overflow:hidden;">
                            <div style="background:#1e3c72; width:${barW}%; height:100%; border-radius:4px;"></div>
                        </div>
                        <span style="font-weight:bold; min-width:30px;">${row.application_count}</span>
                        ${row.shortlisted_count > 0 ? `<span class="badge shortlisted" style="font-size:0.72rem; padding:0.15rem 0.4rem;">✓ ${row.shortlisted_count}</span>` : ''}
                    </div>
                `;
            }).join('');
        }
    }

    // Top Jobs Table
    const topJobsTbody = document.getElementById('analytics-top-jobs');
    if (topJobsTbody && a.topJobs) {
        if (a.topJobs.length === 0) {
            topJobsTbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#777;">No jobs posted yet.</td></tr>';
        } else {
            topJobsTbody.innerHTML = a.topJobs.map((job, idx) => `
                <tr>
                    <td>${idx + 1}</td>
                    <td><strong>${job.company_name}</strong></td>
                    <td>${job.title}</td>
                    <td style="color:#198754; font-weight:bold;">₹${parseFloat(job.package_lpa).toFixed(2)} LPA</td>
                    <td><span class="badge info">${job.applicant_count || 0}</span></td>
                    <td><span class="badge shortlisted">${job.shortlisted_count || 0}</span></td>
                </tr>
            `).join('');
        }
    }
}



// ------------------------------------------------------------------------------
// 5. Company Management (CRUD)
// ------------------------------------------------------------------------------
async function loadCompaniesPage() {
    if (!checkAdminRole()) return;

    const tbody = document.getElementById('companies-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading companies...</td></tr>';

    const res = await apiCall('/api/companies');
    if (res.ok && res.data.companies) {
        cachedCompanies = res.data.companies;
        renderCompaniesTable(cachedCompanies);
    } else {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#dc3545;">Error: ${res.data.message || 'Failed to load companies'}</td></tr>`;
    }
}

function renderCompaniesTable(companies) {
    const tbody = document.getElementById('companies-tbody');
    if (!tbody) return;

    if (!companies || companies.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#777; padding:1.5rem;">No partner companies registered yet.</td></tr>';
        return;
    }

    tbody.innerHTML = companies.map((c, idx) => {
        const websiteLink = c.website ? `<a href="${c.website}" target="_blank" style="color:#1e3c72;">🌐 ${c.website}</a>` : '-';
        return `
            <tr id="company-row-${c.company_id}">
                <td>${idx + 1}</td>
                <td><strong>${c.name}</strong></td>
                <td>${c.industry || '-'}</td>
                <td>${c.location || 'Pan India'}</td>
                <td>${websiteLink}<br><small style="color:#666;">${c.contact_email || ''}</small></td>
                <td>
                    <div style="display:flex; gap:0.4rem;">
                        <button class="btn secondary" onclick="openEditCompanyModal(${c.company_id})" style="font-size:0.8rem; padding:0.3rem 0.6rem;">✏️ Edit</button>
                        <button class="btn" onclick="deleteCompany(${c.company_id}, '${c.name.replace(/'/g, "\\'")}')" style="background:#dc3545; font-size:0.8rem; padding:0.3rem 0.6rem;">🗑️ Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Add Company Modal & Form
function openAddCompanyModal() {
    document.getElementById('company-modal-title').textContent = '🏢 Add Partner Company';
    document.getElementById('company-form-id').value = '';
    document.getElementById('company-form-name').value = '';
    document.getElementById('company-form-website').value = '';
    document.getElementById('company-form-location').value = '';
    document.getElementById('company-form-industry').value = '';
    document.getElementById('company-form-email').value = '';
    document.getElementById('company-form-description').value = '';
    document.getElementById('company-modal-msg').innerHTML = '';
    document.getElementById('company-modal').style.display = 'block';
}

function openEditCompanyModal(companyId) {
    const company = cachedCompanies.find(c => c.company_id === companyId);
    if (!company) return;

    document.getElementById('company-modal-title').textContent = `✏️ Edit Company: ${company.name}`;
    document.getElementById('company-form-id').value = company.company_id;
    document.getElementById('company-form-name').value = company.name;
    document.getElementById('company-form-website').value = company.website || '';
    document.getElementById('company-form-location').value = company.location || '';
    document.getElementById('company-form-industry').value = company.industry || '';
    document.getElementById('company-form-email').value = company.contact_email || '';
    document.getElementById('company-form-description').value = company.description || '';
    document.getElementById('company-modal-msg').innerHTML = '';
    document.getElementById('company-modal').style.display = 'block';
}

function closeCompanyModal() {
    document.getElementById('company-modal').style.display = 'none';
}

async function handleCompanyFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('company-form-id').value;
    const msgEl = document.getElementById('company-modal-msg');

    const body = {
        name: document.getElementById('company-form-name').value.trim(),
        website: document.getElementById('company-form-website').value.trim() || null,
        location: document.getElementById('company-form-location').value.trim() || null,
        industry: document.getElementById('company-form-industry').value.trim() || null,
        contact_email: document.getElementById('company-form-email').value.trim() || null,
        description: document.getElementById('company-form-description').value.trim() || null
    };

    if (!body.name) {
        msgEl.innerHTML = '<span style="color:#dc3545;">Company name is required.</span>';
        return;
    }

    const endpoint = id ? `/api/companies/${id}` : '/api/companies';
    const method = id ? 'PUT' : 'POST';

    const res = await apiCall(endpoint, method, body);
    if (res.ok && res.data.success) {
        msgEl.innerHTML = `<span style="color:#198754; font-weight:bold;">✅ Company ${id ? 'updated' : 'added'} successfully!</span>`;
        setTimeout(() => {
            closeCompanyModal();
            loadCompaniesPage();
        }, 600);
    } else {
        msgEl.innerHTML = `<span style="color:#dc3545;">❌ ${res.data.message || 'Operation failed'}</span>`;
    }
}

async function deleteCompany(companyId, companyName) {
    if (!confirm(`Are you sure you want to delete company "${companyName}"?`)) {
        return;
    }

    const res = await apiCall(`/api/companies/${companyId}`, 'DELETE');
    if (res.ok && res.data.success) {
        alert(`✅ Company "${companyName}" deleted successfully!`);
        loadCompaniesPage();
    } else {
        // If prevented due to dependent applications
        if (res.data.dependentApplicationsCount) {
            if (confirm(`⚠️ Warning: ${res.data.message}\n\nDo you want to FORCE delete this company and all its associated jobs and applications?`)) {
                const forceRes = await apiCall(`/api/companies/${companyId}?force=true`, 'DELETE');
                if (forceRes.ok && forceRes.data.success) {
                    alert(`✅ Company "${companyName}" force-deleted successfully!`);
                    loadCompaniesPage();
                } else {
                    alert(`❌ Error: ${forceRes.data.message}`);
                }
            }
        } else {
            alert(`❌ Deletion failed: ${res.data.message || 'Server error'}`);
        }
    }
}

// ------------------------------------------------------------------------------
// 6. Job Management (CRUD)
// ------------------------------------------------------------------------------
async function loadJobsPage() {
    if (!checkAdminRole()) return;

    const tbody = document.getElementById('admin-jobs-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading placement drives...</td></tr>';

    // Fetch both jobs and companies (to populate modal select)
    const [jobsRes, compRes] = await Promise.all([
        apiCall('/api/jobs'),
        apiCall('/api/companies')
    ]);

    if (compRes.ok && compRes.data.companies) {
        cachedCompanies = compRes.data.companies;
        populateCompanySelect(cachedCompanies);
    }

    if (jobsRes.ok && jobsRes.data.jobs) {
        cachedJobs = jobsRes.data.jobs;
        renderAdminJobsTable(cachedJobs);
    } else {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#dc3545;">Error: ${jobsRes.data.message || 'Failed to load jobs'}</td></tr>`;
    }
}

function populateCompanySelect(companies) {
    const select = document.getElementById('job-form-company');
    if (!select) return;

    select.innerHTML = '<option value="">-- Select Visiting Company --</option>' +
        companies.map(c => `<option value="${c.company_id}">${c.name} (${c.location || 'HQ'})</option>`).join('');
}

function renderAdminJobsTable(jobs) {
    const tbody = document.getElementById('admin-jobs-tbody');
    if (!tbody) return;

    if (!jobs || jobs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#777; padding:1.5rem;">No job openings posted yet.</td></tr>';
        return;
    }

    tbody.innerHTML = jobs.map(job => {
        const deadlineStr = job.deadline ? job.deadline.split('T')[0] : 'Open';
        return `
            <tr id="job-row-${job.job_id}">
                <td><strong>${job.company_name}</strong></td>
                <td><strong>${job.title}</strong><br><small style="color:#666;">📍 ${job.location || 'Pan India'}</small></td>
                <td style="color:#198754; font-weight:bold;">₹${parseFloat(job.package_lpa).toFixed(2)} LPA</td>
                <td>
                    <span class="meta-pill" style="font-size:0.75rem;">Min CGPA: ${parseFloat(job.minimum_cgpa).toFixed(2)}</span><br>
                    <span class="meta-pill" style="font-size:0.75rem;">Branch: ${job.allowed_branch}</span><br>
                    <span class="meta-pill" style="font-size:0.75rem;">Max Backlogs: ${job.maximum_backlogs}</span>
                </td>
                <td>${deadlineStr}</td>
                <td>
                    <a href="admin-applications.html?job_id=${job.job_id}" class="btn secondary" style="font-size:0.78rem; padding:0.25rem 0.5rem;">
                        👥 Applicants
                    </a>
                </td>
                <td>
                    <div style="display:flex; gap:0.4rem;">
                        <button class="btn secondary" onclick="openEditJobModal(${job.job_id})" style="font-size:0.8rem; padding:0.3rem 0.6rem;">✏️ Edit</button>
                        <button class="btn" onclick="deleteJob(${job.job_id}, '${job.title.replace(/'/g, "\\'")}')" style="background:#dc3545; font-size:0.8rem; padding:0.3rem 0.6rem;">🗑️ Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openAddJobModal() {
    document.getElementById('job-modal-title').textContent = '💼 Post New Campus Placement Drive';
    document.getElementById('job-form-id').value = '';
    document.getElementById('job-form-company').value = '';
    document.getElementById('job-form-company').disabled = false;
    document.getElementById('job-form-title').value = '';
    document.getElementById('job-form-package').value = '';
    document.getElementById('job-form-location').value = '';
    document.getElementById('job-form-min-cgpa').value = '7.00';
    document.getElementById('job-form-branches').value = 'CSE,IT,ECE';
    document.getElementById('job-form-max-backlogs').value = '0';
    document.getElementById('job-form-deadline').value = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    document.getElementById('job-form-description').value = '';
    document.getElementById('job-modal-msg').innerHTML = '';
    document.getElementById('job-modal').style.display = 'block';
}

function openEditJobModal(jobId) {
    const job = cachedJobs.find(j => j.job_id === jobId);
    if (!job) return;

    document.getElementById('job-modal-title').textContent = `✏️ Edit Job: ${job.title}`;
    document.getElementById('job-form-id').value = job.job_id;
    document.getElementById('job-form-company').value = job.company_id;
    document.getElementById('job-form-company').disabled = true; // prevent changing company on edit
    document.getElementById('job-form-title').value = job.title;
    document.getElementById('job-form-package').value = job.package_lpa;
    document.getElementById('job-form-location').value = job.location || '';
    document.getElementById('job-form-min-cgpa').value = job.minimum_cgpa;
    document.getElementById('job-form-branches').value = job.allowed_branch;
    document.getElementById('job-form-max-backlogs').value = job.maximum_backlogs;
    document.getElementById('job-form-deadline').value = job.deadline ? job.deadline.split('T')[0] : '';
    document.getElementById('job-form-description').value = job.description || '';
    document.getElementById('job-modal-msg').innerHTML = '';
    document.getElementById('job-modal').style.display = 'block';
}

function closeJobModal() {
    document.getElementById('job-modal').style.display = 'none';
}

async function handleJobFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('job-form-id').value;
    const msgEl = document.getElementById('job-modal-msg');

    const body = {
        company_id: parseInt(document.getElementById('job-form-company').value, 10),
        title: document.getElementById('job-form-title').value.trim(),
        package_lpa: parseFloat(document.getElementById('job-form-package').value),
        location: document.getElementById('job-form-location').value.trim() || null,
        minimum_cgpa: parseFloat(document.getElementById('job-form-min-cgpa').value),
        allowed_branch: document.getElementById('job-form-branches').value.trim().toUpperCase(),
        maximum_backlogs: parseInt(document.getElementById('job-form-max-backlogs').value, 10),
        deadline: document.getElementById('job-form-deadline').value,
        description: document.getElementById('job-form-description').value.trim() || null
    };

    if (!id && (!body.company_id || isNaN(body.company_id))) {
        msgEl.innerHTML = '<span style="color:#dc3545;">Please select a visiting company.</span>';
        return;
    }

    if (!body.title || isNaN(body.package_lpa) || isNaN(body.minimum_cgpa) || !body.allowed_branch || !body.deadline) {
        msgEl.innerHTML = '<span style="color:#dc3545;">Please fill all required fields properly.</span>';
        return;
    }

    const endpoint = id ? `/api/jobs/${id}` : '/api/jobs';
    const method = id ? 'PUT' : 'POST';

    const res = await apiCall(endpoint, method, body);
    if (res.ok && res.data.success) {
        msgEl.innerHTML = `<span style="color:#198754; font-weight:bold;">✅ Job ${id ? 'updated' : 'posted'} successfully!</span>`;
        setTimeout(() => {
            closeJobModal();
            loadJobsPage();
        }, 600);
    } else {
        msgEl.innerHTML = `<span style="color:#dc3545;">❌ ${res.data.message || 'Operation failed'}</span>`;
    }
}

async function deleteJob(jobId, jobTitle) {
    if (!confirm(`Are you sure you want to delete job opening "${jobTitle}"?`)) {
        return;
    }

    const res = await apiCall(`/api/jobs/${jobId}`, 'DELETE');
    if (res.ok && res.data.success) {
        alert(`✅ Job "${jobTitle}" deleted successfully!`);
        loadJobsPage();
    } else {
        if (res.data.dependentApplicationsCount) {
            if (confirm(`⚠️ Warning: ${res.data.message}\n\nDo you want to FORCE delete this job opening and all ${res.data.dependentApplicationsCount} student application(s)?`)) {
                const forceRes = await apiCall(`/api/jobs/${jobId}?force=true`, 'DELETE');
                if (forceRes.ok && forceRes.data.success) {
                    alert(`✅ Job "${jobTitle}" force-deleted successfully!`);
                    loadJobsPage();
                } else {
                    alert(`❌ Error: ${forceRes.data.message}`);
                }
            }
        } else {
            alert(`❌ Deletion failed: ${res.data.message || 'Server error'}`);
        }
    }
}

// ------------------------------------------------------------------------------
// 7. Application Management & Shortlisting / Rejection
// ------------------------------------------------------------------------------
async function loadApplicationsPage() {
    if (!checkAdminRole()) return;

    const tbody = document.getElementById('admin-applications-tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Loading student applications...</td></tr>';

    // Parse URL query parameter (e.g. ?job_id=1)
    const urlParams = new URLSearchParams(window.location.search);
    const urlJobId = urlParams.get('job_id');

    const [appsRes, jobsRes, compRes] = await Promise.all([
        apiCall('/api/applications'),
        apiCall('/api/jobs'),
        apiCall('/api/companies')
    ]);

    if (jobsRes.ok && jobsRes.data.jobs) {
        cachedJobs = jobsRes.data.jobs;
        populateFilterDropdowns(cachedJobs, compRes.ok ? compRes.data.companies : []);
        if (urlJobId && document.getElementById('filter-app-job')) {
            document.getElementById('filter-app-job').value = urlJobId;
        }
    }

    if (appsRes.ok && appsRes.data.applications) {
        cachedApplications = appsRes.data.applications;
        applyApplicationFilters();
    } else {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#dc3545;">Error: ${appsRes.data.message || 'Failed to load applications'}</td></tr>`;
    }
}

function populateFilterDropdowns(jobs, companies) {
    const jobFilter = document.getElementById('filter-app-job');
    if (jobFilter) {
        jobFilter.innerHTML = '<option value="">All Jobs</option>' +
            jobs.map(j => `<option value="${j.job_id}">${j.company_name} - ${j.title}</option>`).join('');
    }

    const compFilter = document.getElementById('filter-app-company');
    if (compFilter) {
        compFilter.innerHTML = '<option value="">All Companies</option>' +
            companies.map(c => `<option value="${c.company_id}">${c.name}</option>`).join('');
    }
}

function applyApplicationFilters() {
    const jobFilterVal = document.getElementById('filter-app-job') ? document.getElementById('filter-app-job').value : '';
    const compFilterVal = document.getElementById('filter-app-company') ? document.getElementById('filter-app-company').value : '';
    const statusFilterVal = activeAppStatusFilter;
    const searchVal = document.getElementById('filter-app-search') ? document.getElementById('filter-app-search').value.toLowerCase().trim() : '';

    const filtered = cachedApplications.filter(app => {
        const matchJob = !jobFilterVal || app.job_id === parseInt(jobFilterVal, 10);
        const matchComp = !compFilterVal || app.company_id === parseInt(compFilterVal, 10);
        const matchStatus = statusFilterVal === 'ALL' || app.status === statusFilterVal;
        const matchSearch = !searchVal ||
            app.student_name.toLowerCase().includes(searchVal) ||
            app.student_email.toLowerCase().includes(searchVal) ||
            (app.roll_number && app.roll_number.toLowerCase().includes(searchVal));

        return matchJob && matchComp && matchStatus && matchSearch;
    });

    renderAdminApplicationsTable(filtered);
    const countEl = document.getElementById('applications-count');
    if (countEl) countEl.textContent = filtered.length;
}

function renderAdminApplicationsTable(applications) {
    const tbody = document.getElementById('admin-applications-tbody');
    if (!tbody) return;

    if (!applications || applications.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#777; padding:1.5rem;">No student applications match the selected criteria.</td></tr>';
        return;
    }

    tbody.innerHTML = applications.map((app, idx) => {
        const statusBadge = getStatusBadge(app.status);
        const dateStr = app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'N/A';
        const cgpaStr = app.cgpa !== null ? parseFloat(app.cgpa).toFixed(2) : '-';

        return `
            <tr id="app-row-${app.application_id}">
                <td>${idx + 1}</td>
                <td>
                    <strong>${app.student_name}</strong><br>
                    <small style="color:#666;">${app.student_email}</small><br>
                    <small style="color:#888;">Roll: ${app.roll_number || 'N/A'}</small>
                </td>
                <td>
                    <span class="badge info">${app.branch || 'N/A'}</span><br>
                    <small>CGPA: <strong>${cgpaStr}</strong></small><br>
                    <small>Backlogs: ${app.backlogs !== undefined ? app.backlogs : 0}</small>
                </td>
                <td><strong>${app.company_name}</strong></td>
                <td>${app.job_title}<br><small style="color:#198754; font-weight:bold;">₹${parseFloat(app.package_lpa).toFixed(2)} LPA</small></td>
                <td>${dateStr}</td>
                <td>${statusBadge}</td>
                <td>
                    <div style="display:flex; flex-direction:column; gap:0.35rem;">
                        ${app.status !== 'Shortlisted' ? `
                            <button class="btn success" onclick="updateApplicationStatus(${app.application_id}, 'Shortlisted')" style="font-size:0.75rem; padding:0.25rem 0.5rem;">
                                🎉 Shortlist
                            </button>
                        ` : ''}
                        ${app.status !== 'Rejected' ? `
                            <button class="btn" onclick="updateApplicationStatus(${app.application_id}, 'Rejected')" style="background:#dc3545; font-size:0.75rem; padding:0.25rem 0.5rem;">
                                ❌ Reject
                            </button>
                        ` : ''}
                        ${app.status !== 'Applied' ? `
                            <button class="btn secondary" onclick="updateApplicationStatus(${app.application_id}, 'Applied')" style="font-size:0.75rem; padding:0.25rem 0.5rem;">
                                🔄 Under Review
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Update Application Status (Shortlisted, Rejected, Applied)
async function updateApplicationStatus(applicationId, newStatus) {
    const res = await apiCall(`/api/applications/${applicationId}/status`, 'PUT', { status: newStatus });
    if (res.ok && res.data.success) {
        // Update in-memory cache
        const app = cachedApplications.find(a => a.application_id === applicationId);
        if (app) app.status = newStatus;
        applyApplicationFilters();
    } else {
        alert(`❌ Failed to update application status: ${res.data.message || 'Server error'}`);
    }
}

// Filter button active style toggle
function setAppStatusFilter(status) {
    activeAppStatusFilter = status;
    const buttons = ['status-all', 'status-applied', 'status-shortlisted', 'status-rejected'];
    buttons.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.className = 'btn secondary';
    });

    const activeEl = document.getElementById(`status-${status.toLowerCase()}`);
    if (activeEl) activeEl.className = 'btn';

    applyApplicationFilters();
}

// ------------------------------------------------------------------------------
// 8. Utility Helpers
// ------------------------------------------------------------------------------
function getStatusBadge(status) {
    if (status === 'Shortlisted') {
        return '<span class="badge shortlisted">🎉 Shortlisted</span>';
    } else if (status === 'Rejected') {
        return '<span class="badge rejected">❌ Rejected</span>';
    }
    return '<span class="badge applied">⏳ Under Review</span>';
}

// ------------------------------------------------------------------------------
// 9. DOM Ready Event Listeners
// ------------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Determine page context and load appropriate handler
    if (document.getElementById('admin-dashboard-view')) {
        loadAdminDashboard();
    }

    if (document.getElementById('admin-companies-tbody')) {
        loadCompaniesPage();

        const form = document.getElementById('company-form');
        if (form) form.addEventListener('submit', handleCompanyFormSubmit);

        const searchInput = document.getElementById('filter-company-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const term = searchInput.value.toLowerCase().trim();
                const filtered = cachedCompanies.filter(c =>
                    c.name.toLowerCase().includes(term) ||
                    (c.location && c.location.toLowerCase().includes(term)) ||
                    (c.industry && c.industry.toLowerCase().includes(term))
                );
                renderCompaniesTable(filtered);
            });
        }
    }

    if (document.getElementById('admin-jobs-tbody')) {
        loadJobsPage();

        const form = document.getElementById('job-form');
        if (form) form.addEventListener('submit', handleJobFormSubmit);

        const searchInput = document.getElementById('filter-job-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const term = searchInput.value.toLowerCase().trim();
                const filtered = cachedJobs.filter(j =>
                    j.title.toLowerCase().includes(term) ||
                    j.company_name.toLowerCase().includes(term)
                );
                renderAdminJobsTable(filtered);
            });
        }
    }

    if (document.getElementById('admin-applications-tbody')) {
        loadApplicationsPage();

        const jobFilter = document.getElementById('filter-app-job');
        if (jobFilter) jobFilter.addEventListener('change', applyApplicationFilters);

        const compFilter = document.getElementById('filter-app-company');
        if (compFilter) compFilter.addEventListener('change', applyApplicationFilters);

        const searchFilter = document.getElementById('filter-app-search');
        if (searchFilter) searchFilter.addEventListener('input', applyApplicationFilters);
    }
});
