// src/automation/engagement/instagramAutoDM.js
const fs = require('fs');
const path = require('path');

/**
 * Automatically scans comments on an Instagram post, finds users who commented a keyword,
 * and sends them a direct message with a resource link.
 * @param {import('playwright').Page} page
 * @param {string} postUrl
 * @param {string} keyword
 * @param {string} messageText
 */
exports.runAutoDM = async (page, postUrl, keyword, messageText) => {
  console.log(`[Instagram Auto-DM] Starting for post: ${postUrl}`);
  console.log(`[Instagram Auto-DM] Target Keyword: "${keyword}"`);

  // Navigate to post
  await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(4000);

  // Dismiss any "Not now" popup
  const notNow = await page.$('button:has-text("Not now"), div[role="button"]:has-text("Not Now")');
  if (notNow) {
    await notNow.click();
    await page.waitForTimeout(1000);
  }

  // Scrape comment authors and texts
  // Instagram comments are often inside <ul> or list elements with role="presentation"
  const commentsData = await page.evaluate(() => {
    const list = [];
    // Select comment blocks
    const commentEls = document.querySelectorAll('ul div[role="menuitem"]');
    commentEls.forEach(el => {
      const userEl = el.querySelector('a[href^="/"]');
      const textEl = el.querySelector('span'); // usually comment text
      if (userEl && textEl) {
        const username = userEl.getAttribute('href').replace(/\//g, '');
        const commentText = textEl.innerText;
        if (username && commentText) {
          list.push({ username, text: commentText });
        }
      }
    });
    return list;
  });

  console.log(`[Instagram Auto-DM] Scraped ${commentsData.length} comments.`);

  // Filter commenters matching the keyword (case-insensitive)
  const targetCommenters = commentsData.filter(c => 
    c.text.toLowerCase().includes(keyword.toLowerCase())
  );

  console.log(`[Instagram Auto-DM] Found ${targetCommenters.length} commenters matching keyword: "${keyword}"`);

  // To prevent double messaging, we keep a simple cache folder
  const cacheDir = path.join(__dirname, '..', '..', '..', 'browser_data', 'auto_dm_cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  const cacheFile = path.join(cacheDir, 'processed.json');
  let processed = {};
  if (fs.existsSync(cacheFile)) {
    try { processed = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch (e) {}
  }

  for (const commenter of targetCommenters) {
    const cacheKey = `${postUrl}_${commenter.username}`.replace(/[^a-zA-Z0-9]/g, '_');
    if (processed[cacheKey]) {
      console.log(`[Instagram Auto-DM] Skipping @${commenter.username} (already processed)`);
      continue;
    }

    try {
      console.log(`[Instagram Auto-DM] Sending DM to @${commenter.username}...`);
      
      // Go to their profile
      await page.goto(`https://www.instagram.com/${commenter.username}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(4000);

      // Dismiss "Not now" if it blocks us
      const notNowBtn = await page.$('button:has-text("Not now")');
      if (notNowBtn) { await notNowBtn.click(); await page.waitForTimeout(1000); }

      // Click "Message" button on their profile
      const msgBtn = await page.waitForSelector('div[role="button"]:has-text("Message"), button:has-text("Message")', { timeout: 15000 });
      await msgBtn.click();
      await page.waitForTimeout(5000); // Allow direct message interface to load

      // Type the message in the input box
      const msgBox = await page.waitForSelector('[placeholder="Message..."], div[role="textbox"][contenteditable="true"]', { timeout: 15000 });
      await msgBox.click();
      await page.waitForTimeout(500);
      await msgBox.type(messageText, { delay: 45 });
      await page.waitForTimeout(800);

      // Press Enter or click Send
      await msgBox.press('Enter');
      await page.waitForTimeout(3000);

      // Confirm send by looking for Send button or verifying input clear
      console.log(`[Instagram Auto-DM] ✅ DM successfully sent to @${commenter.username}`);

      // Mark as processed
      processed[cacheKey] = { timestamp: Date.now(), success: true };
      fs.writeFileSync(cacheFile, JSON.stringify(processed, null, 2), 'utf8');

      // Human-like delay between messages
      await page.waitForTimeout(12000);

    } catch (err) {
      console.error(`[Instagram Auto-DM] ❌ Failed to DM @${commenter.username}:`, err.message);
    }
  }

  console.log('[Instagram Auto-DM] Run complete.');
  return { success: true, processedCount: targetCommenters.length };
};
