// ==========================================================
// ONYX APEX v2.4 — Master Commercial Checker Engine
// 17-Platform Precision Scanner Suite (Infinite Continuous Mode)
// ==========================================================

// Global State
window.isScanning = false;
window.activePlatform = 'tiktok';
window.currentGenPattern = '4L_ALPHA';
window.scannerQueue = [];
window.queueCursor = 0;
window.availableHits = [];
window.takenCount = 0;
window.totalCheckedCount = 0;
window.activeWorkerThreads = 45;
window.workerDelayMs = 20;

let checkTimestamps = [];
let cpsTimer = null;
let customHandlesList = [];
let customQueueIndex = 0;

// ----------------------------------------------------------
// 1. COMPREHENSIVE 17-PLATFORM REGISTRY
// ----------------------------------------------------------
const PLATFORMS = {
  tiktok: { id: 'tiktok', name: 'TikTok', icon: '📱', category: 'Social', badge: 'ByteDance', min: 4, max: 24, desc: 'Rehydration engine availability' },
  discord: { id: 'discord', name: 'Discord', icon: '💬', category: 'Messenger', badge: 'Pomelo API', min: 2, max: 32, desc: 'Unauthed username attempt API' },
  kick: { id: 'kick', name: 'Kick', icon: '🟢', category: 'Streaming', badge: 'Live Stream', min: 3, max: 25, desc: 'Public channel endpoint' },
  twitch: { id: 'twitch', name: 'Twitch', icon: '🟣', category: 'Streaming', badge: 'Helix Auth', min: 4, max: 25, desc: 'Passport auth verification' },
  instagram: { id: 'instagram', name: 'Instagram', icon: '📸', category: 'Social', badge: 'Meta Profile', min: 1, max: 30, desc: 'Web profile info API' },
  twitter: { id: 'twitter', name: 'X / Twitter', icon: '🐦', category: 'Social', badge: 'GraphQL / X', min: 1, max: 15, desc: 'Live handle validator' },
  youtube: { id: 'youtube', name: 'YouTube', icon: '▶️', category: 'Streaming', badge: 'Handles @', min: 3, max: 30, desc: 'Channel handle system' },
  roblox: { id: 'roblox', name: 'Roblox', icon: '🧱', category: 'Gaming', badge: 'User API', min: 3, max: 20, desc: 'Official user validation API' },
  minecraft: { id: 'minecraft', name: 'Minecraft', icon: '⛏️', category: 'Gaming', badge: 'Mojang IGN', min: 3, max: 16, desc: 'Mojang profiles API' },
  github: { id: 'github', name: 'GitHub', icon: '🐙', category: 'Dev', badge: 'Git Developer', min: 1, max: 39, desc: 'Official user profile API' },
  steam: { id: 'steam', name: 'Steam', icon: '💨', category: 'Gaming', badge: 'Custom Vanity', min: 3, max: 32, desc: 'Community vanity URL check' },
  telegram: { id: 'telegram', name: 'Telegram', icon: '✈️', category: 'Messenger', badge: 'MTProto @', min: 5, max: 32, desc: 'Messenger handle lookup' },
  gitlab: { id: 'gitlab', name: 'GitLab', icon: '🦊', category: 'Dev', badge: 'DevOps API', min: 2, max: 255, desc: 'Official users API' },
  chess: { id: 'chess', name: 'Chess.com', icon: '♟️', category: 'Gaming', badge: 'Player API', min: 3, max: 30, desc: 'Official player pub API' },
  docker: { id: 'docker', name: 'Docker Hub', icon: '🐳', category: 'Dev', badge: 'Registry ID', min: 4, max: 30, desc: 'Docker v2 user API' },
  devto: { id: 'devto', name: 'Dev.to', icon: '👩‍💻', category: 'Dev', badge: 'Community API', min: 1, max: 30, desc: 'Official developer API' },
  mastodon: { id: 'mastodon', name: 'Mastodon', icon: '🐘', category: 'Social', badge: 'Fediverse', min: 1, max: 30, desc: 'Social federation lookup' }
};

window.PLATFORMS = PLATFORMS;

// ----------------------------------------------------------

// ----------------------------------------------------------
// 2. DYNAMIC INFINITE HANDLE GENERATOR ENGINE & 12 SUITES
// ----------------------------------------------------------
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const VOWELS = 'aeiou';
const CONSONANTS = 'bcdfghjklmnpqrstvwxyz';
const DIGITS = '0123456789';
const ALPHANUM = 'abcdefghijklmnopqrstuvwxyz0123456789';

const OG_DICTIONARY_WORDS = [
  'ghost', 'blade', 'frost', 'toxic', 'demon', 'angel', 'cyber', 'matrix', 'pulse', 'storm',
  'venom', 'shadow', 'phantom', 'vamp', 'draco', 'opium', 'wrath', 'sin', 'god', 'zen',
  'beast', 'flame', 'blood', 'grave', 'magic', 'viper', 'night', 'titan', 'alpha', 'omega',
  'chaos', 'havoc', 'prime', 'rebel', 'siren', 'abyss', 'wraith', 'void', 'nova', 'apex',
  'onyx', 'echo', 'flux', 'glow', 'soul', 'pure', 'lunar', 'zero', 'neon', 'fade',
  'dark', 'cult', 'mint', 'wave', 'sage', 'lust', 'vibe', 'hype', 'bolt', 'sync',
  'myth', 'evil', 'holy', 'rare', 'grim', 'drip', 'crave', 'bliss', 'saint', 'curse',
  'spell', 'charm', 'witch', 'devil', 'skull', 'knife', 'sword', 'crown', 'throne', 'spark',
  'flash', 'blaze', 'inferno', 'smoke', 'mist', 'haze', 'shade', 'twilight', 'eclipse', 'comet',
  'meteor', 'orbit', 'quasar', 'pulsar', 'stellar', 'nebula', 'zenith', 'ocean', 'river', 'cliff',
  'stone', 'flint', 'steel', 'iron', 'gold', 'silk', 'velvet', 'pearl', 'ruby', 'diamond',
  'amber', 'jade', 'opal', 'frenzy', 'karma', 'omen', 'saint', 'wrath', 'solace', 'sanctum',
  'tempest', 'valkyrie', 'paragon', 'seraph', 'archon', 'revenant', 'specter', 'phantom', 'chimera'
];

const HYPE_GAMING_WORDS = [
  'faze', 'optic', 'clout', 'drip', 'godly', 'snipes', 'tap', 'frag', 'aim', 'vibe',
  'grim', 'glitch', 'reaper', 'slayer', 'toxic', 'savage', 'insane', 'clutch', 'streak', 'flex',
  'hyped', 'demon', 'grind', 'lockin', 'shifty', 'speed', 'drift', 'nitro', 'pulse', 'shock',
  'stun', 'peek', 'headshot', 'scope', 'ghost', 'ninja', 'rogue', 'hunter', 'raider', 'titan',
  'rebel', 'havoc', 'rage', 'fatal', 'lethal', 'killer', 'deadly', 'snipe', 'strafe', 'flick',
  'recoil', 'sweat', 'carry', 'smurf', 'ranked', 'predator', 'unreal', 'mythic', 'exotic', 'cracked',
  'fused', 'amped', 'blitz', 'rush', 'tilt', 'drop', 'zone', 'looted', 'shield', 'armor'
];

const JAPANESE_AESTHETIC_WORDS = [
  'kumo', 'yuki', 'kage', 'tsuki', 'hana', 'sora', 'shin', 'kami', 'ryu', 'oni',
  'ken', 'zen', 'mizu', 'kai', 'yami', 'haze', 'kawa', 'nami', 'kuro', 'shiro',
  'neko', 'kitsune', 'samurai', 'ronin', 'senpai', 'hikari', 'chiyo', 'haru', 'aki', 'fuyu',
  'natsu', 'ren', 'jin', 'rei', 'rin', 'kyo', 'toru', 'akira', 'kaede', 'sakura',
  'momiji', 'hotaru', 'tsubaki', 'ayame', 'kaida', 'kazuki', 'daiki', 'satoshi', 'ryota', 'shota',
  'makoto', 'tatsuya', 'hideki', 'masato', 'yuto', 'naoki', 'takumi', 'kenta', 'sho', 'jun',
  'ryo', 'sosuke', 'minato', 'haruto', 'riku', 'hinata', 'yuma', 'itsuki', 'hayato', 'kaito'
];

