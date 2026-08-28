// ==========================================
// SNOWFLAKE v4.0 PRO — REQUEST ARCHITECTURE
// ==========================================

// Global State
let isRunning = false;
let queue = [];
let totalCount = 0;
let scannedCount = 0;
let availableCount = 0;
let takenCount = 0;
let rateLimitedCount = 0;
let verificationCount = 0;
let failedCount = 0;

let availableList = [];
let checkedList = [];

// Latency & Metrics Tracking
let totalLatencyMs = 0;
let latencySamples = 0;
let startTime = null;
let durationInterval = null;
let totalRequests = 0;
let activeWorkersCount = 0;

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
const elConcurrencySlider = document.getElementById('concurrencySlider');
const elLblConcurrency = document.getElementById('lblConcurrency');
const elCredentialPoolInput = document.getElementById('credentialPoolInput');
const elProxyListInput = document.getElementById('proxyListInput');
const elRequestBody = document.getElementById('requestBody');
const elAutoRetry = document.getElementById('autoRetry');
const elSoundAlert = document.getElementById('soundAlert');

const elBtnStart = document.getElementById('btnStart');
const elBtnStop = document.getElementById('btnStop');
const elBtnReset = document.getElementById('btnReset');
const elBtnExport = document.getElementById('btnExport');
const elBtnClearLogs = document.getElementById('btnClearLogs');
const elBtnDismissVerification = document.getElementById('btnDismissVerification');

const elStatScanned = document.getElementById('statScanned');
const elStatAvailable = document.getElementById('statAvailable');
const elStatTaken = document.getElementById('statTaken');
const elStatLimited = document.getElementById('statLimited');
const elStatVerification = document.getElementById('statVerification');
const elStatAvgLatency = document.getElementById('statAvgLatency');

const elPctScanned = document.getElementById('pctScanned');
const elPctAvailable = document.getElementById('pctAvailable');
const elPctTaken = document.getElementById('pctTaken');
const elPctLimited = document.getElementById('pctLimited');
const elPctVerification = document.getElementById('pctVerification');

const elProgressFill = document.getElementById('progressFill');
const elLblProgressPct = document.getElementById('lblProgressPct');

const elBadgeAvailable = document.getElementById('badgeAvailable');
const elBadgeTaken = document.getElementById('badgeTaken');

const elResultsDisplayList = document.getElementById('results-display-list');
const elLogContent = document.getElementById('logContent');
const elCredentialStatusList = document.getElementById('credentialStatusList');
const elLblActiveCredsCount = document.getElementById('lblActiveCredsCount');
const elVerificationBanner = document.getElementById('verificationBanner');

const elDuration = document.getElementById('lblDuration');
const elReqMin = document.getElementById('lblReqMin');
const elTotalHits = document.getElementById('lblTotalHits');
const elLastCheck = document.getElementById('lblLastCheck');
const elETA = document.getElementById('lblETA');
const elActiveWorkers = document.getElementById('lblActiveWorkers');

const elSysDot = document.getElementById('sysDot');
const elSysStatusText = document.getElementById('sysStatusText');

const elTabAvailable = document.getElementById('tab-available');
const elTabTaken = document.getElementById('tab-taken');

// ==========================================
// 1. CREDENTIAL POOL MANAGER
// ==========================================
class CredentialPool {
  constructor() {
    this.credentials = [];
    this.currentIndex = 0;
  }

  loadFromInput(rawText) {
    const lines = rawText.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
    
    this.credentials = lines.map((token, idx) => ({
      id: idx + 1,
      token: token,
      masked: this.maskSecret(token),
      cooldownUntil: 0,
      requestsCount: 0,
      rateLimitCount: 0
    }));

    if (this.credentials.length === 0) {
      this.credentials.push({
        id: 1,
        token: '',
        masked: 'Unauthenticated',
        cooldownUntil: 0,
        requestsCount: 0,
        rateLimitCount: 0
      });
    }

    this.renderUI();
  }

  maskSecret(secret) {
    if (!secret || secret.length < 8) return 'Token #Active';
    return secret.substring(0, 4) + '...' + secret.substring(secret.length - 4);
  }

