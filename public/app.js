let isRunning = false;
let queue = [];
let totalCount = 0;
let scannedCount = 0;
let availableCount = 0;
let takenCount = 0;
let rateLimitedCount = 0;
let failedCount = 0;

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
const elBtnClearChecked = document.getElementById('btnClearChecked');

const elStatScanned = document.getElementById('statScanned');
const elStatAvailable = document.getElementById('statAvailable');
const elStatTaken = document.getElementById('statTaken');
const elStatLimited = document.getElementById('statLimited');
const elStatFailed = document.getElementById('statFailed');

const elListAvailable = document.getElementById('listAvailable');
const elListTaken = document.getElementById('listTaken');
const elLogContent = document.getElementById('logContent');

// Append log entry to console UI
function log(msg, type = 'info') {
  const time = new Date().toLocaleTimeString();
  const div = document.createElement('div');
  div.className = `log-entry`;
  
  const spanTime = document.createElement('span');
  spanTime.className = 'log-time';
  spanTime.textContent = `[${time}]`;
  div.appendChild(spanTime);

  const spanMsg = document.createElement('span');
  spanMsg.textContent = msg;
  if (type === 'error') spanMsg.className = 'log-err';
  if (type === 'warn') spanMsg.className = 'log-warn';
  div.appendChild(spanMsg);

  elLogContent.appendChild(div);
  elLogContent.scrollTop = elLogContent.scrollHeight;
}

// Format and parse custom headers input safely
function parseJSON(str, fieldName) {
  if (!str.trim()) return {};
  try {
    return JSON.parse(str);
  } catch (e) {
    log(`Invalid JSON format in ${fieldName}: ${e.message}`, 'error');
    throw e;
  }
}

// Sleep utility function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Reset stats on UI
function resetStats() {
  scannedCount = 0;
  availableCount = 0;
  takenCount = 0;
  rateLimitedCount = 0;
  failedCount = 0;
  updateStatsUI();
  elListAvailable.textContent = '';
  elListTaken.textContent = '';
  log('Stats and lists reset.');
}

// Update stats panels
function updateStatsUI() {
  elStatScanned.textContent = `${scannedCount} / ${totalCount}`;
  elStatAvailable.textContent = availableCount;
  elStatTaken.textContent = takenCount;
  elStatLimited.textContent = rateLimitedCount;
  elStatFailed.textContent = failedCount;
}

// Start checking process
async function startChecking() {
  if (isRunning) return;

  const identifiersText = elIdentifiers.value.trim();
  if (!identifiersText) {
    alert('Please enter at least one identifier to check.');
    return;
  }

  let headers = {};
  let requestBodyRaw = '';
  try {
    headers = parseJSON(elHeaders.value, 'Custom Headers');
    requestBodyRaw = elRequestBody.value.trim();
    if (requestBodyRaw) {
      parseJSON(requestBodyRaw, 'Request Body template');
    }
  } catch (e) {
    // Parsing error already logged
    return;
  }

  // Populate queue
  queue = identifiersText.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  totalCount = queue.length;
  scannedCount = 0;
  updateStatsUI();

  // Set running state
  isRunning = true;
  elBtnStart.disabled = true;
  elBtnStart.textContent = 'Running...';
  elBtnStop.disabled = false;
  toggleInputs(true);

  log(`Started checking batch of ${totalCount} identifiers...`);

  while (isRunning && queue.length > 0) {
    const id = queue.shift();
    log(`Checking identifier: "${id}"...`);

    const targetUrl = elTargetUrl.value.replace('{id}', encodeURIComponent(id));
    let finalBody = null;
    
    if (requestBodyRaw) {
      finalBody = requestBodyRaw.replace(/{id}/g, id);
      try {
        finalBody = JSON.parse(finalBody);
      } catch (err) {
        log(`Failed to inject "${id}" into body template. Sending raw text instead.`, 'warn');
        finalBody = requestBodyRaw.replace(/{id}/g, id);
      }
    }

    let success = false;
    let retries = 0;

    while (isRunning && !success) {
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
            body: finalBody
          })
        });

        const resData = await response.json();

        if (!response.ok) {
          throw new Error(resData.message || `Proxy server error: ${response.status}`);
        }

        const remoteStatus = resData.status;
        
        // Handle Rate Limit (HTTP 429)
        if (remoteStatus === 429) {
          rateLimitedCount++;
          updateStatsUI();
          
          let waitSeconds = 5; // Default fallback delay
          if (resData.headers && resData.headers['retry-after']) {
            const retryAfter = parseInt(resData.headers['retry-after'], 10);
            if (!isNaN(retryAfter)) {
              waitSeconds = retryAfter;
            }
          }

          log(`Rate limited on "${id}". Status 429. Retry-After: ${waitSeconds}s`, 'warn');

          if (elAutoRetry.checked) {
            log(`Waiting ${waitSeconds} seconds before retrying "${id}"...`, 'warn');
            
            // Countdown visual aid in logs
            for (let i = waitSeconds; i > 0; i--) {
              if (!isRunning) break;
              await sleep(1000);
            }
            retries++;
            continue; // Loop again, retry request
          } else {
            failedCount++;
            success = true; // Complete current item as failed
          }
        } 
        
        // Handle Available (HTTP 200)
        else if (remoteStatus === 200) {
          availableCount++;
          elListAvailable.textContent += `${id}\n`;
          log(`[AVAILABLE] "${id}" returned HTTP 200.`);
          success = true;
        } 
        
        // Handle Taken (HTTP 409 or other registered signifiers)
        else if (remoteStatus === 409 || remoteStatus === 403 || remoteStatus === 400) {
          takenCount++;
          elListTaken.textContent += `${id} (Status ${remoteStatus})\n`;
          log(`[TAKEN/UNAVAILABLE] "${id}" returned HTTP ${remoteStatus}.`);
          success = true;
        } 
        
        // General Other Statuses
        else {
          failedCount++;
          log(`Unexpected status code ${remoteStatus} for "${id}"`, 'error');
          success = true;
        }

      } catch (err) {
        failedCount++;
        log(`Failed check for "${id}": ${err.message}`, 'error');
        success = true; // Move to next to prevent infinite loops on connection drops
      }
    }

    scannedCount++;
    updateStatsUI();

    // Base Delay between checks
    if (isRunning && queue.length > 0) {
      const baseDelay = parseInt(elDelay.value, 10) || 1000;
      if (baseDelay > 0) {
        await sleep(baseDelay);
      }
    }
  }

  stopChecking();
  log('Checker run finished.');
}

// Stop checking process
function stopChecking() {
  isRunning = false;
  elBtnStart.disabled = false;
  elBtnStart.textContent = 'Start Checking';
  elBtnStop.disabled = true;
  toggleInputs(false);
}

// Enable/Disable form controls
function toggleInputs(disable) {
  elIdentifiers.disabled = disable;
  elTargetUrl.disabled = disable;
  elMethod.disabled = disable;
  elDelay.disabled = disable;
  elHeaders.disabled = disable;
  elRequestBody.disabled = disable;
}

// Event Listeners
elBtnStart.addEventListener('click', startChecking);
elBtnStop.addEventListener('click', stopChecking);
elBtnReset.addEventListener('click', resetStats);

elBtnExport.addEventListener('click', () => {
  const content = elListAvailable.textContent;
  if (!content) {
    alert('No available identifiers to export.');
    return;
  }
  navigator.clipboard.writeText(content);
  log('Available identifiers list copied to clipboard!');
});

elBtnClearChecked.addEventListener('click', () => {
  elListTaken.textContent = '';
  log('Cleared taken/checked list.');
});
