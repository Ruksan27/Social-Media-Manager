// src/automation/engine.js
// Main automation dispatcher — downloads video from Cloudinary and uploads to social platforms

const { chromium } = require('playwright');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ── Platform upload handlers ────────────────────────────────────────────────
const uploaders = {
  YOUTUBE_SHORTS: require('./platforms/youtube'),
  YOUTUBE_LONG:   require('./platforms/youtube'),
  TIKTOK:         require('./platforms/tiktok'),
  INSTA_REELS:    require('./platforms/instagram'),
  FB_REELS:       require('./platforms/facebook'),
  THREADS:        require('./platforms/threads'),
  LINKEDIN:       require('./platforms/linkedin'),
};

// ── Chrome executable path ──────────────────────────────────────────────────
const CHROME_PATH =
  process.env.CHROME_EXECUTABLE_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// ── Stealth init script (removes automation fingerprints) ───────────────────
const STEALTH_SCRIPT = `
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  window.chrome = { runtime: {}, loadTimes: function(){}, csi: function(){}, app: {} };
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
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  const originalQuery = window.navigator.permissions.query;
  window.navigator.permissions.query = (params) =>
    params.name === 'notifications'
      ? Promise.resolve({ state: Notification.permission })
      : originalQuery(params);
`;

// ── Download video from Cloudinary to a temp file ──────────────────────────
function downloadToTemp(url) {
  return new Promise((resolve, reject) => {
    const ext = url.split('?')[0].split('.').pop() || 'mp4';
    const tmpFile = path.join(os.tmpdir(), `nexus_${Date.now()}.${ext}`);
    const file = fs.createWriteStream(tmpFile);
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      // Follow redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(tmpFile);
        return resolve(downloadToTemp(response.headers.location));
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(tmpFile);
        return reject(new Error(`Failed to download video: HTTP ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`[Engine] Video downloaded to: ${tmpFile}`);
        resolve(tmpFile);
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      reject(err);
    });
  });
}

// ── Main runAutomation function ─────────────────────────────────────────────
exports.runAutomation = async (job) => {
  console.log(`\n🚀 [Engine] Starting job ${job.id} | Platform: ${job.platform}`);

  const uploader = uploaders[job.platform];
  if (!uploader) {
    throw new Error(`No uploader implemented for platform: ${job.platform}`);
  }

  // Find the session data (cookies) for this platform
  const session = job.profile?.sessions?.find(s => s.platform === job.platform);
  if (!session?.sessionData) {
    throw new Error(`No linked session found for platform: ${job.platform}. Please connect the account first.`);
  }

  // 1. Download the video from Cloudinary
  console.log(`[Engine] Downloading video from Cloudinary...`);
  const tempVideoPath = await downloadToTemp(job.cloudinaryUrl);

  let context;
  try {
    // 2. Launch browser with the saved session (cookies)
    console.log(`[Engine] Launching browser...`);
    context = await chromium.launchPersistentContext(
      path.join(__dirname, '..', '..', 'browser_data', job.profileId, job.platform),
      {
        headless: true, // headless for production (Render server)
        executablePath: CHROME_PATH,
        storageState: session.sessionData,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-extensions-except=',
          '--disable-default-apps',
          '--window-size=1280,900',
          '--disable-gpu',
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ],
        viewport: { width: 1280, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        locale: 'en-US',
        timezoneId: 'Asia/Kathmandu',
        ignoreHTTPSErrors: true,
      }
    );

    await context.addInitScript(STEALTH_SCRIPT);
    const page = context.pages()[0] || await context.newPage();

    // 3. Run the platform-specific uploader
    await uploader.upload(page, job, tempVideoPath);

    console.log(`✅ [Engine] Job ${job.id} completed successfully`);
  } finally {
    // 4. Always clean up: close browser + delete temp file
    if (context) await context.close().catch(() => {});
    if (fs.existsSync(tempVideoPath)) {
      fs.unlinkSync(tempVideoPath);
      console.log(`[Engine] Temp video deleted: ${tempVideoPath}`);
    }
  }
};