  getAvailableCredential() {
    const now = Date.now();
    const readyCreds = this.credentials.filter(c => c.cooldownUntil <= now);
    
    if (readyCreds.length === 0) {
      // All in cooldown: find the one that will be ready soonest
      let soonest = this.credentials[0];
      for (const c of this.credentials) {
        if (c.cooldownUntil < soonest.cooldownUntil) soonest = c;
      }
      const waitMs = Math.max(0, soonest.cooldownUntil - now);
      return { credential: null, waitMs: waitMs };
    }

    // Round-robin selection among ready credentials
    this.currentIndex = (this.currentIndex + 1) % readyCreds.length;
    const selected = readyCreds[this.currentIndex];
    selected.requestsCount++;
    this.renderUI();
    return { credential: selected, waitMs: 0 };
  }

  setCooldown(credId, seconds) {
    const cred = this.credentials.find(c => c.id === credId);
    if (cred) {
      cred.cooldownUntil = Date.now() + (seconds * 1000);
      cred.rateLimitCount++;
      this.renderUI();
    }
  }

  renderUI() {
    if (!elCredentialStatusList) return;
    elCredentialStatusList.innerHTML = '';
    const now = Date.now();

    elLblActiveCredsCount.textContent = this.credentials.length;

    this.credentials.forEach(c => {
      const isCooldown = c.cooldownUntil > now;
      const remainingSec = Math.ceil((c.cooldownUntil - now) / 1000);

      const row = document.createElement('div');
      row.className = 'credential-badge-row';

      const left = document.createElement('div');
      left.style.display = 'flex';
      left.style.alignItems = 'center';
      left.style.gap = '6px';

      const dot = document.createElement('div');
      dot.className = `cred-status-dot ${isCooldown ? 'cooldown' : ''}`;
      left.appendChild(dot);

      const label = document.createElement('span');
      label.textContent = c.masked;
      left.appendChild(label);

      row.appendChild(left);

      const right = document.createElement('span');
      right.style.color = isCooldown ? 'var(--amber)' : 'var(--text-muted)';
      right.textContent = isCooldown ? `Cooldown ${remainingSec}s` : `Reqs: ${c.requestsCount}`;
      row.appendChild(right);

      elCredentialStatusList.appendChild(row);
    });
  }
}

const credentialPool = new CredentialPool();

// ==========================================
// 2. PROXY POOL MANAGER
// ==========================================
class ProxyPool {
  constructor() {
    this.proxies = [];
    this.currentIndex = 0;
  }

  loadFromInput(rawText) {
    this.proxies = rawText.split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  getNextProxy() {
    if (this.proxies.length === 0) return null;
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    return this.proxies[this.currentIndex];
  }
}

const proxyPool = new ProxyPool();

// ==========================================
// 3. UI CONTROLS & LISTENERS
// ==========================================
elDelaySlider.addEventListener('input', () => {
  elLblSpeed.textContent = `${elDelaySlider.value}ms`;
});

elConcurrencySlider.addEventListener('input', () => {
  const val = elConcurrencySlider.value;
  elLblConcurrency.textContent = `${val} Worker${val > 1 ? 's' : ''}`;
});

elCredentialPoolInput.addEventListener('input', () => {
  credentialPool.loadFromInput(elCredentialPoolInput.value);
});

elProxyListInput.addEventListener('input', () => {
  proxyPool.loadFromInput(elProxyListInput.value);
});

elBtnDismissVerification.addEventListener('click', () => {
  elVerificationBanner.classList.remove('active');
});

elApiPreset.addEventListener('change', () => {
  const preset = elApiPreset.value;
  if (preset === 'discord') {
    elTargetUrl.value = 'https://discord.com/api/v9/users/@me/pomelo-attempt';
    elMethod.value = 'POST';
    elRequestBody.value = '{\n  "username": "{id}"\n}';
    log('Loaded Discord Pomelo Preset. Enter your authorized Discord token in the Credential Pool.', 'warn');
  } else if (preset === 'github') {
    elTargetUrl.value = 'https://api.github.com/users/{id}';
    elMethod.value = 'GET';
    elRequestBody.value = '';
    log('Loaded GitHub Users Preset (404 = Available, 200 = Taken).', 'info');
  } else if (preset === 'mock') {
    elTargetUrl.value = window.location.origin + '/api/mock-check/{id}';
    elMethod.value = 'GET';
    elRequestBody.value = '';
    log('Loaded Local Mock Test Simulator.', 'info');
  }
});

// Chime Alert via Web Audio API
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
  } catch (err) {}
}

