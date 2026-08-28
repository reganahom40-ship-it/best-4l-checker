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

// Tab State
let activeResultTab = 'available';

// DOM Elements
const elApiPreset = document.getElementById('apiPreset');
const elGenMode = document.getElementById('genMode');
const elIdentifiersGroup = document.getElementById('identifiers-group');
const elIdentifiers = document.getElementById('identifiers');
const elTargetUrl = document.getElementById('targetUrl');
const elMethod = document.getElementById('method');
const elDelaySlider = document.getElementById('delaySlider');
const elLblSpeed = document.getElementById('lblSpeed');
const elHeaders = document.getElementById('headers');
const elRequestBody = document.getElementById('requestBody');
const elAutoRetry = document.getElementById('autoRetry');
const elSoundAlert = document.getElementById('soundAlert');

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
const elTotalHits = document.getElementById('lblTotalHits');
const elLastCheck = document.getElementById('lblLastCheck');
const elETA = document.getElementById('lblETA');

const elSysDot = document.getElementById('sysDot');
const elSysStatusText = document.getElementById('sysStatusText');

const elTabAvailable = document.getElementById('tab-available');
const elTabTaken = document.getElementById('tab-taken');

// Preset Switcher
elApiPreset.addEventListener('change', () => {
  const preset = elApiPreset.value;
  if (preset === 'discord') {
    elTargetUrl.value = 'https://discord.com/api/v9/users/@me/pomelo-attempt';
    elMethod.value = 'POST';
    elHeaders.value = '{\n  "Authorization": "YOUR_DISCORD_TOKEN",\n  "Content-Type": "application/json"\n}';
    elRequestBody.value = '{\n  "username": "{id}"\n}';
    log('Loaded Discord Pomelo Preset. Enter your Discord Token in Custom Headers.', 'warn');
  } else if (preset === 'github') {
    elTargetUrl.value = 'https://api.github.com/users/{id}';
    elMethod.value = 'GET';
    elHeaders.value = '{\n  "User-Agent": "Snowflake-Checker"\n}';
    elRequestBody.value = '';
    log('Loaded GitHub Username Preset.', 'info');
  } else if (preset === 'mock') {
    elTargetUrl.value = window.location.origin + '/api/mock-check/{id}';
    elMethod.value = 'GET';
    elHeaders.value = '';
    elRequestBody.value = '';
    log('Loaded Local Mock Test Simulator.', 'info');
  }
});

// Slider Label
elDelaySlider.addEventListener('input', () => {
  elLblSpeed.textContent = `${elDelaySlider.value}ms`;
});

// Chime Alert via Web Audio
function playSuccessSound() {
  if (!elSoundAlert.checked) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    
    osc.start();
    osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.08); // A5
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    
    osc.stop(ctx.currentTime + 0.3);
  } catch (err) {
    console.error('Audio chime error:', err);
  }
}

// Log messages
function log(msg, type = 'info') {
  const time = new Date().toLocaleTimeString();
  const row = document.createElement('div');
  row.className = 'log-entry';

  const spanTime = document.createElement('span');
  spanTime.className = 'time';
  spanTime.textContent = `[${time}]`;
  row.appendChild(spanTime);

  const spanTag = document.createElement('span');
  if (type === 'success') {
    spanTag.className = 'tag tag-hit';
    spanTag.textContent = '[HIT]';
  } else if (type === 'warn') {
    spanTag.className = 'tag tag-warn';
    spanTag.textContent = '[429]';
  } else if (type === 'error') {
    spanTag.className = 'tag tag-err';
    spanTag.textContent = '[ERR]';
  } else {
    spanTag.className = 'tag tag-taken';
    spanTag.textContent = '[SYS]';
  }
  row.appendChild(spanTag);

  const spanMsg = document.createElement('span');
  spanMsg.textContent = msg;
  row.appendChild(spanMsg);

  elLogContent.appendChild(row);
  elLogContent.scrollTop = elLogContent.scrollHeight;
}