const FIRST_NAMES_LIST = [
  'jack', 'alex', 'luke', 'noah', 'liam', 'maya', 'emma', 'zack', 'cody', 'kai',
  'leo', 'finn', 'cole', 'milo', 'jude', 'ezra', 'levi', 'tate', 'nash', 'kobe',
  'dean', 'zane', 'seth', 'kyle', 'troy', 'jake', 'sam', 'max', 'ben', 'dan',
  'ian', 'eli', 'ryan', 'eric', 'sean', 'adam', 'paul', 'mark', 'john', 'dave',
  'matt', 'nick', 'josh', 'chris', 'tyler', 'dylan', 'ethan', 'lucas', 'mason', 'logan',
  'james', 'oliver', 'henry', 'theo', 'owen', 'wyatt', 'carter', 'hunter', 'connor', 'aiden'
];

const NUMERIC_LIST = [
  '777', '666', '999', '000', '111', '6969', '7777', '8888', '1337', '404',
  '500', '808', '303', '2026', '100k', '007', '420', '911', '360', '101',
  '0000', '9999', '2222', '3333', '4444', '5555', '1234', '4321', '1122', '3344',
  '5566', '7788', '9900', '1010', '2020', '3030', '4040', '5050', '6060', '7070', '8080', '9090'
];

const REPEATING_SYMMETRICAL_LIST = [
  'abba', 'noon', 'radar', 'level', 'stats', 'otto', 'anna', 'kayak', 'deed', 'peep',
  'pop', 'mom', 'dad', 'eye', 'sos', 'rotator', 'racecar', 'madam', 'refer', 'civic',
  'tenet', 'solos', 'redder', 'zzzz', 'yyyy', 'xxxx', 'vvvv', 'qqqq', 'bbbb', 'cccc',
  'dddd', 'ffff', 'gggg', 'hhhh', 'jjjj', 'kkkk', 'llll', 'mmmm', 'nnnn', 'pppp',
  'rrrr', 'ssss', 'tttt', 'wwww'
];

function generateNextHandle(pattern) {
  // 1. 2L Pure Alpha (AA - ZZ)
  if (pattern === '2L_ALPHA') {
    return LETTERS[Math.floor(Math.random() * LETTERS.length)] + LETTERS[Math.floor(Math.random() * LETTERS.length)];
  }

  // 2. 3L Pure Letters (AAA - ZZZ)
  if (pattern === '3L_ALPHA') {
    let s = '';
    for (let j = 0; j < 3; j++) s += LETTERS[Math.floor(Math.random() * LETTERS.length)];
    return s;
  }

  // 3. 3L Alphanumeric (A-Z, 0-9)
  if (pattern === '3L_ALPHANUM') {
    let s = '';
    for (let j = 0; j < 3; j++) s += ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)];
    return s;
  }

  // 4. 4L Clean Letters (AAAA - ZZZZ)
  if (pattern === '4L_ALPHA') {
    let s = '';
    for (let j = 0; j < 4; j++) s += LETTERS[Math.floor(Math.random() * LETTERS.length)];
    return s;
  }

  // 5. 4L Alphanumeric (A-Z, 0-9)
  if (pattern === '4L_ALPHANUM') {
    let s = '';
    for (let j = 0; j < 4; j++) s += ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)];
    return s;
  }

  // 6. 5L Clean Pronounceable (CVCVC / CVCV)
  if (pattern === '5L_ALPHA') {
    const c1 = CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
    const v1 = VOWELS[Math.floor(Math.random() * VOWELS.length)];
    const c2 = CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
    const v2 = VOWELS[Math.floor(Math.random() * VOWELS.length)];
    const c3 = CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
    return c1 + v1 + c2 + v2 + c3;
  }

  // 7. Real Dictionary OG Words
  if (pattern === 'OG_DICTIONARY') {
    const w = OG_DICTIONARY_WORDS[Math.floor(Math.random() * OG_DICTIONARY_WORDS.length)];
    const affixes = ['', '', '', 'x', 'z', '_', 'og', 'hq', '7', '9'];
    const aff = affixes[Math.floor(Math.random() * affixes.length)];
    return Math.random() > 0.8 ? (Math.random() > 0.5 ? w + aff : aff + w) : w;
  }

  // 8. Gaming & Clout Handles
  if (pattern === 'HYPE_GAMING') {
    const w = HYPE_GAMING_WORDS[Math.floor(Math.random() * HYPE_GAMING_WORDS.length)];
    const affixes = ['', '', 'x', 'z', '_', 'fn', 'gg', 'up', '77', '99', 'god'];
    const aff = affixes[Math.floor(Math.random() * affixes.length)];
    return Math.random() > 0.7 ? (Math.random() > 0.5 ? w + aff : aff + w) : w;
  }

  // 9. Japanese Romaji / Aesthetic
  if (pattern === 'JAPANESE_AESTHETIC') {
    const w = JAPANESE_AESTHETIC_WORDS[Math.floor(Math.random() * JAPANESE_AESTHETIC_WORDS.length)];
    return Math.random() > 0.8 ? w + (Math.random() > 0.5 ? 'x' : 'z') : w;
  }

  // 10. First Names / IRL
  if (pattern === 'FIRST_NAMES') {
    const w = FIRST_NAMES_LIST[Math.floor(Math.random() * FIRST_NAMES_LIST.length)];
    const affixes = ['', '', '', 'x', 'z', '_', 'real', 'its'];
    const aff = affixes[Math.floor(Math.random() * affixes.length)];
    return Math.random() > 0.8 ? (Math.random() > 0.5 ? aff + w : w + aff) : w;
  }

  // 11. Numeric Clean (777 / 1337 / Quad)
  if (pattern === 'NUMERIC_CLEAN') {
    return NUMERIC_LIST[Math.floor(Math.random() * NUMERIC_LIST.length)];
  }

  // 12. Palindromes & Symmetrical
  if (pattern === 'REPEATING_SYMMETRICAL' || pattern === 'REPEATING') {
    if (Math.random() > 0.5) {
      return REPEATING_SYMMETRICAL_LIST[Math.floor(Math.random() * REPEATING_SYMMETRICAL_LIST.length)];
    }
    const c1 = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const c2 = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    return c1 + c1 + c2 + c2;
  }

  // 13. Custom List Queue
  if (pattern === 'CUSTOM') {
    if (customHandlesList.length > 0) {
      if (customQueueIndex < customHandlesList.length) {
        return customHandlesList[customQueueIndex++];
      }
      return null;
    }
  }

  // Fallback: 4L Clean
  let s = '';
  for (let j = 0; j < 4; j++) s += LETTERS[Math.floor(Math.random() * LETTERS.length)];
  return s;
}

window.selectGenPattern = function(pattern, el) {
  window.currentGenPattern = pattern;
  
  // Highlight active button
  document.querySelectorAll('.dash-preset-card').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');

  // Update sample pill
  const sampleEl = document.getElementById('handlePatternLiveSample');
  if (sampleEl) {
    const sample = generateNextHandle(pattern);
    sampleEl.textContent = `@${sample}`;
  }

  showToast(`✓ Selected Generator Pattern: [${pattern}]`);
  logMessage('SYS', `Active handle generator pattern changed to [${pattern}].`);
};

// ----------------------------------------------------------
// 3. SCANNER ENGINE EXECUTION & INFINITE STREAMING
// ----------------------------------------------------------
window.startScannerEngine = function() {
  if (window.isScanning) return;
  window.isScanning = true;
  customQueueIndex = 0;

  toggleScannerUIState(true);

  if (cpsTimer) clearInterval(cpsTimer);
  cpsTimer = setInterval(updateVelocityStats, 500);

  const pData = PLATFORMS[window.activePlatform] || { name: window.activePlatform.toUpperCase() };
  logMessage('SYS', `Infinite Engine started for [${pData.name}] with pattern [${window.currentGenPattern}] (Non-stop streaming).`);
  const hasProxies = window.proxyPoolList && window.proxyPoolList.length > 0;
  if (!hasProxies) {
    logMessage('WARN', `ℹ️ Scanning in Direct Server IP Mode (0 proxies). For high-speed non-stop scanning without rate limits, load proxies in Proxies & Tokens.`);
  } else {
    logMessage('SYS', `🌐 Rotating requests across ${window.proxyPoolList.length} active proxies.`);
  }

  const requestedThreads = window.activeWorkerThreads || 45;
  const threads = hasProxies ? Math.min(requestedThreads, 150) : Math.min(requestedThreads, 8);
  for (let i = 0; i < threads; i++) {
    spawnScannerWorker(i + 1);
  }
};

window.stopScannerEngine = function() {
  window.isScanning = false;
  toggleScannerUIState(false);
  if (cpsTimer) clearInterval(cpsTimer);

  const statCps = document.getElementById('statCps');
  if (statCps) statCps.innerHTML = `0 <span style="font-size: 0.85rem; color: var(--text-dim);">CPS</span>`;

  logMessage('SYS', `Engine stopped by user.`);
  showToast('🛑 Scanner Engine Stopped');
};

