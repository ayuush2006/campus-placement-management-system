// frontend/js/app.js
// Vanilla JavaScript for the frontend (Phase 3)

// 1. Function to check the backend Express server health
async function checkServerHealth() {
    const statusContainer = document.getElementById('status-container');
    const statusText = document.getElementById('status-text');
    const rawResponse = document.getElementById('raw-response');

    // Loading state
    statusContainer.className = 'status-box pending';
    statusText.textContent = 'Connecting to backend API...';
    rawResponse.textContent = 'Fetching /api/health...';

    try {
        const response = await fetch('/api/health');
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        statusContainer.className = 'status-box online';
        statusText.textContent = `Online: ${data.message}`;
        rawResponse.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
        statusContainer.className = 'status-box offline';
        statusText.textContent = 'Backend server unreachable. Make sure "npm start" is running!';
        rawResponse.textContent = `Error: ${error.message}`;
    }
}

// 2. Function to check the MySQL database connection
async function checkDatabaseConnection() {
    const dbStatusContainer = document.getElementById('db-status-container');
    const dbStatusText = document.getElementById('db-status-text');
    const dbRawResponse = document.getElementById('db-raw-response');

    // Loading state
    dbStatusContainer.className = 'status-box pending';
    dbStatusText.textContent = 'Testing connection to MySQL database...';
    dbRawResponse.textContent = 'Fetching /api/db-test...';

    try {
        const response = await fetch('/api/db-test');
        const data = await response.json();

        if (response.ok && data.success) {
            dbStatusContainer.className = 'status-box online';
            dbStatusText.textContent = `Connected to MySQL: ${data.tablesCount} tables found in "${data.database}"`;
            dbRawResponse.textContent = JSON.stringify(data, null, 2);
        } else {
            dbStatusContainer.className = 'status-box offline';
            dbStatusText.textContent = `MySQL Connection Issue: ${data.message}`;
            dbRawResponse.textContent = JSON.stringify(data, null, 2);
        }
    } catch (error) {
        dbStatusContainer.className = 'status-box offline';
        dbStatusText.textContent = 'Unable to reach backend /api/db-test endpoint.';
        dbRawResponse.textContent = `Error: ${error.message}`;
    }
}

// 3. Helper to explore REST APIs from the browser UI
async function exploreApi(endpoint, label) {
    const outputEl = document.getElementById('api-explorer-response');
    const labelEl = document.getElementById('api-endpoint-label');

    if (labelEl) labelEl.textContent = label;
    if (outputEl) outputEl.textContent = `Fetching ${endpoint}...`;

    try {
        const res = await fetch(endpoint);
        const data = await res.json();
        if (outputEl) outputEl.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
        if (outputEl) outputEl.textContent = `Error calling ${endpoint}: ${err.message}`;
    }
}

// Initialize checks on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    checkServerHealth();
    checkDatabaseConnection();

    // Event listeners for status checks
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) refreshBtn.addEventListener('click', checkServerHealth);

    const dbRefreshBtn = document.getElementById('db-refresh-btn');
    if (dbRefreshBtn) dbRefreshBtn.addEventListener('click', checkDatabaseConnection);

    // Event listeners for REST API explorer buttons
    const btnComp = document.getElementById('btn-get-companies');
    if (btnComp) btnComp.addEventListener('click', () => exploreApi('/api/companies', 'GET /api/companies'));

    const btnJobs = document.getElementById('btn-get-jobs');
    if (btnJobs) btnJobs.addEventListener('click', () => exploreApi('/api/jobs', 'GET /api/jobs'));

    const btnStudent = document.getElementById('btn-get-student');
    if (btnStudent) btnStudent.addEventListener('click', () => exploreApi('/api/students/2', 'GET /api/students/2'));

    const btnApps = document.getElementById('btn-get-apps');
    if (btnApps) btnApps.addEventListener('click', () => exploreApi('/api/applications/student/2', 'GET /api/applications/student/2'));
});