// Update stats tiles
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

  elTotalHits.textContent = totalRequests;
}

// Update duration and ETA
function updateMetrics() {
  if (!startTime) return;
  const diff = Date.now() - startTime;
  const hours = String(Math.floor(diff / 3600000)).padStart(2, '0');
  const minutes = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
  const seconds = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
  elDuration.textContent = `${hours}:${minutes}:${seconds}`;

  const elapsedMinutes = diff / 60000;
  if (elapsedMinutes > 0.05) {
    elReqMin.textContent = Math.round(totalRequests / elapsedMinutes);
  } else {
    elReqMin.textContent = '0';
  }

  const remaining = totalCount - scannedCount;
  if (remaining <= 0) {
    elETA.textContent = '00:00:00';
    return;
  }

  const delayMs = parseInt(elDelaySlider.value, 10);
  if (delayMs === 0) {
    elETA.textContent = 'Instant';
  } else {
    const totalRemainingSecs = Math.round((remaining * delayMs) / 1000);
    const etaH = String(Math.floor(totalRemainingSecs / 3600)).padStart(2, '0');
    const etaM = String(Math.floor((totalRemainingSecs % 3600) / 60)).padStart(2, '0');
    const etaS = String(totalRemainingSecs % 60).padStart(2, '0');
    elETA.textContent = `${etaH}:${etaM}:${etaS}`;
  }
}