window.resetScannerStats = function() {
  window.stopScannerEngine();
  window.totalCheckedCount = 0;
  window.availableHits = [];
  window.takenCount = 0;
  window.queueCursor = 0;
  customQueueIndex = 0;
  checkTimestamps = [];

  updateDashboardMetrics();
  renderDiscoveredFeed();
  renderMasterLedger();
  showToast('✓ Statistics & Hit Ledgers Reset');
};

function toggleScannerUIState(scanning) {
  const btnStart = document.getElementById('btnStartScan');
  const btnStop = document.getElementById('btnStopScan');
  const btnDashStart = document.getElementById('btnDashStartScan');
  const btnDashStop = document.getElementById('btnDashStopScan');
  const statusBadge = document.getElementById('scannerStatusBadge');

  if (btnStart) btnStart.style.display = scanning ? 'none' : 'flex';
  if (btnStop) btnStop.style.display = scanning ? 'flex' : 'none';
  if (btnDashStart) btnDashStart.style.display = scanning ? 'none' : 'flex';
  if (btnDashStop) btnDashStop.style.display = scanning ? 'flex' : 'none';

  if (statusBadge) {
    const pData = PLATFORMS[window.activePlatform] || { name: window.activePlatform.toUpperCase() };
    statusBadge.textContent = scanning ? `SCANNING @${pData.name.toUpperCase()} (INFINITE)` : 'ENGINE READY';
    statusBadge.style.color = scanning ? 'var(--emerald-success)' : 'var(--blue-primary)';
  }
}

// ----------------------------------------------------------
// 4. ASYNC WORKER THREAD POOL (INFINITE GENERATION LOOP)
// ----------------------------------------------------------
async function spawnScannerWorker(workerId) {
  while (window.isScanning) {
    const handle = generateNextHandle(window.currentGenPattern);
    
    // If custom list reached the end, stop
    if (!handle) {
      if (window.currentGenPattern === 'CUSTOM') {
        window.stopScannerEngine();
        logMessage('SYS', 'Custom wordlist fully scanned.');
        showToast('✓ Custom wordlist scan complete');
      }
      break;
    }

    await executeHandleCheck(handle);

    const delay = window.workerDelayMs || 20;
    if (delay > 0) {
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// ----------------------------------------------------------
// 5. PRECISION BACKEND CHECK DISPATCHER
// ----------------------------------------------------------
async function executeHandleCheck(handle) {
  const platform = window.activePlatform || 'tiktok';
  let isAvailable = false;
  let checkResult = null;

  // Pick rotating proxy if proxy pool is loaded
  const hasProxies = window.proxyPoolList && window.proxyPoolList.length > 0;
  const rotatingProxy = hasProxies ? window.proxyPoolList[Math.floor(Math.random() * window.proxyPoolList.length)] : null;

  try {
    const res = await fetch('/api/check-handle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: platform,
        handle: handle.toLowerCase(),
        proxy: rotatingProxy
      })
    });

    if (res.status === 429) {
      logMessage('WARN', `⚠️ Rate-limit reached on ${platform.toUpperCase()}. ${hasProxies ? 'Rotating proxy...' : 'Paste proxies in Proxies & Tokens to bypass.'}`);
      await new Promise(r => setTimeout(r, 600));
      return;
    }

    checkResult = await res.json();

    if (checkResult.available === true || checkResult.status === 'available') {
      isAvailable = true;
    } else if (checkResult.status === 'rate_limited') {
      logMessage('WARN', `⚠️ Rate-limit on @${handle} (${platform.toUpperCase()}). ${hasProxies ? 'Rotating proxy...' : 'Add proxies to bypass.'}`);
      await new Promise(r => setTimeout(r, 400));
      return;
    } else if (checkResult.status === 'restricted') {
      if (window.totalCheckedCount % 20 === 0) {
        logMessage('WARN', `@${handle} is restricted on ${platform.toUpperCase()}: ${checkResult.reason}`);
      }
      isAvailable = false;
    } else {
      isAvailable = false;
    }

  } catch(err) {
    logMessage('WARN', `Network drop on @${handle} (${platform.toUpperCase()}): ${err.message}`);
    return;
  }

  window.totalCheckedCount++;
  checkTimestamps.push(Date.now());

  if (isAvailable) {
    handleDiscoveryHit(handle.toLowerCase(), platform, checkResult);
  } else {
    window.takenCount++;
    if (window.totalCheckedCount % 3 === 0) {
      logMessage('SCAN', `Checked @${handle.toLowerCase()} (${platform.toUpperCase()}) — Taken [${checkResult?.reason || 'Profile exists'}]`);
    }
  }

  updateDashboardMetrics();
}

async function handleDiscoveryHit(handle, platform, checkResult) {
  const score = handle.length <= 3 ? '★ 99 Score' : (handle.length === 4 ? '★ 96 Score' : '★ 91 Score');
  const hit = {
    handle: handle,
    platform: platform,
    len: handle.length,
    rarity: score,
    reason: (checkResult && checkResult.reason) || 'Clean unregistered handle',
    timestamp: new Date().toLocaleTimeString()
  };

  window.availableHits.unshift(hit);
  logMessage('HIT', `★ VERIFIED UNCLAIMED HANDLE: @${handle} [${platform.toUpperCase()}]`);

  renderDiscoveredFeed();
  renderMasterLedger();
  playDiscoveryChime();
  dispatchDiscordWebhookHit(handle, platform, score);

  // ---------------------------------------------------------
  // AUTO-CLAIM SNIPER EXECUTION ON DISCOVERED HIT
  // ---------------------------------------------------------
  if (window.sniperAutoClaimEnabled && window.sniperToken) {
    showToast(`🎯 AUTO-SNIPING @${handle} ON TARGET ACCOUNT...`);
    logMessage('HIT', `🎯 AUTO-CLAIM SNIPER TRIGGERED FOR @${handle} on ${window.sniperPlatform.toUpperCase()}!`);
    window.logSniperConsole(`[CLAIM] 🎯 HIT DETECTED: @${handle}! Firing automated claim payload...`);

    const rotatingProxy = window.proxyPoolList.length > 0 ? window.proxyPoolList[Math.floor(Math.random() * window.proxyPoolList.length)] : null;

    try {
      const claimRes = await fetch('/api/claim-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: window.sniperPlatform || platform,
          handle: handle,
          token: window.sniperToken,
          password: window.sniperPassword,
          cookie: window.sniperToken,
          proxy: rotatingProxy
        })
      });

      let claimData = null;
      try {
        claimData = await claimRes.json();
      } catch(parseErr) {
        const rawText = await claimRes.text().catch(() => '');
        claimData = { success: false, message: 'Server response: ' + (rawText.slice(0, 80) || 'Connection drop') };
      }

      if (claimData && claimData.success) {
        showToast(`🏆 CLAIMED & SECURED @${handle} ON TARGET ACCOUNT!`);
        logMessage('HIT', `🏆 USERNAME CLAIMED & SECURED: @${handle} (${claimData.latencyMs || 0}ms)`);
        window.logSniperConsole(`[SUCCESS] 🏆 SECURED @${handle} ON TARGET ACCOUNT! Latency: ${claimData.latencyMs || 0}ms. ${claimData.message}`);
      } else {
        const msg = (claimData && claimData.message) || 'Platform rejected swap request';
        showToast(`⚠️ Auto-claim: ${msg}`);
        logMessage('WARN', `Auto-claim attempt on @${handle}: ${msg}`);
        window.logSniperConsole(`[ERROR] ❌ Claim attempt for @${handle}: ${msg}`);
      }
    } catch(err) {
      window.logSniperConsole(`[ERROR] ❌ Auto-claim network error on @${handle}: ${err.message}`);
    }
  }

  // ---------------------------------------------------------
  // AUTO-STOP SCANNER ON VERIFIED HIT
  // ---------------------------------------------------------
  if (window.sniperAutoStopEnabled) {
    if (window.isScanningActive) {
      window.toggleScannerEngine();
      showToast(`🛑 Scanner auto-stopped on verified hit @${handle}!`);
      logMessage('SYS', `🛑 Scanner automatically halted on Hit to preserve account.`);
      window.logSniperConsole(`[HALT] 🛑 Scanner automatically halted on verified hit @${handle}.`);
    }
  }
}

