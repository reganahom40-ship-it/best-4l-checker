// State Variables
let isRunning = false;
let queue = [];
let totalCount = 0;
let scannedCount = 0;
let availableCount = 0;
let takenCount = 0;
let rateLimitedCount = 0;
let failedCount = 0;

let availableList = [];
let checkedList = [];

// Timers & Metrics
let startTime = null;
let durationInterval = null;
let totalRequests = 0;

// Chart Instances
let progressChart = null;
let donutChart = null;

// Tab State
let activeResultTab = 'available'; // 'available' or 'taken'

// DOM Elements
const elIdentifiers = document.getElementById('identifiers');
const elTargetUrl = document.getElementById('targetUrl');
const elMethod = document.getElementById('method');
const elDelay = document.getElementById('delay');
const elHeaders = document.getElementById('headers');
const elRequestBody = document.getElementById('requestBody');
const elAutoRetry = document.getElementById('autoRetry');

const elBtnStart = document.getElementById('btnStart');
const elBtnStop = document.getElementById('btnStop');
const elBtnReset = document.getElementById('btnReset');
const elBtnExport = document.getElementById('btnExport');
const elBtnClearLogs = document.getElementById('btnClearLogs');

const elStatScanned = document.getElementById('statScanned');
const elStatAvailable = document.getElementById('statAvailable');
const elStatTaken = document.getElementById('statTaken');
const elStatLimited = document.getElementById('statLimited');
const elStatFailed = document.getElementById('statFailed');

const elPctScanned = document.getElementById('pctScanned');
const elPctAvailable = document.getElementById('pctAvailable');
const elPctTaken = document.getElementById('pctTaken');
const elPctLimited = document.getElementById('pctLimited');
const elPctFailed = document.getElementById('pctFailed');

const elBadgeAvailable = document.getElementById('badgeAvailable');
const elBadgeTaken = document.getElementById('badgeTaken');

const elResultsDisplayList = document.getElementById('results-display-list');
const elLogContent = document.getElementById('logContent');

const elDuration = document.getElementById('lblDuration');
const elReqMin = document.getElementById('lblReqMin');
const elTotalReq = document.getElementById('lblTotalReq');
const elLastCheck = document.getElementById('lblLastCheck');

const elTabAvailable = document.getElementById('tab-available');
const elTabTaken = document.getElementById('tab-taken');

// Sidebar Tabs (Dashboard / Logs toggling)
const elMenuDashboard = document.getElementById('menu-dashboard');
const elMenuLogs = document.getElementById('menu-logs');