// Log message to activity terminal
function log(msg, type = 'info') {
  const time = new Date().toLocaleTimeString();
  const row = document.createElement('div');
  row.className = 'log-item';

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

// Update dashboard statistics
function updateStatsUI() {
  const total = totalCount || 1;
  const pct = Math.round((scannedCount / total) * 100);

  elStatScanned.textContent = `${scannedCount} / ${totalCount}`;
  elPctScanned.textContent = `${pct}%`;

  if (elProgressFill) elProgressFill.style.width = `${pct}%`;
  if (elLblProgressPct) elLblProgressPct.textContent = `${pct}% Complete (${scannedCount}/${totalCount})`;

  elStatAvailable.textContent = availableCount;
  elPctAvailable.textContent = `${Math.round((availableCount / total) * 100)}%`;

  elStatTaken.textContent = takenCount;
  elPctTaken.textContent = `${Math.round((takenCount / total) * 100)}%`;

  elStatLimited.textContent = rateLimitedCount;
  elPctLimited.textContent = `${Math.round((rateLimitedCount / total) * 100)}%`;

  elStatVerification.textContent = verificationCount;
  elPctVerification.textContent = `${Math.round((verificationCount / total) * 100)}%`;

  if (latencySamples > 0) {
    const avgMs = Math.round(totalLatencyMs / latencySamples);
    elStatAvgLatency.textContent = `${avgMs}ms`;
  } else {
    elStatAvgLatency.textContent = '0ms';
  }

  elBadgeAvailable.textContent = availableCount;
  elBadgeTaken.textContent = takenCount;
  elTotalHits.textContent = totalRequests;
  elActiveWorkers.textContent = activeWorkersCount;
}

// Update duration, RPM, and ETA
function updateMetrics() {
  if (!startTime) return;
  const diff = Date.now() - startTime;
  const hours = String(Math.floor(diff / 3600000)).padStart(2, '0');
  const minutes = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
  const seconds = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
  elDuration.textContent = `${hours}:${minutes}:${seconds}`;

  const elapsedMinutes = diff / 60000;
  if (elapsedMinutes > 0.05) {
    elReqMin.textContent = `${Math.round(totalRequests / elapsedMinutes)} RPM`;
  } else {
    elReqMin.textContent = '0 RPM';
  }

  const remaining = totalCount - scannedCount;
  if (remaining <= 0) {
    elETA.textContent = '00:00:00';
    return;
  }

  const delayMs = parseInt(elDelaySlider.value, 10);
  const workers = Math.max(1, parseInt(elConcurrencySlider.value, 10));
  if (delayMs === 0) {
    elETA.textContent = 'Instant';
  } else {
    const totalRemainingSecs = Math.round(((remaining * delayMs) / workers) / 1000);
    const etaH = String(Math.floor(totalRemainingSecs / 3600)).padStart(2, '0');
    const etaM = String(Math.floor((totalRemainingSecs % 3600) / 60)).padStart(2, '0');
    const etaS = String(totalRemainingSecs % 60).padStart(2, '0');
    elETA.textContent = `${etaH}:${etaM}:${etaS}`;
  }

  credentialPool.renderUI();
}

// Render Results List
function renderList() {
  elResultsDisplayList.textContent = '';
  const currentList = activeResultTab === 'available' ? availableList : checkedList;

  if (currentList.length === 0) {
    const emptyPrompt = document.createElement('div');
    emptyPrompt.className = 'empty-state';
    emptyPrompt.id = 'list-empty-state';
    emptyPrompt.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
      <div>No ${activeResultTab} records captured yet.</div>
    `;
    elResultsDisplayList.appendChild(emptyPrompt);
    return;
  }

  currentList.forEach(item => {
    const card = document.createElement('div');
    card.className = `result-row ${item.status}`;
    
    const leftBox = document.createElement('div');
    leftBox.className = 'row-identifier';
    
    const dot = document.createElement('div');
    dot.className = 'row-dot';
    leftBox.appendChild(dot);
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = item.name;
    leftBox.appendChild(nameSpan);

    card.appendChild(leftBox);

    const rightPill = document.createElement('span');
    rightPill.className = `row-pill ${item.status}`;
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
  verificationCount = 0;
  failedCount = 0;
  totalRequests = 0;
  totalLatencyMs = 0;
  latencySamples = 0;
  availableList = [];
  checkedList = [];
  startTime = null;
  elDuration.textContent = '00:00:00';
  elReqMin.textContent = '0 RPM';
  elTotalHits.textContent = '0';
  elLastCheck.textContent = 'Never';
  elETA.textContent = '00:00:00';
  elStatAvgLatency.textContent = '0ms';

  credentialPool.credentials.forEach(c => {
    c.requestsCount = 0;
    c.rateLimitCount = 0;
    c.cooldownUntil = 0;
  });

  updateStatsUI();
  renderList();
  credentialPool.renderUI();
  log('Scheduler and statistics reset.');
}

// Combinations Generator
function generateCombinations(mode) {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const alphanum = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const validChars = 'abcdefghijklmnopqrstuvwxyz0123456789._';
  let list = [];

  // Helper: Fisher-Yates Shuffle
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // 1. Random 4L Mixed (a-z, 0-9, ., _)
  if (mode === 'rand4special') {
    const set = new Set();
    // Generate 50,000 unique randomized 4-char combinations with special chars
    while (set.size < 50000) {
      // Must start with letter or digit (not dot/underscore)
      const c1 = alphanum[Math.floor(Math.random() * alphanum.length)];
      const c2 = validChars[Math.floor(Math.random() * validChars.length)];
      const c3 = validChars[Math.floor(Math.random() * validChars.length)];
      // Must not end with dot
      let c4 = validChars[Math.floor(Math.random() * validChars.length)];
      while (c4 === '.') {
        c4 = validChars[Math.floor(Math.random() * validChars.length)];
      }
      
      const candidate = `${c1}${c2}${c3}${c4}`;
      // Prevent consecutive dots
      if (!candidate.includes('..')) {
        set.add(candidate);
      }
    }
    list = Array.from(set);
  }
  // 2. Random 4-Letter (a-z)
  else if (mode === 'rand4') {
    for (let i = 0; i < letters.length; i++) {
      for (let j = 0; j < letters.length; j++) {
        for (let k = 0; k < letters.length; k++) {
          for (let l = 0; l < letters.length; l++) {
            list.push(letters[i] + letters[j] + letters[k] + letters[l]);
          }
        }
      }
    }
    shuffle(list);
  }
  // 3. Random 3L Mixed (a-z, 0-9, ., _)
  else if (mode === 'rand3special') {
    const set = new Set();
    while (set.size < 15000) {
      const c1 = alphanum[Math.floor(Math.random() * alphanum.length)];
      const c2 = validChars[Math.floor(Math.random() * validChars.length)];
      let c3 = validChars[Math.floor(Math.random() * validChars.length)];
      while (c3 === '.') {
        c3 = validChars[Math.floor(Math.random() * validChars.length)];
      }
      const candidate = `${c1}${c2}${c3}`;
      if (!candidate.includes('..')) {
        set.add(candidate);
      }
    }
    list = Array.from(set);
  }
  // 4. Random 3-Letter (a-z)
  else if (mode === 'rand3') {
    for (let i = 0; i < letters.length; i++) {
      for (let j = 0; j < letters.length; j++) {
        for (let k = 0; k < letters.length; k++) {
          list.push(letters[i] + letters[j] + letters[k]);
        }
      }
    }
    shuffle(list);
  }
  // 5. Sequential 4-Letter
  else if (mode === 'auto4') {
    for (let i = 0; i < letters.length; i++) {
      for (let j = 0; j < letters.length; j++) {
        for (let k = 0; k < letters.length; k++) {
          for (let l = 0; l < letters.length; l++) {
            list.push(letters[i] + letters[j] + letters[k] + letters[l]);
          }
        }
      }
    }
  }
  // 6. Sequential 3-Letter
  else if (mode === 'auto3') {
    for (let i = 0; i < letters.length; i++) {
      for (let j = 0; j < letters.length; j++) {
        for (let k = 0; k < letters.length; k++) {
          list.push(letters[i] + letters[j] + letters[k]);
        }
      }
    }
  }
  // 7. Sequential 4-Alphanumeric
  else if (mode === 'auto4num') {
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

// ==========================================
// 4. RATE-LIMIT SCHEDULER & WORKER POOL
// ==========================================
async function runWorker(workerId) {
  activeWorkersCount++;
  updateStatsUI();

  const rawBody = elRequestBody.value.trim();

  while (isRunning && queue.length > 0) {
    // 1. Acquire Credential from Pool
    let credSelection = credentialPool.getAvailableCredential();
    if (!credSelection.credential) {
      // All credentials on rate limit cooldown
      const waitSec = Math.ceil(credSelection.waitMs / 1000);
      log(`[WORKER #${workerId}] All credentials in cooldown. Pausing worker for ${waitSec}s...`, 'warn');
      await new Promise(r => setTimeout(r, Math.min(credSelection.waitMs, 5000)));
      continue;
    }

    const cred = credSelection.credential;
    const id = queue.shift();
    if (!id) break;

    const targetUrl = elTargetUrl.value.replace('{id}', encodeURIComponent(id));
    const proxy = proxyPool.getNextProxy();

    // Prepare Request Headers
    const headers = {
      'Content-Type': 'application/json'
    };
    if (cred.token) {
      headers['Authorization'] = cred.token;
    }

    let requestPayload = null;
    if (rawBody) {
      requestPayload = rawBody.replace(/{id}/g, id);
      try {
        requestPayload = JSON.parse(requestPayload);
      } catch (err) {
        requestPayload = rawBody.replace(/{id}/g, id);
      }
    }

    totalRequests++;
    elLastCheck.textContent = new Date().toLocaleTimeString();

    const requestStartTime = Date.now();
    let resData;

    try {
      const isSameOrigin = (targetUrl.startsWith('/') || targetUrl.startsWith(window.location.origin)) && !proxy;

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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: targetUrl,
            method: elMethod.value,
            headers: headers,
            body: requestPayload,
            proxy: proxy
          })
        });

        resData = await response.json();
        if (!response.ok) {
          throw new Error(resData.message || `Proxy error ${response.status}`);
        }
      }

      // Record Latency
      const latency = Date.now() - requestStartTime;
      totalLatencyMs += latency;
      latencySamples++;

      const remoteStatus = resData.status;
      let jsonPayload = null;
      try {
        if (resData.data) {
          jsonPayload = typeof resData.data === 'string' ? JSON.parse(resData.data) : resData.data;
        }
      } catch (e) {}

      // A. HTTP 429 — Rate Limit Detected
      if (remoteStatus === 429) {
        rateLimitedCount++;
        
        let waitSec = 5;
        if (resData.headers && resData.headers['retry-after']) {
          const parsed = parseInt(resData.headers['retry-after'], 10);
          if (!isNaN(parsed)) waitSec = parsed;
        } else if (jsonPayload && jsonPayload.retry_after) {
          waitSec = Math.ceil(jsonPayload.retry_after);
        }

        log(`[429 RATE LIMIT] Token "${cred.masked}" rate-limited on "${id}". Cooldown: ${waitSec}s`, 'warn');
        credentialPool.setCooldown(cred.id, waitSec);

        // Put identifier back to front of queue to avoid missing it
        queue.unshift(id);
      }
      // B. Verification / CAPTCHA Challenge (403 / verification payload)
      else if (remoteStatus === 403 || (jsonPayload && (jsonPayload.captcha_key || jsonPayload.captcha_sitekey))) {
        verificationCount++;
        log(`[VERIFICATION REQUIRED] Remote server requested verification for token "${cred.masked}". Pausing job.`, 'error');
        elVerificationBanner.classList.add('active');
        stopChecking();
        break;
      }
      // C. HTTP 401 — Unauthorized Token
      else if (remoteStatus === 401) {
        failedCount++;
        log(`[AUTH ERROR] 401 Unauthorized for token "${cred.masked}". Check token validity.`, 'error');
      }
      // D. Discord Pomelo Response Evaluation
      else if (jsonPayload && typeof jsonPayload.taken === 'boolean') {
        if (jsonPayload.taken === false) {
          availableCount++;
          availableList.push({ name: id, status: 'available', code: 200 });
          log(`[AVAILABLE] "${id}" is free on Discord!`, 'success');
          playSuccessSound();
        } else {
          takenCount++;
          checkedList.push({ name: id, status: 'taken', code: 200 });
          log(`[TAKEN] "${id}" is taken.`, 'info');
        }
      }
      // E. GitHub Endpoint (404 = available)
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
        }
      }
      // F. Standard HTTP Status Check
      else if (remoteStatus === 200) {
        availableCount++;
        availableList.push({ name: id, status: 'available', code: 200 });
        log(`[AVAILABLE] "${id}" returned HTTP 200.`, 'success');
        playSuccessSound();
      } else if ([400, 404, 409].includes(remoteStatus)) {
        takenCount++;
        checkedList.push({ name: id, status: 'taken', code: remoteStatus });
        log(`[TAKEN] "${id}" (${remoteStatus})`, 'info');
      } else {
        failedCount++;
        log(`Status ${remoteStatus} for "${id}"`, 'error');
      }

    } catch (err) {
      failedCount++;
      log(`Error querying "${id}": ${err.message}`, 'error');
    }

    scannedCount++;
    updateStatsUI();
    renderList();

    // Respect user-configured delay between checks
    if (isRunning && queue.length > 0) {
      const ms = parseInt(elDelaySlider.value, 10);
      if (ms > 0) await new Promise(r => setTimeout(r, ms));
    }
  }

  activeWorkersCount--;
  updateStatsUI();

  if (activeWorkersCount === 0 && isRunning) {
    stopChecking();
    log('Scheduler completed processing all queue targets.');
  }
}