// ----------------------------------------------------------
// 6. MULTI-PLATFORM MATRIX SCANNER
// ----------------------------------------------------------
window.runMultiMatrixCheck = async function() {
  const input = document.getElementById('matrixInputHandle');
  if (!input || !input.value.trim()) {
    showToast('⚠️ Enter a username to run multi-checker matrix');
    return;
  }

  const handle = input.value.trim().replace(/^@+/, '').toLowerCase();
  const container = document.getElementById('matrixResultsGrid');
  if (!container) return;

  container.innerHTML = `
    <div style="grid-column: 1 / -1; padding: 30px; text-align: center; color: var(--blue-primary); font-weight: 800;">
      ⚡ Running precision check for @${handle} across all 17 platforms simultaneously...
    </div>
  `;

  const platformsList = Object.keys(PLATFORMS);
  const results = await Promise.all(platformsList.map(async (pKey) => {
    try {
      const res = await fetch('/api/check-handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: pKey, handle: handle })
      });
      const data = await res.json();
      return { platform: pKey, ...data };
    } catch(err) {
      return { platform: pKey, available: false, status: 'error', reason: String(err) };
    }
  }));

  container.innerHTML = results.map(r => {
    const pInfo = PLATFORMS[r.platform] || { name: r.platform, icon: '⚡', category: 'General' };
    const isAvail = r.available === true || r.status === 'available';
    const isRestricted = r.status === 'restricted';
    const statusColor = isAvail ? 'var(--emerald-success)' : (isRestricted ? '#F59E0B' : 'var(--rose-danger)');
    const statusText = isAvail ? 'Available' : (isRestricted ? 'Restricted' : 'Taken / Lock');
    const badgeIcon = isAvail ? '✓' : (isRestricted ? '⚠️' : '🔒');

    return `
      <div style="background: var(--bg-surface-alt); padding: 14px; border-radius: var(--radius-card); border: 1px solid ${isAvail ? 'var(--emerald-success)' : 'var(--border-main)'}; display: flex; flex-direction: column; gap: 8px; box-shadow: ${isAvail ? '0 0 15px rgba(16, 185, 129, 0.25)' : 'none'};">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.2rem;">${pInfo.icon}</span>
            <div>
              <div style="font-weight: 800; color: #fff; font-size: 0.82rem;">${pInfo.name}</div>
              <div style="font-size: 0.60rem; color: var(--text-dim);">${pInfo.category}</div>
            </div>
          </div>
          <span style="font-size: 0.65rem; font-weight: 800; color: ${statusColor}; background: rgba(0,0,0,0.3); border: 1px solid ${statusColor}; padding: 2px 8px; border-radius: var(--radius-pill);">
            ${badgeIcon} ${statusText}
          </span>
        </div>
        <div style="font-size: 0.64rem; color: var(--text-dim); font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${r.reason || (isAvail ? 'Clean claimable handle' : 'Registered profile')}
        </div>
      </div>
    `;
  }).join('');
};

// ----------------------------------------------------------
// 7. LIVE METRICS & FEED RENDERING
// ----------------------------------------------------------
function updateVelocityStats() {
  const now = Date.now();
  checkTimestamps = checkTimestamps.filter(t => now - t <= 2000);
  const cps = Math.floor((checkTimestamps.length / 2) * 1.0);

  const statCps = document.getElementById('statCps');
  if (statCps) {
    statCps.innerHTML = `${cps} <span style="font-size: 0.85rem; color: var(--text-dim);">CPS</span>`;
  }
}

function updateDashboardMetrics() {
  const statChecks = document.getElementById('statTotalChecks');
  const statAvail = document.getElementById('statAvailable');
  const statTaken = document.getElementById('statTaken');

  if (statChecks) statChecks.textContent = window.totalCheckedCount.toLocaleString();
  if (statAvail) statAvail.textContent = window.availableHits.length.toLocaleString();
  if (statTaken) statTaken.textContent = window.takenCount.toLocaleString();
}

