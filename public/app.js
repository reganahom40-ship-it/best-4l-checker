// ==========================================
// SNOWFLAKE v4.5 PRO — APPLICATION SCRIPT
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
let allDiscoveredRecords = [];

// Latency & Metrics Tracking
let totalLatencyMs = 0;
let latencySamples = 0;
let startTime = null;
let durationInterval = null;
let totalRequests = 0;
let activeWorkersCount = 0;
let peakVelocityRPM = 0;

// Tab State
let activeResultTab = 'available';
let currentActiveView = 'dashboard';

// Chart.js instance
let donutChart = null;

// DOM Elements - Core
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
const elCredentialHubInput = document.getElementById('credentialHubInput');
const elProxyHubInput = document.getElementById('proxyHubInput');
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
const elFullLogContent = document.getElementById('fullLogContent');
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

// Explorer & Analytics Elements
const elExplorerSearch = document.getElementById('explorerSearch');
const elExplorerTableBody = document.getElementById('explorerTableBody');
const elBtnExportCSV = document.getElementById('btnExportCSV');
const elBtnExportJSON = document.getElementById('btnExportJSON');
const elStatPeakVelocity = document.getElementById('statPeakVelocity');
const elStatAnalyticsAvgLatency = document.getElementById('statAnalyticsAvgLatency');
const elStatAnalyticsRetries = document.getElementById('statAnalyticsRetries');
const elStatHitRate = document.getElementById('statHitRate');
const elBtnDownloadLogs = document.getElementById('btnDownloadLogs');
const elBtnClearFullLogs = document.getElementById('btnClearFullLogs');
const elBtnValidateTokens = document.getElementById('btnValidateTokens');

const elHeaderViewTitle = document.getElementById('headerViewTitle');
const elHeaderViewDesc = document.getElementById('headerViewDesc');

// ==========================================
// 1. SIDEBAR SPA ROUTER
// ==========================================
const viewMetadata = {
  dashboard: {
    title: 'Dashboard & Live Checker',
    desc: 'Multi-credential request scheduler with adaptive rate-limit backpressure'
  },
  explorer: {
    title: 'Discovered Hits Explorer',
    desc: 'Search, filter, inspect, and export all discovered identifiers'
  },
  analytics: {
    title: 'Engine Analytics & Charts',
    desc: 'Response code distribution, latency profiling, and velocity trends'
  },
  credentials: {
    title: 'Credential & Proxy Hub',
    desc: 'Manage authorized API token pools and network proxy routes'
  },
  logs: {
    title: 'Audit Console & Log Stream',
    desc: 'Full-screen chronological event stream and diagnostic logging'
  }
};

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const viewName = item.getAttribute('data-view');
    if (!viewName) return;

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');

    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    const targetSection = document.getElementById(`view-${viewName}`);
    if (targetSection) targetSection.classList.add('active');

    currentActiveView = viewName;
    if (viewMetadata[viewName]) {
      elHeaderViewTitle.textContent = viewMetadata[viewName].title;
      elHeaderViewDesc.textContent = viewMetadata[viewName].desc;
    }

    if (viewName === 'explorer') renderExplorerTable();
    if (viewName === 'analytics') updateAnalyticsCharts();
  });
});

// ==========================================
// 2. CREDENTIAL POOL MANAGER
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
      let soonest = this.credentials[0];
      for (const c of this.credentials) {
        if (c.cooldownUntil < soonest.cooldownUntil) soonest = c;
      }
      const waitMs = Math.max(0, soonest.cooldownUntil - now);
      return { credential: null, waitMs: waitMs };
    }

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

// Sync between inputs
elCredentialPoolInput.addEventListener('input', () => {
  elCredentialHubInput.value = elCredentialPoolInput.value;
  credentialPool.loadFromInput(elCredentialPoolInput.value);
});

elCredentialHubInput.addEventListener('input', () => {
  elCredentialPoolInput.value = elCredentialHubInput.value;
  credentialPool.loadFromInput(elCredentialHubInput.value);
});

// ==========================================
// 3. PROXY POOL MANAGER
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

elProxyListInput.addEventListener('input', () => {
  elProxyHubInput.value = elProxyListInput.value;
  proxyPool.loadFromInput(elProxyListInput.value);
});

elProxyHubInput.addEventListener('input', () => {
  elProxyListInput.value = elProxyHubInput.value;
  proxyPool.loadFromInput(elProxyHubInput.value);
});

// ==========================================
// 4. UI CONTROLS & LISTENERS
// ==========================================
elDelaySlider.addEventListener('input', () => {
  elLblSpeed.textContent = `${elDelaySlider.value}ms`;
});

