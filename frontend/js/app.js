// frontend/js/app.js
// Vanilla JavaScript for the frontend

// Function to check the backend server health
async function checkServerHealth() {
    const statusContainer = document.getElementById('status-container');
    const statusText = document.getElementById('status-text');
    const rawResponse = document.getElementById('raw-response');

    // Display loading state
    statusContainer.className = 'status-box pending';
    statusText.textContent = 'Connecting to backend API...';
    rawResponse.textContent = 'Fetching /api/health...';

    try {
        // Send a GET request to the health-check route
        const response = await fetch('/api/health');
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // If response is successful, update UI with online status
        statusContainer.className = 'status-box online';
        statusText.textContent = `Online: ${data.message}`;
        rawResponse.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
        // If connection fails, update UI with offline status
        statusContainer.className = 'status-box offline';
        statusText.textContent = 'Backend server is unreachable. Make sure the server is running!';
        rawResponse.textContent = `Error: ${error.message}\n\nTip: Run "node server.js" in your terminal.`;
    }
}

// Run checkServerHealth when the webpage loads
document.addEventListener('DOMContentLoaded', () => {
    checkServerHealth();

    // Attach click handler to the refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', checkServerHealth);
    }
});