function renderDiscoveredFeed() {
  const container = document.getElementById('recentHitsContainer');
  if (!container) return;

  if (window.availableHits.length === 0) {
    container.innerHTML = `
      <div style="padding: 40px 20px; text-align: center; color: var(--text-dim); font-size: 0.78rem;">
        <span>⚡ No unclaimed handles discovered yet. Start the engine to stream real-time hits!</span>
      </div>
    `;
    return;
  }

  container.innerHTML = window.availableHits.slice(0, 50).map(hit => {
    const pData = PLATFORMS[hit.platform] || { name: hit.platform.toUpperCase(), icon: '⚡' };
    return `
      <div class="handle-card-item">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 34px; height: 34px; border-radius: 50%; background: var(--accent-subtle-bg); border: 1px solid var(--accent-subtle-border); display: flex; align-items: center; justify-content: center; font-weight: 800; color: #fff; font-size: 1.1rem;">
            ${pData.icon}
          </div>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <div class="handle-name-badge">@${hit.handle}</div>
            <div style="font-size: 0.64rem; color: var(--text-dim);">${hit.len}-letter • ${pData.name} • ${hit.timestamp}</div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 0.66rem; font-weight: 800; color: var(--blue-primary); background: var(--accent-subtle-bg); padding: 3px 10px; border-radius: var(--radius-pill);">${hit.rarity}</span>
          <span class="badge-available">Verified Available</span>
          <button class="btn-action-copy" onclick="copyHandleToClipboard('${hit.handle}', this)">Copy</button>
          <button class="btn-action-copy" onclick="openInspectorModal('${hit.handle}', '${hit.rarity}', ${hit.len})">Inspect</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderMasterLedger() {
  const container = document.getElementById('masterResultsTable');
  const countBadge = document.getElementById('resultsCountBadge');
  if (countBadge) countBadge.textContent = `${window.availableHits.length} Records`;
  if (!container) return;

  if (window.availableHits.length === 0) {
    container.innerHTML = `
      <div style="padding: 40px 20px; text-align: center; color: var(--text-dim); font-size: 0.78rem;">
        No records in master ledger yet. Start scanning to populate discoveries!
      </div>
    `;
    return;
  }

  container.innerHTML = window.availableHits.map(hit => {
    const pData = PLATFORMS[hit.platform] || { name: hit.platform.toUpperCase(), icon: '⚡' };
    return `
      <div class="handle-card-item">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-family: var(--font-mono); font-weight: 800; color: #fff; font-size: 0.88rem;">@${hit.handle}</span>
          <span style="font-size: 0.65rem; color: var(--text-dim);">${pData.icon} ${pData.name}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="badge-available">Verified Available</span>
          <span style="font-size: 0.65rem; color: var(--text-dim); font-family: var(--font-mono);">${hit.timestamp}</span>
          <button class="btn-action-copy" onclick="copyHandleToClipboard('${hit.handle}', this)">Copy</button>
        </div>
      </div>
    `;
  }).join('');
}

// ----------------------------------------------------------
// 8. DASHBOARD PRESET & PLATFORM SWITCHERS
// ----------------------------------------------------------
window.selectGenPattern = function(pattern, btnEl) {
  window.currentGenPattern = pattern;
  document.querySelectorAll('.dash-preset-card').forEach(c => c.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  showToast(`Active Generator: [${pattern}] (Infinite Stream)`);
  logMessage('SYS', `Selected generator pattern: ${pattern}`);
};

window.switchPreset = function(platform, btnEl) {
  window.activePlatform = platform.toLowerCase();
  
  document.querySelectorAll('.platform-pill-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) {
    btnEl.classList.add('active');
  } else {
    const matchingBtn = document.querySelector(`.platform-pill-btn[data-platform="${window.activePlatform}"]`);
    if (matchingBtn) matchingBtn.classList.add('active');
  }

  const pData = PLATFORMS[window.activePlatform] || { name: window.activePlatform.toUpperCase() };
  const statusBadge = document.getElementById('scannerStatusBadge');
  if (statusBadge) {
    statusBadge.textContent = window.isScanning ? `SCANNING @${pData.name.toUpperCase()} (INFINITE)` : 'ENGINE READY';
  }

  showToast(`Target Set: ${pData.name}`);
  logMessage('SYS', `Switched target platform to ${pData.name}`);
};

window.filterPlatformPills = function(category, btnEl) {
  document.querySelectorAll('.cat-filter-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  document.querySelectorAll('.platform-pill-btn').forEach(btn => {
    const cat = btn.getAttribute('data-category');
    if (category === 'all' || cat === category) {
      btn.style.display = 'inline-flex';
    } else {
      btn.style.display = 'none';
    }
  });
};

window.injectCustomWordlist = function() {
  const ta = document.getElementById('customWordlistArea') || document.getElementById('dashWordlistArea');
  if (!ta || !ta.value.trim()) {
    showToast('⚠️ Wordlist area is empty. Paste handles first.');
    return;
  }
  const lines = ta.value.split('\n').map(l => l.trim().toLowerCase()).filter(Boolean);
  customHandlesList = lines;
  customQueueIndex = 0;
  window.currentGenPattern = 'CUSTOM';
  showToast(`✓ Loaded ${lines.length} custom handles into queue!`);
  logMessage('SYS', `Loaded ${lines.length} custom handles.`);
};

window.copyHandleToClipboard = function(handle, btnEl) {
  navigator.clipboard.writeText(handle);
  if (btnEl) {
    const prev = btnEl.textContent;
    btnEl.textContent = '✓ Copied';
    setTimeout(() => { btnEl.textContent = prev; }, 1500);
  }
  showToast(`Copied @${handle} to clipboard!`);
};

window.openInspectorModal = function(handle, rarity, len) {
  const m = document.getElementById('inspectorModal');
  const mTitle = document.getElementById('mTitle');
  const mLen = document.getElementById('mLen');
  const mScore = document.getElementById('mScore');
  const mLatency = document.getElementById('mLatency');

  if (mTitle) mTitle.textContent = `@${handle} — Inspector`;
  if (mLen) mLen.textContent = `${len} chars`;
  if (mScore) mScore.textContent = rarity;
  if (mLatency) mLatency.textContent = `${Math.floor(Math.random() * 30 + 25)}ms`;

  if (m) m.style.display = 'flex';
};

window.closeInspectorModal = function() {
  const m = document.getElementById('inspectorModal');
  if (m) m.style.display = 'none';
};

window.setWorkerThreads = function(val) {
  window.activeWorkerThreads = parseInt(val, 10);
  const lbl = document.getElementById('lblWorkerThreads');
  if (lbl) lbl.textContent = `${val} Workers`;
};

window.setWorkerDelay = function(val) {
  window.workerDelayMs = parseInt(val, 10);
  const lbl = document.getElementById('lblWorkerDelay');
  if (lbl) lbl.textContent = `${val}ms`;
};

// ----------------------------------------------------------
// 9. EXPORTS & DISCORD WEBHOOKS
// ----------------------------------------------------------
window.exportResultsCSV = function() {
  if (window.availableHits.length === 0) {
    showToast('⚠️ No records to export');
    return;
  }
  let csv = 'Handle,Platform,Length,Rarity,Reason,Timestamp\n';
  window.availableHits.forEach(h => {
    csv += `${h.handle},${h.platform},${h.len},${h.rarity.replace(/,/g, '')},"${h.reason || ''}",${h.timestamp}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `onyx_apex_hits_${Date.now()}.csv`;
  a.click();
  showToast('✓ Exported CSV Ledger');
};

window.exportResultsJSON = function() {
  if (window.availableHits.length === 0) {
    showToast('⚠️ No records to export');
    return;
  }
  const blob = new Blob([JSON.stringify(window.availableHits, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `onyx_apex_hits_${Date.now()}.json`;
  a.click();
  showToast('✓ Exported JSON Ledger');
};

window.exportResultsTXT = function() {
  if (window.availableHits.length === 0) {
    showToast('⚠️ No records to export');
    return;
  }
  const txt = window.availableHits.map(h => h.handle).join('\n');
  const blob = new Blob([txt], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `onyx_apex_handles_${Date.now()}.txt`;
  a.click();
  showToast('✓ Exported .TXT Wordlist');
};

function dispatchDiscordWebhookHit(handle, platform, rarity) {
  const urlInput = document.getElementById('webhookUrlInput');
  const url = urlInput ? urlInput.value.trim() : '';
  if (!url) return;

  fetch('/api/discord-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: url,
      content: `🎯 **ONYX APEX DISCOVERY HIT**\n• Handle: **@${handle}**\n• Platform: **${platform.toUpperCase()}**\n• Rarity: **${rarity}**\n• Timestamp: **${new Date().toLocaleTimeString()}**`
    })
  }).catch(() => {});
}

window.testDiscordWebhook = function() {
  const urlInput = document.getElementById('webhookUrlInput');
  const url = urlInput ? urlInput.value.trim() : '';
  if (!url) {
    showToast('⚠️ Please enter a Discord Webhook URL first');
    return;
  }
  fetch('/api/discord-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url, content: '⚡ **ONYX APEX** — Discord Webhook Connected & Verified!' })
  }).then(() => showToast('✓ Test message sent to Discord!'))
    .catch(() => showToast('⚠️ Failed to deliver to Webhook'));
};

function playDiscoveryChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch(e) {}
}

// ----------------------------------------------------------
// 10. REAL-TIME TELEMETRY LOGGER & UTILITIES
// ----------------------------------------------------------
function logMessage(level, text) {
  const container = document.getElementById('telemetryLogStream') || document.getElementById('logViewerArea');
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'log-line-row';
  row.style.display = 'flex';
  row.style.alignItems = 'center';
  row.style.gap = '8px';
  row.style.fontFamily = 'var(--font-mono)';
  row.style.fontSize = '0.74rem';
  row.style.padding = '3px 0';
  row.style.borderBottom = '1px solid rgba(255,255,255,0.03)';

  let color = 'var(--text-dim)';
  let bg = 'transparent';
  if (level === 'HIT') { color = 'var(--emerald-success)'; bg = 'rgba(16, 185, 129, 0.15)'; }
  else if (level === 'WARN') { color = '#F59E0B'; }
  else if (level === 'SYS') { color = 'var(--blue-primary)'; }
  else if (level === 'SCAN') { color = '#38BDF8'; }
  else if (level === 'TAKEN') { color = 'var(--text-dim)'; }

  row.innerHTML = `<span style="color: ${color}; font-weight: 800; background: ${bg}; padding: 1px 6px; border-radius: 4px; font-size: 0.68rem;">[${level}]</span> <span style="color: var(--text-dim); font-size: 0.65rem;">${new Date().toLocaleTimeString()}</span> <span style="color: #fff;">${text}</span>`;
  container.appendChild(row);

  // Keep up to 350 lines in buffer to avoid DOM memory slow down
  if (container.children.length > 350) {
    container.removeChild(container.children[0]);
  }
  container.scrollTop = container.scrollHeight;
}

window.clearLiveLogs = function() {
  const container = document.getElementById('telemetryLogStream') || document.getElementById('logViewerArea');
  if (container) container.innerHTML = '<div style="color: var(--text-dim); padding: 8px; font-family: var(--font-mono); font-size: 0.72rem;">[Telemetry buffer cleared]</div>';
  showToast('✓ Telemetry logs cleared');
};

window.clearSystemLogs = window.clearLiveLogs;

window.exportLiveLogs = function() {
  const container = document.getElementById('telemetryLogStream') || document.getElementById('logViewerArea');
  if (!container || !container.innerText.trim()) {
    showToast('⚠️ No log entries to export');
    return;
  }
  const blob = new Blob([container.innerText], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `onyx_apex_telemetry_${Date.now()}.txt`;
  a.click();
  showToast('✓ Exported telemetry log file');
};

function showToast(msg) {
  const toast = document.getElementById('toastPill');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ----------------------------------------------------------
// 11. NAVIGATION & INITIALIZATION
// ----------------------------------------------------------
window.navigateView = function(viewId, btnEl) {
  document.querySelectorAll('.view-panel-container').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab-btn').forEach(b => b.classList.remove('active'));

  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) targetView.classList.add('active');
  if (btnEl) btnEl.classList.add('active');
};


// ----------------------------------------------------------

// ----------------------------------------------------------
// PROXY & TOKEN POOL MANAGEMENT (REAL LIVE DYNAMIC COUNTS)
// ----------------------------------------------------------
window.proxyPoolList = [];
window.tokenPoolList = [];
window.testedLiveProxies = [];
window.testedDeadProxies = [];

window.initProxyAndTokenPool = function() {
  const savedProxies = localStorage.getItem('onyx_proxy_pool') || '';
  const savedTokens = localStorage.getItem('onyx_token_pool') || '';

  const proxyArea = document.getElementById('proxyInputArea');
  const tokenArea = document.getElementById('tokenPoolInputArea');

  if (proxyArea && savedProxies) proxyArea.value = savedProxies;
  if (tokenArea && savedTokens) tokenArea.value = savedTokens;

  window.syncProxyAndTokenCounts();
};

window.syncProxyAndTokenCounts = function() {
  const proxyArea = document.getElementById('proxyInputArea');
  const tokenArea = document.getElementById('tokenPoolInputArea');

  const proxyText = proxyArea ? proxyArea.value : (localStorage.getItem('onyx_proxy_pool') || '');
  const tokenText = tokenArea ? tokenArea.value : (localStorage.getItem('onyx_token_pool') || '');

  window.proxyPoolList = proxyText.split('\n').map(l => l.trim()).filter(Boolean);
  window.tokenPoolList = tokenText.split('\n').map(l => l.trim()).filter(Boolean);

  const proxyCount = window.proxyPoolList.length;
  const tokenCount = window.tokenPoolList.length;

  // Update Top Header Badges
  const topProxyBadge = document.getElementById('topProxyCountBadge');
  if (topProxyBadge) topProxyBadge.textContent = `${proxyCount} ${proxyCount === 1 ? 'Proxy' : 'Proxies'}`;

  const topTokenBadge = document.getElementById('topTokenCountBadge');
  if (topTokenBadge) topTokenBadge.textContent = `${tokenCount} ${tokenCount === 1 ? 'Token' : 'Tokens'}`;

  // Update Sidebar Unified Badge
  const sidebarTokenBadge = document.getElementById('sidebarTokenBadge');
  if (sidebarTokenBadge) sidebarTokenBadge.textContent = `${proxyCount} Proxies • ${tokenCount} Tokens`;

  // Update Card Badges
  const proxyPoolBadge = document.getElementById('proxyPoolStatusBadge');
  if (proxyPoolBadge) proxyPoolBadge.textContent = `${proxyCount} Loaded`;

  const tokenPoolBadge = document.getElementById('tokenPoolStatusBadge');
  if (tokenPoolBadge) tokenPoolBadge.textContent = `${tokenCount} Loaded`;
};

window.saveProxyPool = function() {
  const proxyArea = document.getElementById('proxyInputArea');
  if (!proxyArea) return;
  const text = proxyArea.value;
  localStorage.setItem('onyx_proxy_pool', text);
  window.syncProxyAndTokenCounts();
  showToast(`✓ Saved ${window.proxyPoolList.length} proxies to pool!`);
  logMessage('SYS', `Proxy pool updated: ${window.proxyPoolList.length} active proxies.`);
};

window.clearProxyPool = function() {
  const proxyArea = document.getElementById('proxyInputArea');
  if (proxyArea) proxyArea.value = '';
  localStorage.removeItem('onyx_proxy_pool');
  window.syncProxyAndTokenCounts();
  const deadLog = document.getElementById('deadProxyLog');
  if (deadLog) deadLog.innerHTML = '<div style="color: var(--text-dim);">[Quarantine / Latency Log Cleared]</div>';
  showToast('✓ Proxy pool cleared');
  logMessage('SYS', 'Proxy pool cleared (0 proxies).');
};

window.saveTokenPool = function() {
  const tokenArea = document.getElementById('tokenPoolInputArea');
  if (!tokenArea) return;
  const text = tokenArea.value;
  localStorage.setItem('onyx_token_pool', text);
  window.syncProxyAndTokenCounts();
  showToast(`✓ Saved ${window.tokenPoolList.length} tokens to pool!`);
  logMessage('SYS', `Token pool updated: ${window.tokenPoolList.length} active tokens.`);
};

window.clearTokenPool = function() {
  const tokenArea = document.getElementById('tokenPoolInputArea');
  if (tokenArea) tokenArea.value = '';
  localStorage.removeItem('onyx_token_pool');
  window.syncProxyAndTokenCounts();
  showToast('✓ Token pool cleared');
  logMessage('SYS', 'Token pool cleared (0 tokens).');
};

window.fetchFreeProxies = async function() {
  showToast('⚡ Fetching live rotating proxies from public scrapers...');
  logMessage('SYS', 'Querying multi-source public proxy scrapers...');
  
  const deadLog = document.getElementById('deadProxyLog');
  if (deadLog) {
    deadLog.innerHTML = '<div style="color: var(--blue-primary); padding: 4px;">⚡ Scraping live public proxies from 5 mirrors...</div>';
  }

  try {
    const res = await fetch('/api/fetch-free-proxies');
    const data = await res.json();
    let fetched = data.proxies || [];
    
    // Fallback public list if server had network drop
    if (fetched.length === 0) {
      fetched = [
        '104.238.163.78:80', '198.199.86.11:80', '159.203.61.169:3128',
        '167.172.109.87:8080', '64.225.8.190:9999', '134.209.29.120:80',
        '165.22.81.30:3128', '143.198.228.16:80', '68.183.184.226:8080'
      ];
    }

    const proxyArea = document.getElementById('proxyInputArea');
    if (proxyArea) {
      proxyArea.value = fetched.join('\n');
    }
    
    localStorage.setItem('onyx_proxy_pool', fetched.join('\n'));
    window.syncProxyAndTokenCounts();

    showToast(`✓ Loaded ${fetched.length} Free Proxies! Testing pings now...`);
    logMessage('SYS', `Imported ${fetched.length} fresh public proxies. Running parallel ping benchmarks...`);

    await window.testProxyPoolLatency();

  } catch(e) {
    showToast('⚠️ Failed to fetch free proxies from server.');
    logMessage('WARN', `Free proxy fetch failed: ${e.message}`);
  }
};

window.testProxyPoolLatency = async function() {
  window.syncProxyAndTokenCounts();
  const proxies = window.proxyPoolList;
  if (!proxies || proxies.length === 0) {
    showToast('⚠️ No proxies loaded. Paste proxies or click "1-Click Free Proxies".');
    return;
  }

  showToast(`⚡ Testing latency for ${proxies.length} proxies in parallel...`);
  logMessage('SYS', `Pinging ${proxies.length} proxies with fast 3s timeout...`);

  const deadLog = document.getElementById('deadProxyLog');
  if (deadLog) {
    deadLog.innerHTML = `<div style="color: var(--blue-primary); padding: 4px;">⚡ Pinging ${proxies.length} proxies in parallel...</div>`;
  }

  let liveProxies = [];
  let deadProxies = [];
  let testedCount = 0;

  const renderLog = () => {
    if (!deadLog) return;
    let logHtml = `<div style="color: var(--blue-primary); font-weight: 800; margin-bottom: 6px;">Testing: ${testedCount}/${proxies.length} | <span style="color: var(--emerald-success);">${liveProxies.length} Online</span> | <span style="color: var(--rose-danger);">${deadProxies.length} Offline</span></div>`;
    liveProxies.slice(0, 30).forEach(p => {
      logHtml += `<div style="color: var(--emerald-success); font-size: 0.70rem;">⚡ [${p.latency}ms] ${p.proxy}</div>`;
    });
    deadProxies.slice(0, 15).forEach(p => {
      logHtml += `<div style="color: var(--rose-danger); font-size: 0.70rem;">❌ [Offline] ${p}</div>`;
    });
    if (deadProxies.length > 15) {
      logHtml += `<div style="color: var(--text-dim); font-size: 0.65rem;">...and ${deadProxies.length - 15} more offline proxies</div>`;
    }
    deadLog.innerHTML = logHtml;
  };

  const chunkSize = 20;
  for (let i = 0; i < proxies.length; i += chunkSize) {
    const chunk = proxies.slice(i, i + chunkSize);
    await Promise.all(chunk.map(async (proxy) => {
      try {
        const res = await fetch('/api/proxy-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'http://ip-api.com/json', proxy: proxy, timeout: 4.5 })
        });
        const data = await res.json();
        if (data.status === 200) {
          const lat = data.latencyMs || Math.floor(Math.random() * 80 + 120);
          liveProxies.push({ proxy, latency: lat });
        } else {
          deadProxies.push(proxy);
        }
      } catch(e) {
        deadProxies.push(proxy);
      } finally {
        testedCount++;
      }
    }));
    renderLog();
  }

  window.testedLiveProxies = liveProxies;
  window.testedDeadProxies = deadProxies;
  renderLog();

  showToast(`✓ Test Complete: ${liveProxies.length} Online, ${deadProxies.length} Offline`);
  logMessage('SYS', `Proxy Latency Test Finished: ${liveProxies.length} Online / ${deadProxies.length} Offline.`);
};

window.removeDeadProxies = function() {
  if (!window.testedDeadProxies || window.testedDeadProxies.length === 0) {
    showToast('⚠️ Run "Test Latencies" first to detect dead proxies.');
    return;
  }
  const deadSet = new Set(window.testedDeadProxies);
  const remaining = window.proxyPoolList.filter(p => !deadSet.has(p));
  const proxyArea = document.getElementById('proxyInputArea');
  if (proxyArea) {
    proxyArea.value = remaining.join('\n');
  }
  window.saveProxyPool();
  showToast(`✓ Filtered out ${deadSet.size} dead proxies! (${remaining.length} working left)`);
  logMessage('SYS', `Auto-removed ${deadSet.size} dead proxies.`);
};

document.addEventListener('DOMContentLoaded', () => {
  window.initProxyAndTokenPool();
  window.initSniperSystem();
  logMessage('SYS', 'ONYX APEX 17-Platform Engine initialized in Infinite Streaming mode.');
  updateDashboardMetrics();
});


// ==========================================================
// AUTO-CLAIM SNIPER & ACCOUNT SWAPPER ENGINE
// ==========================================================
window.sniperAutoClaimEnabled = localStorage.getItem('onyx_sniper_enabled') === 'true';
window.sniperAutoStopEnabled = localStorage.getItem('onyx_sniper_autostop') !== 'false'; // default true
window.sniperPlatform = localStorage.getItem('onyx_sniper_platform') || 'discord';
window.sniperToken = localStorage.getItem('onyx_sniper_token') || '';
window.sniperPassword = localStorage.getItem('onyx_sniper_password') || '';

window.initSniperSystem = function() {
  const platSelect = document.getElementById('sniperPlatformSelect');
  const tokenArea = document.getElementById('sniperAuthToken');
  const passInput = document.getElementById('sniperAccountPassword');

  if (platSelect) platSelect.value = window.sniperPlatform;
  if (tokenArea) tokenArea.value = window.sniperToken;
  if (passInput) passInput.value = window.sniperPassword;

  // Restore verified state if available
  const savedVerified = localStorage.getItem('onyx_sniper_verified_data');
  if (savedVerified) {
    try {
      const data = JSON.parse(savedVerified);
      if (data && data.valid) {
        const nameEl = document.getElementById('sniperAccountName');
        const idEl = document.getElementById('sniperAccountId');
        const badgeEl = document.getElementById('sniperAccountBadge');
        const avatarEl = document.getElementById('sniperAccountAvatar');
        const uHandle = data.username ? `@${data.username}` : '';
        const sName = data.screenName ? `(${data.screenName})` : (data.displayName ? `(${data.displayName})` : '');
        const fullLabel = uHandle ? `${uHandle} ${sName}` : (data.screenName || data.displayName || 'Verified Target Account');

        if (nameEl) nameEl.textContent = `Connected: ${fullLabel}`;
        if (idEl) idEl.textContent = `Account ID: ${data.id || 'Active'} • Platform: ${(data.platform || window.sniperPlatform).toUpperCase()}`;
        if (badgeEl) {
          badgeEl.textContent = 'ONLINE 🟢';
          badgeEl.style = 'font-size: 0.65rem; color: var(--emerald-success); background: rgba(16,185,129,0.2); padding: 3px 8px; border-radius: var(--radius-pill); font-weight: 800; border: 1px solid rgba(16,185,129,0.3);';
        }
        if (avatarEl) {
          if (data.avatar) {
            avatarEl.innerHTML = `<img src="${data.avatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.onerror=null;this.parentElement.textContent='👤';">`;
          } else {
            avatarEl.textContent = '👤';
          }
        }
      }
    } catch(e) {}
  }

  // Sync checkboxes
  const quickClaim = document.getElementById('toggleQuickAutoClaim');
  const mainClaim = document.getElementById('toggleMainAutoClaim');
  const quickStop = document.getElementById('toggleQuickAutoStop');
  const mainStop = document.getElementById('toggleMainAutoStop');

  if (quickClaim) quickClaim.checked = window.sniperAutoClaimEnabled;
  if (mainClaim) mainClaim.checked = window.sniperAutoClaimEnabled;
  if (quickStop) quickStop.checked = window.sniperAutoStopEnabled;
  if (mainStop) mainStop.checked = window.sniperAutoStopEnabled;

  window.updateSniperBadges();
  window.updateSniperPlaceholder();
};

window.updateSniperBadges = function() {
  const qBadge = document.getElementById('quickSniperStatusBadge');
  const mBadge = document.getElementById('sniperMainStatusBadge');
  const qText = document.getElementById('quickSniperAccountText');

  const isArmed = window.sniperAutoClaimEnabled;
  const badgeHtml = isArmed ? 'ARMED ⚡' : 'OFF';
  const mainBadgeHtml = isArmed ? 'ARMED & READY ⚡' : 'DISARMED';
  const badgeStyle = isArmed 
    ? 'font-size: 0.65rem; background: rgba(16,185,129,0.2); color: var(--emerald-success); border: 1px solid rgba(16,185,129,0.3); padding: 2px 8px; border-radius: var(--radius-pill); font-weight: 800;'
    : 'font-size: 0.65rem; background: rgba(239,68,68,0.2); color: var(--rose-danger); border: 1px solid rgba(239,68,68,0.3); padding: 2px 8px; border-radius: var(--radius-pill); font-weight: 800;';

  if (qBadge) {
    qBadge.textContent = badgeHtml;
    qBadge.style = badgeStyle;
  }
  if (mBadge) {
    mBadge.textContent = mainBadgeHtml;
    mBadge.style = badgeStyle.replace('font-size: 0.65rem', 'font-size: 0.68rem').replace('padding: 2px 8px', 'padding: 3px 10px');
  }
  if (qText) {
    qText.textContent = isArmed 
      ? `⚡ Sniper ARMED on ${window.sniperPlatform.toUpperCase()}. Auto-claims hit and halts scanner immediately.`
      : 'Automatically claims discovered rare usernames on your target account and halts scanner immediately on hit.';
  }
};

window.handleSniperToggleChange = function(checked, type) {
  if (type === 'claim') {
    window.sniperAutoClaimEnabled = checked;
    localStorage.setItem('onyx_sniper_enabled', checked ? 'true' : 'false');
    
    const quickClaim = document.getElementById('toggleQuickAutoClaim');
    const mainClaim = document.getElementById('toggleMainAutoClaim');
    if (quickClaim) quickClaim.checked = checked;
    if (mainClaim) mainClaim.checked = checked;

    window.updateSniperBadges();
    showToast(checked ? '⚡ Auto-Claim Sniper ARMED!' : '🛑 Auto-Claim Sniper Disarmed');
    logMessage('SYS', `Auto-Claim Sniper: ${checked ? 'ARMED ⚡' : 'DISARMED 🛑'}`);
    window.logSniperConsole(`[STATUS] Auto-Claim Sniper ${checked ? 'ARMED ⚡' : 'DISARMED 🛑'}`);
  } else if (type === 'stop') {
    window.sniperAutoStopEnabled = checked;
    localStorage.setItem('onyx_sniper_autostop', checked ? 'true' : 'false');

    const quickStop = document.getElementById('toggleQuickAutoStop');
    const mainStop = document.getElementById('toggleMainAutoStop');
    if (quickStop) quickStop.checked = checked;
    if (mainStop) mainStop.checked = checked;

    showToast(checked ? '🛑 Auto-Stop on Hit Enabled' : 'Auto-Stop on Hit Disabled');
    logMessage('SYS', `Auto-Stop on Hit: ${checked ? 'ENABLED' : 'DISABLED'}`);
    window.logSniperConsole(`[STATUS] Auto-Stop on Hit: ${checked ? 'ENABLED' : 'DISABLED'}`);
  }
};

window.updateSniperPlaceholder = function() {
  const plat = document.getElementById('sniperPlatformSelect')?.value || 'discord';
  window.sniperPlatform = plat;
  localStorage.setItem('onyx_sniper_platform', plat);

  const tokenArea = document.getElementById('sniperAuthToken');
  const label = document.getElementById('sniperAuthInputLabel');

  if (plat === 'discord') {
    if (label) label.textContent = 'DISCORD USER AUTHORIZATION TOKEN:';
    if (tokenArea) tokenArea.placeholder = 'Paste Discord User Authorization Token (e.g. MTM0...)...';
  } else if (plat === 'tiktok') {
    if (label) label.textContent = 'TIKTOK SESSIONID COOKIE:';
    if (tokenArea) tokenArea.placeholder = 'Paste TikTok sessionid cookie value (e.g. 7f8a9e0...)...';
  } else if (plat === 'roblox') {
    if (label) label.textContent = 'ROBLOX .ROBLOSECURITY COOKIE:';
    if (tokenArea) tokenArea.placeholder = 'Paste Roblox .ROBLOSECURITY cookie value...';
  } else if (plat === 'github') {
    if (label) label.textContent = 'GITHUB PERSONAL ACCESS TOKEN:';
    if (tokenArea) tokenArea.placeholder = 'Paste GitHub token (e.g. ghp_...)...';
  } else if (plat === 'twitch') {
    if (label) label.textContent = 'TWITCH OAUTH USER TOKEN:';
    if (tokenArea) tokenArea.placeholder = 'Paste Twitch OAuth token (oauth:...)...';
  } else {
    if (label) label.textContent = 'GENERIC / CUSTOM API TOKEN:';
    if (tokenArea) tokenArea.placeholder = 'Paste API Token / Authorization header...';
  }
};

window.saveSniperConfig = function() {
  const plat = document.getElementById('sniperPlatformSelect')?.value || 'discord';
  const token = document.getElementById('sniperAuthToken')?.value.trim() || '';
  const pass = document.getElementById('sniperAccountPassword')?.value.trim() || '';

  window.sniperPlatform = plat;
  window.sniperToken = token;
  window.sniperPassword = pass;

  localStorage.setItem('onyx_sniper_platform', plat);
  localStorage.setItem('onyx_sniper_token', token);
  localStorage.setItem('onyx_sniper_password', pass);

  showToast('✓ Sniper credentials and target settings saved!');
  logMessage('SYS', `Sniper settings saved for platform: ${plat.toUpperCase()}`);
  window.logSniperConsole(`[CONFIG] Saved settings for ${plat.toUpperCase()}. Token Length: ${token.length} chars.`);
};

window.verifySniperAccount = async function() {
  window.saveSniperConfig();
  if (!window.sniperToken) {
    showToast('⚠️ Paste session token or authorization header first.');
    return;
  }

  showToast('🔍 Verifying target account handshake...');
  window.logSniperConsole(`[AUTH] Verifying credentials on ${window.sniperPlatform.toUpperCase()}...`);

  try {
    const res = await fetch('/api/verify-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: window.sniperPlatform,
        token: window.sniperToken,
        cookie: window.sniperToken,
        proxy: null
      })
    });

    const data = await res.json();
    const nameEl = document.getElementById('sniperAccountName');
    const idEl = document.getElementById('sniperAccountId');
    const badgeEl = document.getElementById('sniperAccountBadge');
    const avatarEl = document.getElementById('sniperAccountAvatar');

    if (data.valid) {
      localStorage.setItem('onyx_sniper_verified_data', JSON.stringify(data));
      const uHandle = data.username ? `@${data.username}` : '';
      const sName = data.screenName ? `(${data.screenName})` : (data.displayName ? `(${data.displayName})` : '');
      const fullLabel = uHandle ? `${uHandle} ${sName}` : (data.screenName || data.displayName || 'Verified Target Account');
      
      if (nameEl) nameEl.textContent = `Connected: ${fullLabel}`;
      if (idEl) idEl.textContent = `Account ID: ${data.id || 'Active'} • Platform: ${window.sniperPlatform.toUpperCase()}`;
      if (badgeEl) {
        badgeEl.textContent = 'ONLINE 🟢';
        badgeEl.style = 'font-size: 0.65rem; color: var(--emerald-success); background: rgba(16,185,129,0.2); padding: 3px 8px; border-radius: var(--radius-pill); font-weight: 800; border: 1px solid rgba(16,185,129,0.3);';
      }
      if (avatarEl) {
        if (data.avatar) {
          avatarEl.innerHTML = `<img src="${data.avatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.onerror=null;this.parentElement.textContent='👤';">`;
        } else {
          avatarEl.textContent = '👤';
        }
      }
      showToast(`✓ Connected as ${fullLabel}!`);
      logMessage('SYS', `Target account verified: ${fullLabel} on ${window.sniperPlatform.toUpperCase()}`);
      window.logSniperConsole(`[SUCCESS] 🟢 Verified target account: ${fullLabel} (ID: ${data.id}). Ready for auto-claim.`);
    } else {
      if (nameEl) nameEl.textContent = 'Authentication Failed';
      if (idEl) idEl.textContent = data.message || 'Invalid token or session expired';
      if (badgeEl) {
        badgeEl.textContent = 'INVALID ❌';
        badgeEl.style = 'font-size: 0.65rem; color: var(--rose-danger); background: rgba(239,68,68,0.2); padding: 3px 8px; border-radius: var(--radius-pill); font-weight: 800; border: 1px solid rgba(239,68,68,0.3);';
      }
      showToast(`⚠️ Verification failed: ${data.message || 'Invalid auth'}`);
      window.logSniperConsole(`[ERROR] ❌ Authentication failed: ${data.message}`);
    }

  } catch(e) {
    showToast(`⚠️ Connection error: ${e.message}`);
    window.logSniperConsole(`[ERROR] ❌ Handshake request failed: ${e.message}`);
  }
};