elConcurrencySlider.addEventListener('input', () => {
  const val = elConcurrencySlider.value;
  elLblConcurrency.textContent = `${val} Worker${val > 1 ? 's' : ''}`;
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
    log('Loaded Discord Pomelo Preset. Enter your authorized Discord token in Credential Pool.', 'warn');
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

// Chime Alert
function playSuccessSound() {
  if (!elSoundAlert.checked) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    
    osc.start();
    osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    
    osc.stop(ctx.currentTime + 0.3);
  } catch (err) {}
}

// Log message to activity terminal & full audit log
function log(msg, type = 'info') {
  const time = new Date().toLocaleTimeString();
  
  // 1. Mini Console
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

  // 2. Full Audit Console Clone
  if (elFullLogContent) {
    const fullRow = row.cloneNode(true);
    elFullLogContent.appendChild(fullRow);
    elFullLogContent.scrollTop = elFullLogContent.scrollHeight;
  }
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

  let avgMs = 0;
  if (latencySamples > 0) {
    avgMs = Math.round(totalLatencyMs / latencySamples);
    elStatAvgLatency.textContent = `${avgMs}ms`;
    if (elStatAnalyticsAvgLatency) elStatAnalyticsAvgLatency.textContent = `${avgMs}ms`;
  } else {
    elStatAvgLatency.textContent = '0ms';
  }

  elBadgeAvailable.textContent = availableCount;
  elBadgeTaken.textContent = takenCount;
  elTotalHits.textContent = totalRequests;
  elActiveWorkers.textContent = activeWorkersCount;

  if (elStatAnalyticsRetries) elStatAnalyticsRetries.textContent = rateLimitedCount;
  if (elStatHitRate) {
    const rate = scannedCount > 0 ? ((availableCount / scannedCount) * 100).toFixed(1) : '0.0';
    elStatHitRate.textContent = `${rate}%`;
  }
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
  let currentRPM = 0;
  if (elapsedMinutes > 0.05) {
    currentRPM = Math.round(totalRequests / elapsedMinutes);
    elReqMin.textContent = `${currentRPM} RPM`;
    if (currentRPM > peakVelocityRPM) {
      peakVelocityRPM = currentRPM;
      if (elStatPeakVelocity) elStatPeakVelocity.textContent = `${peakVelocityRPM} RPM`;
    }
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

// Render Results List (Mini Panel)
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

// Render Explorer Table (Full View)
function renderExplorerTable() {
  if (!elExplorerTableBody) return;
  elExplorerTableBody.innerHTML = '';

  const query = (elExplorerSearch.value || '').trim().toLowerCase();
  const filtered = allDiscoveredRecords.filter(r => !query || r.name.toLowerCase().includes(query) || r.status.toLowerCase().includes(query));

  if (filtered.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">No matching records found.</td>`;
    elExplorerTableBody.appendChild(tr);
    return;
  }

  filtered.forEach((rec, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color: var(--text-muted);">${idx + 1}</td>
      <td style="font-weight: 700; color: ${rec.status === 'available' ? 'var(--cyan)' : 'var(--text-main)'};">${rec.name}</td>
      <td><span class="row-pill ${rec.status}">${rec.status.toUpperCase()}</span></td>
      <td>${rec.code || 200}</td>
      <td style="color: var(--text-dim); font-size: 0.75rem;">${rec.timestamp}</td>
      <td>
        <button class="btn btn-secondary" style="width: auto; padding: 3px 8px; font-size: 0.68rem;" onclick="navigator.clipboard.writeText('${rec.name}'); alert('Copied ${rec.name}');">Copy</button>
      </td>
    `;
    elExplorerTableBody.appendChild(tr);
  });
}

if (elExplorerSearch) {
  elExplorerSearch.addEventListener('input', renderExplorerTable);
}

// Chart.js Donut Chart
function updateAnalyticsCharts() {
  const canvas = document.getElementById('analyticsDonutChart');
  if (!canvas) return;

  const dataValues = [availableCount, takenCount, rateLimitedCount, verificationCount + failedCount];

  if (donutChart) {
    donutChart.data.datasets[0].data = dataValues;
    donutChart.update();
  } else {
    donutChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Available', 'Taken', '429 Rate Limits', 'Errors/Verification'],
        datasets: [{
          data: dataValues,
          backgroundColor: ['#10b981', '#374151', '#f59e0b', '#f43f5e'],
          borderColor: '#0b0b10',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#9ca3af', font: { family: 'Plus Jakarta Sans', size: 11 } }
          }
        }
      }
    });
  }
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
  peakVelocityRPM = 0;
  availableList = [];
  checkedList = [];
  allDiscoveredRecords = [];
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
  renderExplorerTable();
  updateAnalyticsCharts();
  credentialPool.renderUI();
  log('Scheduler and explorer records cleared.');
}

// ==========================================
// 5. COMBINATIONS GENERATOR
// ==========================================
function generateCombinations(mode) {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const alphanum = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const validChars = 'abcdefghijklmnopqrstuvwxyz0123456789._';
  let list = [];

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  if (mode === 'rand4special') {
    const set = new Set();
    while (set.size < 50000) {
      const c1 = alphanum[Math.floor(Math.random() * alphanum.length)];
      const c2 = validChars[Math.floor(Math.random() * validChars.length)];
      const c3 = validChars[Math.floor(Math.random() * validChars.length)];
      let c4 = validChars[Math.floor(Math.random() * validChars.length)];
      while (c4 === '.') {
        c4 = validChars[Math.floor(Math.random() * validChars.length)];
      }
      const candidate = `${c1}${c2}${c3}${c4}`;
      if (!candidate.includes('..')) {
        set.add(candidate);
      }
    }
    list = Array.from(set);
  }
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
  else if (mode === 'auto3') {
    for (let i = 0; i < letters.length; i++) {
      for (let j = 0; j < letters.length; j++) {
        for (let k = 0; k < letters.length; k++) {
          list.push(letters[i] + letters[j] + letters[k]);
        }
      }
    }
  }
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
// 6. RATE-LIMIT SCHEDULER & WORKER POOL
// ==========================================
async function runWorker(workerId) {
  activeWorkersCount++;
  updateStatsUI();

  const rawBody = elRequestBody.value.trim();

  while (isRunning && queue.length > 0) {
    let credSelection = credentialPool.getAvailableCredential();
    if (!credSelection.credential) {
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

    const headers = { 'Content-Type': 'application/json' };
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

      const timestamp = new Date().toLocaleTimeString();

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
        queue.unshift(id);
      }
      // B. Verification Challenge
      else if (remoteStatus === 403 || (jsonPayload && (jsonPayload.captcha_key || jsonPayload.captcha_sitekey))) {
        verificationCount++;
        log(`[VERIFICATION REQUIRED] Remote server requested verification challenge for "${id}". Pausing scheduler.`, 'error');
        elVerificationBanner.classList.add('active');
        stopChecking();
        break;
      }
      // C. HTTP 401 — Unauthorized
      else if (remoteStatus === 401) {
        failedCount++;
        log(`[AUTH ERROR] 401 Unauthorized for token "${cred.masked}". Check token validity.`, 'error');
      }
      // D. Discord Pomelo
      else if (jsonPayload && typeof jsonPayload.taken === 'boolean') {
        if (jsonPayload.taken === false) {
          availableCount++;
          availableList.push({ name: id, status: 'available', code: 200 });
          allDiscoveredRecords.push({ name: id, status: 'available', code: 200, timestamp: timestamp });
          log(`[AVAILABLE] "${id}" is AVAILABLE!`, 'success');
          playSuccessSound();
        } else {
          takenCount++;
          checkedList.push({ name: id, status: 'taken', code: 200 });
          allDiscoveredRecords.push({ name: id, status: 'taken', code: 200, timestamp: timestamp });
          log(`[TAKEN] "${id}" is taken.`, 'info');
        }
      }
      // E. GitHub
      else if (elApiPreset.value === 'github') {
        if (remoteStatus === 404) {
          availableCount++;
          availableList.push({ name: id, status: 'available', code: 404 });
          allDiscoveredRecords.push({ name: id, status: 'available', code: 404, timestamp: timestamp });
          log(`[AVAILABLE] "${id}" is free on GitHub!`, 'success');
          playSuccessSound();
        } else if (remoteStatus === 200) {
          takenCount++;
          checkedList.push({ name: id, status: 'taken', code: 200 });
          allDiscoveredRecords.push({ name: id, status: 'taken', code: 200, timestamp: timestamp });
          log(`[TAKEN] "${id}" is registered on GitHub.`, 'info');
        } else {
          failedCount++;
        }
      }
      // F. Standard HTTP
      else if (remoteStatus === 200) {
        availableCount++;
        availableList.push({ name: id, status: 'available', code: 200 });
        allDiscoveredRecords.push({ name: id, status: 'available', code: 200, timestamp: timestamp });
        log(`[AVAILABLE] "${id}" returned HTTP 200.`, 'success');
        playSuccessSound();
      } else if ([400, 404, 409].includes(remoteStatus)) {
        takenCount++;
        checkedList.push({ name: id, status: 'taken', code: remoteStatus });
        allDiscoveredRecords.push({ name: id, status: 'taken', code: remoteStatus, timestamp: timestamp });
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
    if (currentActiveView === 'explorer') renderExplorerTable();
    if (currentActiveView === 'analytics') updateAnalyticsCharts();

    if (isRunning && queue.length > 0) {
      const ms = parseInt(elDelaySlider.value, 10);
      if (ms > 0) await new Promise(r => setTimeout(r, ms));
    }
  }

  activeWorkersCount--;
  updateStatsUI();

  if (activeWorkersCount === 0 && isRunning) {
    stopChecking();
    log('Scheduler completed queue processing.');
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
    log(`Generating target combinations for: ${mode}...`);
    queue = generateCombinations(mode);
    log(`Prepared ${queue.length} target combinations.`);
  }

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
  log(`Scheduler running with ${concurrency} concurrent worker(s)...`);

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

// CSV Export
if (elBtnExportCSV) {
  elBtnExportCSV.addEventListener('click', () => {
    if (allDiscoveredRecords.length === 0) {
      alert('No records to export.');
      return;
    }
    let csv = 'Identifier,Status,HTTP Code,Timestamp\n';
    allDiscoveredRecords.forEach(r => {
      csv += `"${r.name}","${r.status}",${r.code},"${r.timestamp}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snowflake_hits_${Date.now()}.csv`;
    a.click();
  });
}

// JSON Export
if (elBtnExportJSON) {
  elBtnExportJSON.addEventListener('click', () => {
    if (allDiscoveredRecords.length === 0) {
      alert('No records to export.');
      return;
    }
    const jsonStr = JSON.stringify(allDiscoveredRecords, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snowflake_hits_${Date.now()}.json`;
    a.click();
  });
}

// Download raw logs
if (elBtnDownloadLogs) {
  elBtnDownloadLogs.addEventListener('click', () => {
    const logsText = elFullLogContent.innerText;
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snowflake_audit_${Date.now()}.log`;
    a.click();
  });
}

if (elBtnClearFullLogs) {
  elBtnClearFullLogs.addEventListener('click', () => {
    if (elFullLogContent) elFullLogContent.innerHTML = '';
  });
}

elBtnClearLogs.addEventListener('click', () => {
  elLogContent.textContent = '';
});

// Validate tokens button
if (elBtnValidateTokens) {
  elBtnValidateTokens.addEventListener('click', () => {
    credentialPool.loadFromInput(elCredentialHubInput.value);
    alert(`Loaded ${credentialPool.credentials.length} credential(s) into active rotation.`);
  });
}

// Select change
elGenMode.addEventListener('change', () => {
  if (elGenMode.value === 'manual') {
    elIdentifiersGroup.style.display = 'flex';
  } else {
    elIdentifiersGroup.style.display = 'none';
  }
});

// ==========================================
// 7. DISCORD OAUTH2 FLOW INTEGRATION
// ==========================================
const elBtnDiscordOAuth = document.getElementById('btnDiscordOAuth');
const elBtnConnectOAuthHub = document.getElementById('btnConnectOAuthHub');
const elDiscordUserBadge = document.getElementById('discordUserBadge');
const elDiscordAvatarImg = document.getElementById('discordAvatarImg');
const elDiscordUsernameText = document.getElementById('discordUsernameText');
const elBtnDisconnectDiscord = document.getElementById('btnDisconnectDiscord');
const elOauthClientId = document.getElementById('oauthClientId');
const elOauthClientSecret = document.getElementById('oauthClientSecret');
const elOauthRedirectUri = document.getElementById('oauthRedirectUri');

let oauthConfig = {
  configured: false,
  client_id: '',
  redirect_uri: window.location.origin + '/api/auth/discord/callback'
};

async function initDiscordOAuth() {
  try {
    const res = await fetch('/api/auth/discord/config');
    oauthConfig = await res.json();
    if (elOauthRedirectUri) {
      elOauthRedirectUri.value = oauthConfig.redirect_uri || (window.location.origin + '/api/auth/discord/callback');
    }
    if (oauthConfig.client_id && elOauthClientId && !elOauthClientId.value) {
      elOauthClientId.value = oauthConfig.client_id;
    }
  } catch (err) {
    if (elOauthRedirectUri) {
      elOauthRedirectUri.value = window.location.origin + '/api/auth/discord/callback';
    }
  }

  // Restore stored session
  const storedUser = localStorage.getItem('snowflake_discord_user');
  const storedToken = localStorage.getItem('snowflake_discord_token');
  if (storedUser && storedToken) {
    try {
      const user = JSON.parse(storedUser);
      applyDiscordUserSession(storedToken, user);
    } catch (e) {}
  }

  // Check localStorage for callback from non-popup redirect
  const oauthCreds = localStorage.getItem('snowflake_oauth_creds');
  if (oauthCreds) {
    try {
      const data = JSON.parse(oauthCreds);
      localStorage.removeItem('snowflake_oauth_creds');
      applyDiscordUserSession(data.token, data.user);
    } catch (e) {}
  }
}

function launchDiscordOAuthPopup() {
  const clientId = (elOauthClientId ? elOauthClientId.value.trim() : '') || oauthConfig.client_id;
  const clientSecret = elOauthClientSecret ? elOauthClientSecret.value.trim() : '';
  const redirectUri = (elOauthRedirectUri ? elOauthRedirectUri.value.trim() : '') || oauthConfig.redirect_uri;

  if (!clientId) {
    const enteredId = prompt('Enter your Discord Application Client ID (from Discord Developer Portal):');
    if (!enteredId) return;
    if (elOauthClientId) elOauthClientId.value = enteredId.trim();
  }

  let authUrl = `/api/auth/discord/login?client_id=${encodeURIComponent(clientId || elOauthClientId.value.trim())}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  if (clientSecret) {
    authUrl += `&client_secret=${encodeURIComponent(clientSecret)}`;
  }

  const width = 500;
  const height = 750;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  window.open(
    authUrl,
    'DiscordOAuth',
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no`
  );
}

function applyDiscordUserSession(token, user) {
  localStorage.setItem('snowflake_discord_token', token);
  localStorage.setItem('snowflake_discord_user', JSON.stringify(user));

  if (elBtnDiscordOAuth) elBtnDiscordOAuth.style.display = 'none';
  if (elDiscordUserBadge) {
    elDiscordUserBadge.style.display = 'flex';
    if (elDiscordUsernameText) {
      elDiscordUsernameText.textContent = user.global_name ? `${user.global_name} (@${user.username})` : `@${user.username}`;
    }
    if (elDiscordAvatarImg && user.avatar) {
      elDiscordAvatarImg.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
      elDiscordAvatarImg.style.display = 'block';
    }
  }

  // Prepend or add authorized OAuth token to credential pool
  const currentTokens = elCredentialPoolInput.value.split('\n').filter(t => t.trim() && !t.includes('YOUR_DISCORD_TOKEN'));
  if (!currentTokens.includes(token)) {
    currentTokens.unshift(token);
    elCredentialPoolInput.value = currentTokens.join('\n');
    elCredentialHubInput.value = elCredentialPoolInput.value;
    credentialPool.loadFromInput(elCredentialPoolInput.value);
  }

  log(`Discord OAuth2 Authorized: Connected as @${user.username} (${user.id}). Token loaded into Credential Pool.`, 'success');
}

function disconnectDiscordSession() {
  localStorage.removeItem('snowflake_discord_token');
  localStorage.removeItem('snowflake_discord_user');

  if (elBtnDiscordOAuth) elBtnDiscordOAuth.style.display = 'flex';
  if (elDiscordUserBadge) elDiscordUserBadge.style.display = 'none';
  log('Disconnected Discord OAuth2 session.', 'info');
}

if (elBtnDiscordOAuth) elBtnDiscordOAuth.addEventListener('click', launchDiscordOAuthPopup);
if (elBtnConnectOAuthHub) elBtnConnectOAuthHub.addEventListener('click', launchDiscordOAuthPopup);
if (elBtnDisconnectDiscord) elBtnDisconnectDiscord.addEventListener('click', disconnectDiscordSession);

// Listen for OAuth2 popup message
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'DISCORD_OAUTH_SUCCESS') {
    applyDiscordUserSession(event.data.token, event.data.user);
  }
});

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  elLblSpeed.textContent = `${elDelaySlider.value}ms`;
  elLblConcurrency.textContent = `${elConcurrencySlider.value} Worker`;
  elCredentialHubInput.value = elCredentialPoolInput.value;
  elProxyHubInput.value = elProxyListInput.value;
  credentialPool.loadFromInput(elCredentialPoolInput.value);
  proxyPool.loadFromInput(elProxyListInput.value);
  initDiscordOAuth();
  renderList();
  log('Snowflake v4.5 PRO Multi-View Dashboard with Discord OAuth2 online.');
});