// Initialize Charts
function initCharts() {
  const ctxProgress = document.getElementById('progressChart').getContext('2d');
  progressChart = new Chart(ctxProgress, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Scanned',
          data: [],
          borderColor: '#8b5cf6',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: false
        },
        {
          label: 'Available',
          data: [],
          borderColor: '#10b981',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { display: false }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { font: { size: 9 }, color: '#9ca3af' }
        }
      }
    }
  });

  const ctxDonut = document.getElementById('donutChart').getContext('2d');
  donutChart = new Chart(ctxDonut, {
    type: 'doughnut',
    data: {
      labels: ['Available', 'Taken', 'Limited', 'Failed'],
      datasets: [{
        data: [0, 0, 0, 0],
        backgroundColor: [
          '#10b981',
          'rgba(255, 255, 255, 0.08)',
          '#f59e0b',
          '#ef4444'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      cutout: '72%'
    }
  });
}

// Log rows to dashboard
function log(msg, type = 'info') {
  const time = new Date().toLocaleTimeString();
  const row = document.createElement('div');
  row.className = 'log-row';

  const spanTime = document.createElement('span');
  spanTime.className = 'time';
  spanTime.textContent = `[${time}]`;
  row.appendChild(spanTime);

  const spanMsg = document.createElement('span');
  spanMsg.textContent = msg;

  if (type === 'error') spanMsg.className = 'status-other';
  else if (type === 'warn') spanMsg.className = 'status-429';
  else if (type === 'success') spanMsg.className = 'status-200';
  
  row.appendChild(spanMsg);
  elLogContent.appendChild(row);
  elLogContent.scrollTop = elLogContent.scrollHeight;
}

// Update stats percentages and numbers
function updateStatsUI() {
  const total = totalCount || 1;
  
  elStatScanned.textContent = `${scannedCount} / ${totalCount}`;
  elPctScanned.textContent = `${Math.round((scannedCount / total) * 100)}%`;

  elStatAvailable.textContent = availableCount;
  elPctAvailable.textContent = `${Math.round((availableCount / total) * 100)}%`;

  elStatTaken.textContent = takenCount;
  elPctTaken.textContent = `${Math.round((takenCount / total) * 100)}%`;

  elStatLimited.textContent = rateLimitedCount;
  elPctLimited.textContent = `${Math.round((rateLimitedCount / total) * 100)}%`;

  elStatFailed.textContent = failedCount;
  elPctFailed.textContent = `${Math.round((failedCount / total) * 100)}%`;

  elBadgeAvailable.textContent = availableCount;
  elBadgeTaken.textContent = takenCount;

  elTotalReq.textContent = totalRequests;

  // Update Donut Chart
  if (donutChart) {
    donutChart.data.datasets[0].data = [availableCount, takenCount, rateLimitedCount, failedCount];
    donutChart.update();
  }
}

// Format duration counter (hh:mm:ss)
function updateDuration() {
  if (!startTime) return;
  const diff = Date.now() - startTime;
  const hours = String(Math.floor(diff / 3600000)).padStart(2, '0');
  const minutes = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
  const seconds = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
  elDuration.textContent = `${hours}:${minutes}:${seconds}`;

  // Calculate Requests per Minute (RPM)
  const elapsedMinutes = diff / 60000;
  if (elapsedMinutes > 0.05) {
    elReqMin.textContent = Math.round(totalRequests / elapsedMinutes);
  } else {
    elReqMin.textContent = '0';
  }
}

// Render selected tab lists
function renderList() {
  elResultsDisplayList.textContent = '';
  const currentList = activeResultTab === 'available' ? availableList : checkedList;

  if (currentList.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.id = 'list-empty-state';
    emptyState.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
      <div>No ${activeResultTab} items. Start the checker to begin.</div>
    `;
    elResultsDisplayList.appendChild(emptyState);
    return;
  }

  currentList.forEach(item => {
    const row = document.createElement('div');
    row.className = `result-item ${item.status}`;
    
    const spanName = document.createElement('span');
    spanName.textContent = item.name;
    row.appendChild(spanName);

    const spanTag = document.createElement('span');
    spanTag.className = `result-tag ${item.status}`;
    spanTag.textContent = item.status === 'available' ? 'Available' : `Taken (${item.code})`;
    row.appendChild(spanTag);

    elResultsDisplayList.appendChild(row);
  });
}

// Reset stats completely
function resetStats() {
  scannedCount = 0;
  availableCount = 0;
  takenCount = 0;
  rateLimitedCount = 0;
  failedCount = 0;
  totalRequests = 0;
  availableList = [];
  checkedList = [];
  startTime = null;
  elDuration.textContent = '00:00:00';
  elReqMin.textContent = '0';
  elTotalReq.textContent = '0';
  elLastCheck.textContent = 'Never';

  if (progressChart) {
    progressChart.data.labels = [];
    progressChart.data.datasets[0].data = [];
    progressChart.data.datasets[1].data = [];
    progressChart.update();
  }

  updateStatsUI();
  renderList();
  log('Dashboard reset completed.');
}

// Main check function loop
async function startChecking() {
  if (isRunning) return;

  const rawText = elIdentifiers.value.trim();
  if (!rawText) {
    alert('Please enter at least one identifier.');
    return;
  }

  let headers = {};
  let rawBody = '';
  try {
    if (elHeaders.value.trim()) headers = JSON.parse(elHeaders.value);
    rawBody = elRequestBody.value.trim();
    if (rawBody) JSON.parse(rawBody);
  } catch (e) {
    log(`JSON parser failed: ${e.message}`, 'error');
    return;
  }

  queue = rawText.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  totalCount = queue.length;
  scannedCount = 0;
  totalRequests = 0;
  updateStatsUI();

  isRunning = true;
  elBtnStart.style.display = 'none';
  elBtnStop.style.display = 'inline-flex';
  toggleInputs(true);

  startTime = Date.now();
  durationInterval = setInterval(updateDuration, 1000);

  log(`Bulk scan initialized for ${totalCount} identifiers...`);

  let countIndex = 0;

  while (isRunning && queue.length > 0) {
    const id = queue.shift();
    const targetUrl = elTargetUrl.value.replace('{id}', encodeURIComponent(id));
    
    let requestPayload = null;
    if (rawBody) {
      requestPayload = rawBody.replace(/{id}/g, id);
      try {
        requestPayload = JSON.parse(requestPayload);
      } catch (err) {
        requestPayload = rawBody.replace(/{id}/g, id);
      }
    }

    let success = false;
    
    while (isRunning && !success) {
      totalRequests++;
      elLastCheck.textContent = new Date().toLocaleTimeString();

      try {
        const response = await fetch('/api/proxy-check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: targetUrl,
            method: elMethod.value,
            headers: headers,
            body: requestPayload
          })
        });

        const resData = await response.json();
        
        if (!response.ok) {
          throw new Error(resData.message || `Proxy server returned status ${response.status}`);
        }

        const remoteStatus = resData.status;

        // HTTP 429 - Rate Limited
        if (remoteStatus === 429) {
          rateLimitedCount++;
          updateStatsUI();

          let waitSec = 5;
          if (resData.headers && resData.headers['retry-after']) {
            const parsed = parseInt(resData.headers['retry-after'], 10);
            if (!isNaN(parsed)) waitSec = parsed;
          }

          log(`Rate limited on "${id}" (HTTP 429). Retry-After: ${waitSec}s`, 'warn');

          if (elAutoRetry.checked) {
            log(`Backing off: Waiting ${waitSec} seconds to retry...`, 'warn');
            for (let s = waitSec; s > 0; s--) {
              if (!isRunning) break;
              await new Promise(r => setTimeout(r, 1000));
            }
            continue; // Retry loops
          } else {
            failedCount++;
            success = true;
          }
        } 
        // HTTP 200 - Available
        else if (remoteStatus === 200) {
          availableCount++;
          availableList.push({ name: id, status: 'available', code: 200 });
          log(`[AVAILABLE] "${id}" returned status code 200.`, 'success');
          success = true;
        } 
        // HTTP 409, 403, 400 - Taken
        else if ([400, 403, 409].includes(remoteStatus)) {
          takenCount++;
          checkedList.push({ name: id, status: 'taken', code: remoteStatus });
          log(`[TAKEN] "${id}" returned status code ${remoteStatus}.`);
          success = true;
        } 
        // Other HTTP Failures
        else {
          failedCount++;
          log(`Unexpected response status ${remoteStatus} for "${id}"`, 'error');
          success = true;
        }

      } catch (err) {
        failedCount++;
        log(`Request error for "${id}": ${err.message}`, 'error');
        success = true;
      }
    }

    scannedCount++;
    countIndex++;
    
    // Update Line Graph
    if (progressChart) {
      progressChart.data.labels.push(countIndex);
      progressChart.data.datasets[0].data.push(scannedCount);
      progressChart.data.datasets[1].data.push(availableCount);
      
      // Limit graph points on screen
      if (progressChart.data.labels.length > 25) {
        progressChart.data.labels.shift();
        progressChart.data.datasets[0].data.shift();
        progressChart.data.datasets[1].data.shift();
      }
      progressChart.update();
    }

    updateStatsUI();
    renderList();

    // Delay between iterations
    if (isRunning && queue.length > 0) {
      const ms = parseInt(elDelay.value, 10) || 1000;
      if (ms > 0) await new Promise(r => setTimeout(r, ms));
    }
  }

  stopChecking();
  log('Queue scan run completed.');
}

// Stop loop
function stopChecking() {
  isRunning = false;
  elBtnStart.style.display = 'inline-flex';
  elBtnStop.style.display = 'none';
  toggleInputs(false);
  
  if (durationInterval) {
    clearInterval(durationInterval);
    durationInterval = null;
  }
}

// Toggle inputs block
function toggleInputs(disabled) {
  elIdentifiers.disabled = disabled;
  elTargetUrl.disabled = disabled;
  elMethod.disabled = disabled;
  elDelay.disabled = disabled;
  elHeaders.disabled = disabled;
  elRequestBody.disabled = disabled;
}

// Tab Toggles
elTabAvailable.addEventListener('click', () => {
  activeResultTab = 'available';
  elTabAvailable.className = 'tab-btn active';
  elTabTaken.className = 'tab-btn';
  renderList();
});

elTabTaken.addEventListener('click', () => {
  activeResultTab = 'taken';
  elTabAvailable.className = 'tab-btn';
  elTabTaken.className = 'tab-btn active';
  renderList();
});

// Event Listeners
elBtnStart.addEventListener('click', startChecking);
elBtnStop.addEventListener('click', stopChecking);
elBtnReset.addEventListener('click', resetStats);

elBtnExport.addEventListener('click', () => {
  const currentList = activeResultTab === 'available' ? availableList : checkedList;
  if (currentList.length === 0) {
    alert('No items to export.');
    return;
  }
  const txt = currentList.map(item => item.name).join('\n');
  navigator.clipboard.writeText(txt);
  log(`Copied ${currentList.length} items from ${activeResultTab} list to clipboard.`);
});

elBtnClearLogs.addEventListener('click', () => {
  elLogContent.textContent = '';
});

// Sidebar Page Toggling (visual focus only)
elMenuDashboard.addEventListener('click', () => {
  elMenuDashboard.className = 'menu-item active';
  elMenuLogs.className = 'menu-item';
  log('Switched to Dashboard view.');
});

elMenuLogs.addEventListener('click', () => {
  elMenuDashboard.className = 'menu-item';
  elMenuLogs.className = 'menu-item active';
  log('Switched to Logs view.');
  // Scroll to logs panel automatically
  elLogContent.scrollIntoView({ behavior: 'smooth' });
});

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
  initCharts();
  renderList();
  log('API Checker Dashboard initialized and ready.');
});