// Render Results List with individual copy options
function renderList() {
  elResultsDisplayList.textContent = '';
  const currentList = activeResultTab === 'available' ? availableList : checkedList;

  if (currentList.length === 0) {
    const emptyPrompt = document.createElement('div');
    emptyPrompt.className = 'empty-prompt';
    emptyPrompt.id = 'list-empty-state';
    emptyPrompt.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
      <div>No ${activeResultTab} records found yet.</div>
    `;
    elResultsDisplayList.appendChild(emptyPrompt);
    return;
  }

  currentList.forEach(item => {
    const card = document.createElement('div');
    card.className = `item-card ${item.status}`;
    
    const leftBox = document.createElement('div');
    leftBox.className = 'item-identifier';
    
    const dot = document.createElement('div');
    dot.className = 'item-dot';
    leftBox.appendChild(dot);
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = item.name;
    leftBox.appendChild(nameSpan);

    card.appendChild(leftBox);

    const rightPill = document.createElement('span');
    rightPill.className = `item-pill ${item.status}`;
    rightPill.textContent = item.status === 'available' ? 'AVAILABLE' : `TAKEN (${item.code})`;
    card.appendChild(rightPill);

    elResultsDisplayList.appendChild(card);
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
  elTotalHits.textContent = '0';
  elLastCheck.textContent = 'Never';
  elETA.textContent = '00:00:00';

  updateStatsUI();
  renderList();
  log('Dashboard reset completed.');
}

// Combinations Generator
function generateCombinations(mode) {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const alphanum = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const list = [];

  if (mode === 'auto3') {
    for (let i = 0; i < letters.length; i++) {
      for (let j = 0; j < letters.length; j++) {
        for (let k = 0; k < letters.length; k++) {
          list.push(letters[i] + letters[j] + letters[k]);
        }
      }
    }
  } else if (mode === 'auto4') {
    for (let i = 0; i < letters.length; i++) {
      for (let j = 0; j < letters.length; j++) {
        for (let k = 0; k < letters.length; k++) {
          for (let l = 0; l < letters.length; l++) {
            list.push(letters[i] + letters[j] + letters[k] + letters[l]);
          }
        }
      }
    }
  } else if (mode === 'auto4num') {
    for (let i = 0; i < alphanum.length; i++) {
      for (let j = 0; j < alphanum.length; j++) {
        for (let k = 0; k < alphanum.length; k++) {
          for (let l = 0; l < alphanum.length; l++) {
            list.push(alphanum[i] + alphanum[j] + alphanum[k] + alphanum[l]);
          }
        }
      }
    }
  }
  return list;
}

// Main check loop
async function startChecking() {
  if (isRunning) return;

  const mode = elGenMode.value;
  if (mode === 'manual') {
    const rawText = elIdentifiers.value.trim();
    if (!rawText) {
      alert('Please enter at least one identifier.');
      return;
    }
    queue = rawText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  } else {
    log(`Generating combinations for mode: ${mode}...`);
    queue = generateCombinations(mode);
    log(`Successfully prepared ${queue.length} targets.`);
  }

  let headers = {};
  let rawBody = '';
  try {
    if (elHeaders.value.trim()) headers = JSON.parse(elHeaders.value);
    rawBody = elRequestBody.value.trim();
    if (rawBody) JSON.parse(rawBody);
  } catch (e) {
    log(`JSON parser error: Check your headers/body syntax: ${e.message}`, 'error');
    return;
  }

  if (elApiPreset.value === 'discord' && headers.Authorization && headers.Authorization.includes('YOUR_DISCORD_TOKEN')) {
    log('Warning: You are using the default placeholder Discord Token. Requests may return 401 Unauthorized until you provide your real user token.', 'warn');
  }

  totalCount = queue.length;
  scannedCount = 0;
  totalRequests = 0;
  updateStatsUI();

  isRunning = true;
  elBtnStart.style.display = 'none';
  elBtnStop.style.display = 'flex';
  toggleInputs(true);

  elSysDot.className = 'status-dot scanning';
  elSysStatusText.textContent = 'Status: Scanning...';

  startTime = Date.now();
  durationInterval = setInterval(updateMetrics, 1000);

  log(`Live scanner initiated for ${totalCount} targets...`);

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
        let resData;
        const isSameOrigin = targetUrl.startsWith('/') || targetUrl.startsWith(window.location.origin);
        
        if (isSameOrigin) {
          const relativeUrl = targetUrl.startsWith(window.location.origin)
            ? targetUrl.substring(window.location.origin.length)
            : targetUrl;
            
          const fetchOptions = {
            method: elMethod.value,
            headers: { ...headers }
          };
          
          if (requestPayload && ['POST', 'PUT', 'PATCH'].includes(elMethod.value.toUpperCase())) {
            fetchOptions.body = typeof requestPayload === 'object' ? JSON.stringify(requestPayload) : requestPayload;
            fetchOptions.headers['Content-Type'] = 'application/json';
          }
          
          const response = await fetch(relativeUrl, fetchOptions);
          const responseText = await response.text();
          const responseHeaders = {};
          if (response.headers.has('retry-after')) {
            responseHeaders['retry-after'] = response.headers.get('retry-after');
          }
          
          resData = {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
            data: responseText
          };
        } else {
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

          resData = await response.json();
          
          if (!response.ok) {
            throw new Error(resData.message || `Proxy error ${response.status}`);
          }
        }

        const remoteStatus = resData.status;
        let jsonPayload = null;
        try {
          if (resData.data) {
            jsonPayload = typeof resData.data === 'string' ? JSON.parse(resData.data) : resData.data;
          }
        } catch (e) {}

        // HTTP 429 - Rate Limited
        if (remoteStatus === 429) {
          rateLimitedCount++;
          updateStatsUI();

          let waitSec = 5;
          if (resData.headers && resData.headers['retry-after']) {
            const parsed = parseInt(resData.headers['retry-after'], 10);
            if (!isNaN(parsed)) waitSec = parsed;
          } else if (jsonPayload && jsonPayload.retry_after) {
            waitSec = Math.ceil(jsonPayload.retry_after);
          }

          log(`Rate limited on "${id}" (HTTP 429). Retry in ${waitSec}s`, 'warn');

          if (elAutoRetry.checked) {
            log(`Backing off: Waiting ${waitSec} seconds...`, 'warn');
            for (let s = waitSec; s > 0; s--) {
              if (!isRunning) break;
              await new Promise(r => setTimeout(r, 1000));
            }
            continue;
          } else {
            failedCount++;
            success = true;
          }
        }
        // HTTP 401 - Unauthorized
        else if (remoteStatus === 401) {
          failedCount++;
          log(`[AUTH ERROR] 401 Unauthorized on "${id}". Check your Authorization token in Custom Headers.`, 'error');
          success = true;
        }
        // Discord Pomelo checks
        else if (jsonPayload && typeof jsonPayload.taken === 'boolean') {
          if (jsonPayload.taken === false) {
            availableCount++;
            availableList.push({ name: id, status: 'available', code: 200 });
            log(`[AVAILABLE] "${id}" is FREE on Discord!`, 'success');
            playSuccessSound();
          } else {
            takenCount++;
            checkedList.push({ name: id, status: 'taken', code: 200 });
            log(`[TAKEN] "${id}" is taken.`, 'info');
          }
          success = true;
        }
        // GitHub mode (404 = available)
        else if (elApiPreset.value === 'github') {
          if (remoteStatus === 404) {
            availableCount++;
            availableList.push({ name: id, status: 'available', code: 404 });
            log(`[AVAILABLE] "${id}" is free on GitHub!`, 'success');
            playSuccessSound();
          } else if (remoteStatus === 200) {
            takenCount++;
            checkedList.push({ name: id, status: 'taken', code: 200 });
            log(`[TAKEN] "${id}" is registered on GitHub.`, 'info');
          } else {
            failedCount++;
            log(`Status ${remoteStatus} for "${id}"`, 'error');
          }
          success = true;
        }
        // Standard HTTP Code check
        else if (remoteStatus === 200) {
          availableCount++;
          availableList.push({ name: id, status: 'available', code: 200 });
          log(`[AVAILABLE] "${id}" returned HTTP 200`, 'success');
          playSuccessSound();
          success = true;
        } 
        else if ([400, 403, 404, 409].includes(remoteStatus)) {
          takenCount++;
          checkedList.push({ name: id, status: 'taken', code: remoteStatus });
          log(`[TAKEN] "${id}" (${remoteStatus})`, 'info');
          success = true;
        } 
        else {
          failedCount++;
          log(`Status code ${remoteStatus} for "${id}"`, 'error');
          success = true;
        }

      } catch (err) {
        failedCount++;
        log(`Network error "${id}": ${err.message}`, 'error');
        success = true;
      }
    }

    scannedCount++;
    updateStatsUI();
    renderList();

    if (isRunning && queue.length > 0) {
      const ms = parseInt(elDelaySlider.value, 10);
      if (ms > 0) await new Promise(r => setTimeout(r, ms));
    }
  }

  stopChecking();
  log('Scan queue finished.');
}

// Stop checking
function stopChecking() {
  isRunning = false;
  elBtnStart.style.display = 'flex';
  elBtnStop.style.display = 'none';
  toggleInputs(false);
  
  elSysDot.className = 'status-dot';
  elSysStatusText.textContent = 'Status: Idle';

  if (durationInterval) {
    clearInterval(durationInterval);
    durationInterval = null;
  }
}

// Toggle form inputs
function toggleInputs(disabled) {
  elApiPreset.disabled = disabled;
  elGenMode.disabled = disabled;
  elIdentifiers.disabled = disabled;
  elDelaySlider.disabled = disabled;
  elTargetUrl.disabled = disabled;
  elMethod.disabled = disabled;
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
  log(`Exported ${currentList.length} ${activeResultTab} items to clipboard.`);
});

elBtnClearLogs.addEventListener('click', () => {
  elLogContent.textContent = '';
});

// Select change
elGenMode.addEventListener('change', () => {
  if (elGenMode.value === 'manual') {
    elIdentifiersGroup.style.display = 'flex';
  } else {
    elIdentifiersGroup.style.display = 'none';
  }
});

// Initialize
window.addEventListener('DOMContentLoaded', () => {
  elLblSpeed.textContent = `${elDelaySlider.value}ms`;
  renderList();
  log('Snowflake v3.0 core online. Select platform preset and begin.');
});
