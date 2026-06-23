// src/controllers/engagement.controller.js
// Engagement automation: comment, check-follow, auto-follow on Instagram & TikTok

const { chromium } = require('playwright');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

const CHROME_PATH =
  process.env.CHROME_EXECUTABLE_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const STEALTH_SCRIPT = `
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  window.chrome = { runtime: {}, loadTimes: function(){}, csi: function(){}, app: {} };
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
`;

// Platform -> engagement module map
const ENGAGEMENT_MODULES = {
  INSTA_REELS: require('../automation/engagement/instagram'),
  TIKTOK:      require('../automation/engagement/tiktok'),
};

// ── Helper: launch browser with session cookies ───────────────────────────────
async function launchWithSession(profileId, platform) {
  const session = await prisma.socialSession.findFirst({ where: { profileId, platform } });
  if (!session?.sessionData) {
    throw new Error(`No linked session for ${platform}. Please connect this account first.`);
  }

  const userDataDir = path.join(__dirname, '..', '..', 'browser_data', profileId, platform);
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    executablePath: CHROME_PATH,
    storageState: session.sessionData,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--disable-extensions-except=',
      '--disable-gpu',
      '--no-sandbox',
      '--window-size=1280,900',
    ],
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    locale: 'en-US',
  });

  await context.addInitScript(STEALTH_SCRIPT);
  const page = context.pages()[0] || await context.newPage();
  return { context, page };
}

// ── POST /api/engagement/comment ─────────────────────────────────────────────
// Body: { platform, postUrl, commentText }
exports.comment = async (req, res) => {
  const { platform, postUrl, commentText } = req.body;
  const profileId = req.profile.id; // from authMiddleware

  if (!platform || !postUrl || !commentText?.trim()) {
    return res.status(400).json({ error: 'platform, postUrl, and commentText are required.' });
  }

  const engageMod = ENGAGEMENT_MODULES[platform];
  if (!engageMod) {
    return res.status(400).json({ error: `Engagement not supported for platform: ${platform}. Supported: INSTA_REELS, TIKTOK` });
  }

  res.status(202).json({ message: 'Comment automation started. Check backend logs for status.' });

  // Run in background — don't block the response
  (async () => {
    let context;
    try {
      console.log(`\n💬 [Engagement] Commenting on ${platform} post | Profile: ${profileId}`);
      const { context: ctx, page } = await launchWithSession(profileId, platform);
      context = ctx;
      await engageMod.commentOnPost(page, postUrl, commentText.trim());
      console.log(`✅ [Engagement] Comment posted successfully`);
    } catch (err) {
      console.error(`❌ [Engagement] Comment failed:`, err.message);
    } finally {
      if (context) await context.close().catch(() => {});
    }
  })();
};

// ── POST /api/engagement/check-follow ────────────────────────────────────────
// Body: { platform, targetUsername }
exports.checkFollow = async (req, res) => {
  const { platform, targetUsername } = req.body;
  const profileId = req.profile.id;

  if (!platform || !targetUsername?.trim()) {
    return res.status(400).json({ error: 'platform and targetUsername are required.' });
  }

  const engageMod = ENGAGEMENT_MODULES[platform];
  if (!engageMod) {
    return res.status(400).json({ error: `Engagement not supported for platform: ${platform}` });
  }

  let context;
  try {
    console.log(`\n🔍 [Engagement] Checking follow status for @${targetUsername} on ${platform}`);
    const { context: ctx, page } = await launchWithSession(profileId, platform);
    context = ctx;
    const result = await engageMod.checkFollower(page, targetUsername.trim().replace('@', ''));
    res.json({ targetUsername, platform, ...result });
  } catch (err) {
    console.error(`❌ [Engagement] Check-follow failed:`, err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (context) await context.close().catch(() => {});
  }
};

// ── POST /api/engagement/follow ──────────────────────────────────────────────
// Body: { platform, targetUsername }
exports.followUser = async (req, res) => {
  const { platform, targetUsername } = req.body;
  const profileId = req.profile.id;

  if (!platform || !targetUsername?.trim()) {
    return res.status(400).json({ error: 'platform and targetUsername are required.' });
  }

  const engageMod = ENGAGEMENT_MODULES[platform];
  if (!engageMod) {
    return res.status(400).json({ error: `Engagement not supported for platform: ${platform}` });
  }

  let context;
  try {
    console.log(`\n➕ [Engagement] Following @${targetUsername} on ${platform}`);
    const { context: ctx, page } = await launchWithSession(profileId, platform);
    context = ctx;
    const result = await engageMod.followUser(page, targetUsername.trim().replace('@', ''));
    res.json({ targetUsername, platform, ...result });
  } catch (err) {
    console.error(`❌ [Engagement] Follow failed:`, err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (context) await context.close().catch(() => {});
  }
};

// ── POST /api/engagement/auto-dm ─────────────────────────────────────────────
// Body: { platform, postUrl, keyword, messageText }
exports.autoDM = async (req, res) => {
  const { platform, postUrl, keyword, messageText } = req.body;
  const profileId = req.profile.id;

  if (!platform || !postUrl || !keyword?.trim() || !messageText?.trim()) {
    return res.status(400).json({ error: 'platform, postUrl, keyword, and messageText are required.' });
  }

  if (platform !== 'INSTA_REELS') {
    return res.status(400).json({ error: 'Auto-DM responder is currently only supported for INSTA_REELS (Instagram).' });
  }

  res.status(202).json({ message: 'Auto-DM responder automation started. Running in the background.' });

  // Execute in background
  (async () => {
    let context;
    try {
      const { context: ctx, page } = await launchWithSession(profileId, platform);
      context = ctx;
      const autoDMMod = require('../automation/engagement/instagramAutoDM');
      await autoDMMod.runAutoDM(page, postUrl.trim(), keyword.trim(), messageText.trim());
    } catch (err) {
      console.error('❌ [Engagement] Auto-DM process failed:', err.message);
    } finally {
      if (context) await context.close().catch(() => {});
    }
  })();
};
