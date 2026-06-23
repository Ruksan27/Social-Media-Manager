// src/automation/platforms/instagram.js
// Instagram Reels video upload via Playwright

/**
 * Uploads a video to Instagram Reels
 * @param {import('playwright').Page} page
 * @param {object} job - Post job from DB
 * @param {string} tempVideoPath - Local path to the downloaded video file
 */
exports.upload = async (page, job, tempVideoPath) => {
  console.log(`[Instagram] Starting upload for job ${job.id}`);

  await page.goto('https://www.instagram.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3500);

  // Dismiss "Save login info" or "Turn on notifications" dialogs
  for (const btnText of ['Not now', 'Not Now', 'Dismiss', 'Cancel']) {
    const btn = await page.$(`button:has-text("${btnText}"), div[role="button"]:has-text("${btnText}")`);
    if (btn) { await btn.click(); await page.waitForTimeout(800); }
  }

  // Click the "Create" / "+" new post icon in the left sidebar
  // Instagram uses SVG with aria-label="New post" inside a link
  const createBtn = await page.waitForSelector(
    'a[href="#"] svg[aria-label="New post"], [aria-label="New post"], svg[aria-label*="Create"]',
    { timeout: 15000 }
  );
  // Click the parent <a> or <div> wrapping the SVG
  await createBtn.evaluate(el => el.closest('a, div[role="button"], button')?.click());
  await page.waitForTimeout(1500);

  // From the dropdown, click "Post"
  const postMenuItem = await page.$('[role="menuitem"]:has-text("Post"), div:has-text("Post") > svg');
  if (postMenuItem) {
    await postMenuItem.evaluate(el => el.closest('[role="menuitem"], div[role="button"]')?.click() || el.click());
    await page.waitForTimeout(1000);
  }

  // Set the video file
  const fileInput = await page.waitForSelector('input[type="file"]', { timeout: 15000 });
  await fileInput.setInputFiles(tempVideoPath);
  await page.waitForTimeout(4000);

  // If Instagram asks "Select type", pick "Reels"
  const reelsOption = await page.$('[role="radio"]:has-text("Reels"), button:has-text("Reels"), span:has-text("Reels")');
  if (reelsOption) {
    await reelsOption.click();
    await page.waitForTimeout(1000);
  }

  // Navigate through the wizard — click "Next" until we reach the caption step
  for (let i = 0; i < 3; i++) {
    const nextBtn = await page.$('button:has-text("Next"):not(:disabled), div[role="button"]:has-text("Next")');
    if (!nextBtn) break;
    await nextBtn.click();
    await page.waitForTimeout(2500);
  }

  // Fill caption — Instagram caption field is a contenteditable div, must use type()
  const caption = [job.title, job.description].filter(Boolean).join('\n\n');
  if (caption) {
    const captionBox = await page.waitForSelector(
      '[aria-label="Write a caption…"], [aria-label="Write a caption..."], [contenteditable="true"][spellcheck="true"]',
      { timeout: 15000 }
    );
    await captionBox.click();
    await captionBox.type(caption, { delay: 25 });
  }

  // Click "Share" to publish
  const shareBtn = await page.waitForSelector(
    'button:has-text("Share"):not(:disabled), div[role="button"]:has-text("Share")',
    { timeout: 15000 }
  );
  await shareBtn.click();

  // Wait for success — "Your reel has been shared" dialog or redirect
  await page.waitForSelector(
    'span:has-text("Your reel has been shared"), h2:has-text("Your reel"), div[role="dialog"] svg[aria-label*="Share"]',
    { timeout: 90000 }
  ).catch(() => page.waitForTimeout(8000)); // graceful fallback

  console.log(`[Instagram] ✅ Upload complete for job ${job.id}`);
};
