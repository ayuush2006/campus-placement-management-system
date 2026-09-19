// frontend/js/app.js
// Vanilla JavaScript for the frontend (Phase 2)

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

// Initialize checks on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    checkServerHealth();
    checkDatabaseConnection();

    // Event listeners for buttons
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', checkServerHealth);
    }

    const dbRefreshBtn = document.getElementById('db-refresh-btn');
    if (dbRefreshBtn) {
        dbRefreshBtn.addEventListener('click', checkDatabaseConnection);
    }
});