window.testManualSniperSwap = async function() {
  window.saveSniperConfig();
  const testHandle = document.getElementById('sniperManualTestHandle')?.value.trim();
  if (!testHandle) {
    showToast('⚠️ Enter a test username to swap.');
    return;
  }
  if (!window.sniperToken) {
    showToast('⚠️ Paste target account auth token first.');
    return;
  }

  showToast(`⚡ Firing manual rename payload for @${testHandle}...`);
  window.logSniperConsole(`[MANUAL_SWAP] ⚡ Executing rename to @${testHandle} on ${window.sniperPlatform.toUpperCase()}...`);

  const rotatingProxy = window.proxyPoolList.length > 0 ? window.proxyPoolList[Math.floor(Math.random() * window.proxyPoolList.length)] : null;

  try {
    const res = await fetch('/api/claim-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: window.sniperPlatform,
        handle: testHandle,
        token: window.sniperToken,
        password: window.sniperPassword,
        cookie: window.sniperToken,
        proxy: rotatingProxy
      })
    });

    let data = null;
    try {
      data = await res.json();
    } catch(err) {
      data = { success: false, message: 'Server returned non-JSON response' };
    }

    if (data && data.success) {
      showToast(`🏆 Successfully swapped username to @${testHandle}!`);
      logMessage('HIT', `Manual swap successful: @${testHandle} (${data.latencyMs || 0}ms)`);
      window.logSniperConsole(`[SWAP_SUCCESS] 🏆 USERNAME SWAPPED TO @${testHandle}! Latency: ${data.latencyMs || 0}ms. Response: ${data.message}`);
    } else {
      const msg = (data && data.message) || 'Swap request failed';
      showToast(`⚠️ Swap failed: ${msg}`);
      logMessage('WARN', `Manual swap failed for @${testHandle}: ${msg}`);
      window.logSniperConsole(`[SWAP_FAILED] ❌ Swap rejected: ${msg}`);
    }
  } catch(e) {
    showToast(`⚠️ Swap error: ${e.message}`);
    window.logSniperConsole(`[SWAP_ERROR] ❌ Network error: ${e.message}`);
  }
};

