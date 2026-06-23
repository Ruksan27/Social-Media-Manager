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
  await page.goto('https://www.tiktok.com/upload', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // TikTok uses an iframe for the upload interface
  const uploadFrame = page.frameLocator('iframe[src*="tiktok"]').first();

  // Click the upload area / file input
  const fileInput = await page.waitForSelector('input[type="file"], input[accept*="video"]', { timeout: 15000 });
  await fileInput.setInputFiles(tempVideoPath);

  // Wait for upload to complete (caption box appears)
  await page.waitForTimeout(5000);

  // Fill caption / description
  const caption = [job.title, job.description].filter(Boolean).join(' ');
  if (caption) {
    const captionBox = await page.waitForSelector(
      '[data-testid="caption-editor"], .public-DraftEditor-content, .editor-container [contenteditable]',
      { timeout: 20000 }
    );
    await captionBox.click();
    await captionBox.fill('');
    await captionBox.type(caption, { delay: 30 });
  }

  // Wait for video processing
  await page.waitForSelector(
    '[data-testid="post_page_upload_success"], .upload-card-container .tick-icon',
    { timeout: 120000 }
  );

  // Click "Post" button
  const postBtn = await page.waitForSelector(
    'button[data-testid="post_video_button"], button:has-text("Post"):not(:disabled)',
    { timeout: 15000 }
  );
  await postBtn.click();

  // Wait for success
  await page.waitForURL('**/profile/**', { timeout: 30000 });

  console.log(`[TikTok] Upload complete for job ${job.id}`);
};