// Start checking process
async function startChecking() {
  if (isRunning) return;

  const mode = elGenMode.value;
  if (mode === 'manual') {
    const rawText = elIdentifiers.value.trim();
    if (!rawText) {
      alert('Please enter at least one identifier in the queue.');
      return;
    }
    queue = rawText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  } else {
    log(`Generating combinations for mode: ${mode}...`);
    queue = generateCombinations(mode);
    log(`Prepared ${queue.length} targets for execution.`);
  }

  // Load Credentials and Proxies
  credentialPool.loadFromInput(elCredentialPoolInput.value);
  proxyPool.loadFromInput(elProxyListInput.value);

  totalCount = queue.length;
  scannedCount = 0;
  totalRequests = 0;
  totalLatencyMs = 0;
  latencySamples = 0;
  updateStatsUI();

  isRunning = true;
  elBtnStart.style.display = 'none';
  elBtnStop.style.display = 'flex';
  toggleInputs(true);

  elSysDot.className = 'status-dot scanning';
  elSysStatusText.textContent = 'System: Scanning...';

  startTime = Date.now();
  durationInterval = setInterval(updateMetrics, 1000);

  const concurrency = parseInt(elConcurrencySlider.value, 10);
  log(`Scheduler dispatched with ${concurrency} concurrent worker(s)...`);

  for (let i = 1; i <= concurrency; i++) {
    runWorker(i);
  }
}

// Stop checking process
function stopChecking() {
  isRunning = false;
  elBtnStart.style.display = 'flex';
  elBtnStop.style.display = 'none';
  toggleInputs(false);
  
  elSysDot.className = 'status-dot';
  elSysStatusText.textContent = 'System: Idle';

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
  elConcurrencySlider.disabled = disabled;
  elTargetUrl.disabled = disabled;
  elMethod.disabled = disabled;
  elCredentialPoolInput.disabled = disabled;
  elProxyListInput.disabled = disabled;
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
  log(`Exported ${currentList.length} ${activeResultTab} records to clipboard.`);
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

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  elLblSpeed.textContent = `${elDelaySlider.value}ms`;
  elLblConcurrency.textContent = `${elConcurrencySlider.value} Worker`;
  credentialPool.loadFromInput(elCredentialPoolInput.value);
  proxyPool.loadFromInput(elProxyListInput.value);
  renderList();
  log('Snowflake v4.0 PRO Scheduler initialized and ready.');
});
