// src/controllers/session.controller.js
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

// Use vanilla playwright (NOT playwright-extra) — the extra wrapper can leak detection signals
const { chromium } = require('playwright');

const prisma = new PrismaClient();

// ─── Platform Login URLs ──────────────────────────────────────────────────────
const PLATFORM_URLS = {
  YOUTUBE_SHORTS: 'https://accounts.google.com/signin/v2/identifier',
  YOUTUBE_LONG:   'https://accounts.google.com/signin/v2/identifier',
  TIKTOK:         'https://www.tiktok.com/login',
  INSTA_REELS:    'https://www.instagram.com/accounts/login/',
  FB_REELS:       'https://www.facebook.com/login',
  THREADS:        'https://www.threads.net/login',
  LINKEDIN:       'https://www.linkedin.com/login',
};

// ─── Chrome executable path on Windows ───────────────────────────────────────
// We use the real Chrome to avoid Google's "browser not secure" block.
// Playwright's bundled Chromium is flagged by Google; the real Chrome is not.
const CHROME_PATH =
  process.env.CHROME_EXECUTABLE_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// ─── Persistent browser data directory ───────────────────────────────────────
const USER_DATA_DIR = path.join(__dirname, '..', '..', 'browser_data');

// ─── Init script injected into every page ────────────────────────────────────
// Removes automation fingerprints that Google checks.
const STEALTH_SCRIPT = `
  // 1. Hide webdriver flag
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

  // 2. Spoof Chrome runtime object (real Chrome always has this)
  window.chrome = {
    runtime: {},
    loadTimes: function() {},
    csi: function() {},
    app: {},
  };

  // 3. Spoof plugins (real browsers have plugins; headless has 0)
  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      const arr = [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
        { name: 'Native Client', filename: 'internal-nacl-plugin' },
      ];
      arr.item = (i) => arr[i];
      arr.namedItem = (n) => arr.find(p => p.name === n) || null;
      arr.refresh = () => {};
      return arr;
    },
  });

  // 4. Spoof languages
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });

  // 5. Fix permissions API (Playwright returns 'denied' for notifications by default)
  const originalQuery = window.navigator.permissions.query;
  window.navigator.permissions.query = (params) =>
    params.name === 'notifications'
      ? Promise.resolve({ state: Notification.permission })
      : originalQuery(params);
`;

// ─── Main link session handler ────────────────────────────────────────────────
exports.linkSession = async (req, res) => {
  const { profileId, platform } = req.params;

  if (!PLATFORM_URLS[platform]) {
    return res.status(400).json({ error: 'Invalid platform' });
  }

  // Respond immediately — browser opens in background
  res.status(200).json({
    message: 'Browser opened. Please complete the login in the opened window. You have 3 minutes.',
  });

  // Per-profile, per-platform persistent data directory
  // Re-using this dir means Google recognises the browser as a "returning user"
  const profileDataDir = path.join(USER_DATA_DIR, profileId, platform);
  if (!fs.existsSync(profileDataDir)) {
    fs.mkdirSync(profileDataDir, { recursive: true });
  }

  try {
    console.log(`\n🌐 Opening browser for ${platform} | Profile: ${profileId}`);
    console.log(`   Chrome path: ${CHROME_PATH}`);
    console.log(`   User data:   ${profileDataDir}\n`);

    // launchPersistentContext uses the real Chrome binary + the user's own profile
    // folder. Google sees this as a real returning user, not an automation tool.
    const context = await chromium.launchPersistentContext(profileDataDir, {
      headless: false,
      executablePath: CHROME_PATH,          // ← KEY: real Chrome, not bundled Chromium
      args: [
        '--disable-blink-features=AutomationControlled',  // hide CDP automation flag
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions-except=',
        '--disable-default-apps',
        '--window-size=1280,800',
        '--start-maximized',
      ],
      viewport: null,                        // null = use window size (more realistic)
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'Asia/Kathmandu',
      ignoreHTTPSErrors: true,
    });

    // Inject stealth overrides into every new page/frame
    await context.addInitScript(STEALTH_SCRIPT);

    const page = context.pages()[0] || await context.newPage();

    await page.goto(PLATFORM_URLS[platform], {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // ── Wait for user to complete login (3 minutes) ──────────────────────────
    console.log('⏳ Waiting 3 minutes for you to log in...');
    await page.waitForTimeout(3 * 60 * 1000);

    // ── Capture session state ────────────────────────────────────────────────
    const storageState = await context.storageState();

    // ── Persist to database ──────────────────────────────────────────────────
    const existing = await prisma.socialSession.findFirst({
      where: { profileId, platform },
    });

    if (existing) {
      await prisma.socialSession.update({
        where: { id: existing.id },
        data: { sessionData: storageState },
      });
    } else {
      await prisma.socialSession.create({
        data: { profileId, platform, sessionData: storageState },
      });
    }

    console.log(`✅ Session saved for ${platform} | Profile: ${profileId}`);
    await context.close();

  } catch (error) {
    console.error('❌ Error in linkSession:', error.message || error);
  }
};

// ─── Get linked sessions ──────────────────────────────────────────────────────
exports.getLinkedSessions = async (req, res) => {
  const { profileId } = req.params;
  try {
    const sessions = await prisma.socialSession.findMany({
      where: { profileId },
      select: { platform: true, updatedAt: true },
    });
    res.json(sessions);
  } catch (error) {
    console.error('getLinkedSessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};
