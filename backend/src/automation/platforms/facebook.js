// src/automation/platforms/facebook.js
// Facebook Reels video upload via Playwright

/**
 * Uploads a video to Facebook Reels
 * @param {import('playwright').Page} page
 * @param {object} job - Post job from DB
 * @param {string} tempVideoPath - Local path to the downloaded video file
 */
exports.upload = async (page, job, tempVideoPath) => {
  console.log(`[Facebook] Starting upload for job ${job.id}`);

  // Navigate to Facebook Reels creation page
  await page.goto('https://www.facebook.com/reels/create/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Click "Upload video" button
  const uploadBtn = await page.waitForSelector(
    'div[role="button"]:has-text("Upload video"), button:has-text("Upload"):not(:disabled)',
    { timeout: 15000 }
  );
  await uploadBtn.click();

  // Set file via input
  const fileInput = await page.waitForSelector('input[type="file"]', { timeout: 10000 });
  await fileInput.setInputFiles(tempVideoPath);

  // Wait for video to process
  await page.waitForTimeout(8000);

  // Fill caption/description
  const caption = [job.title, job.description].filter(Boolean).join('\n\n');
  if (caption) {
    const captionBox = await page.waitForSelector(
      '[aria-label*="description"], [data-lexical-editor="true"], [contenteditable="true"]',
      { timeout: 15000 }
    );
    await captionBox.click();
    await captionBox.type(caption, { delay: 30 });
  }

  // Click "Next" or continue through wizard
  const nextBtn = await page.$('div[role="button"]:has-text("Next"):not(.disabled)');
  if (nextBtn) {
    await nextBtn.click();
    await page.waitForTimeout(2000);
  }

  // Publish
  const publishBtn = await page.waitForSelector(
    'div[role="button"]:has-text("Publish"):not(.disabled), button:has-text("Share"):not(:disabled)',
    { timeout: 15000 }
  );
  await publishBtn.click();

  // Wait for success indicator
  await page.waitForTimeout(5000);
  console.log(`[Facebook] Upload complete for job ${job.id}`);
};