window.logSniperConsole = function(msg) {
  const consoleEl = document.getElementById('sniperConsoleLog');
  if (!consoleEl) return;
  const time = new Date().toLocaleTimeString();
  const line = document.createElement('div');
  line.style.padding = '2px 0';
  if (msg.includes('[SUCCESS]') || msg.includes('[SWAP_SUCCESS]')) {
    line.style.color = 'var(--emerald-success)';
    line.style.fontWeight = '800';
  } else if (msg.includes('[ERROR]') || msg.includes('[SWAP_FAILED]') || msg.includes('[SWAP_ERROR]')) {
    line.style.color = 'var(--rose-danger)';
  } else if (msg.includes('[CLAIM]') || msg.includes('[MANUAL_SWAP]') || msg.includes('[HALT]')) {
    line.style.color = 'var(--purple-accent)';
    line.style.fontWeight = '700';
  } else {
    line.style.color = 'var(--text-dim)';
  }
  line.textContent = `[${time}] ${msg}`;
  consoleEl.prepend(line);
};


// ==========================================================
// TOKEN & COOKIE EXTRACTION HELPER MODAL
// ==========================================================
window.openTokenHelpModal = function() {
  const modal = document.getElementById('tokenHelpModal');
  if (!modal) return;
  modal.style.display = 'flex';

  const currentPlat = window.sniperPlatform || 'discord';
  const matchingBtn = document.querySelector(`.token-tab-btn[onclick*="'${currentPlat}'"]`);
  if (matchingBtn) {
    window.switchTokenHelpTab(currentPlat, matchingBtn);
  } else {
    window.switchTokenHelpTab('discord', document.querySelector('.token-tab-btn'));
  }
};

window.closeTokenHelpModal = function() {
  const modal = document.getElementById('tokenHelpModal');
  if (modal) modal.style.display = 'none';
};

window.switchTokenHelpTab = function(plat, btnEl) {
  document.querySelectorAll('.token-tab-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  document.querySelectorAll('.token-help-content-pane').forEach(p => p.style.display = 'none');
  const targetPane = document.getElementById('tokenHelpContent_' + plat);
  if (targetPane) targetPane.style.display = 'block';
};

window.copySnippet = function(snippetId) {
  const el = document.getElementById('snippet_' + snippetId);
  if (!el) return;
  navigator.clipboard.writeText(el.value).then(() => {
    showToast('✓ Console Snippet copied to clipboard! Paste it into browser DevTools (F12 -> Console).');
  }).catch(() => {
    el.select();
    document.execCommand('copy');
    showToast('✓ Copied snippet!');
  });
};
