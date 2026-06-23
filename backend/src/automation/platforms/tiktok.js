// src/automation/platforms/tiktok.js
// TikTok video upload via Playwright

/**
 * Uploads a video to TikTok
 * @param {import('playwright').Page} page
 * @param {object} job - Post job from DB
 * @param {string} tempVideoPath - Local path to the downloaded video file
 */
exports.upload = async (page, job, tempVideoPath) => {
  console.log(`[TikTok] Starting upload for job ${job.id}`);

  // Navigate to TikTok upload page
  await page.goto('https://www.tiktok.com/creator-center/upload', {
    waitUntil: 'domcontentloaded', timeout: 30000
  });
  await page.waitForTimeout(5000);

  // TikTok Creator Center wraps the uploader in an iframe
  // We must locate the iframe first, then query all elements INSIDE it
  const frame = page.frameLocator('iframe[src*="tiktok.com"]').first();

  // Set the video file via the hidden input inside the iframe
  const fileInput = frame.locator('input[type="file"]');
  await fileInput.setInputFiles(tempVideoPath);

  // Wait for the upload to process (progress bar or success indicator)
  await frame.locator('.upload-progress-bar, .info-progress-bar', { timeout: 60000 }).waitFor();
  // Wait until upload is 100% (progress bar disappears or caption box appears)
  await frame.locator('.caption-wrapper, [class*="caption-editor"]', { timeout: 120000 }).waitFor();
  await page.waitForTimeout(2000);

  // Fill caption — TikTok uses contenteditable, use type()
  const caption = [job.title, job.description].filter(Boolean).join(' ');
  if (caption) {
    const captionBox = frame.locator('[class*="caption-editor"] [contenteditable], .public-DraftEditor-content');
    await captionBox.first().click();
    await captionBox.first().type(caption, { delay: 30 });
    await page.waitForTimeout(500);
  }

  // Click "Post" button
  const postBtn = frame.locator('button:has-text("Post"):not(:disabled)');
  await postBtn.first().waitFor({ timeout: 15000 });
  await postBtn.first().click();

  // Wait for success (redirects to profile or shows success message)
  await page.waitForURL('**/profile/**', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);

  console.log(`[TikTok] ✅ Upload complete for job ${job.id}`);
};
