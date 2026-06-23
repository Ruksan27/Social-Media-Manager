// src/automation/platforms/threads.js
// Threads video post via Playwright

/**
 * Uploads a video to Threads
 * @param {import('playwright').Page} page
 * @param {object} job - Post job from DB
 * @param {string} tempVideoPath - Local path to the downloaded video file
 */
exports.upload = async (page, job, tempVideoPath) => {
  console.log(`[Threads] Starting upload for job ${job.id}`);

  await page.goto('https://www.threads.net', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Click "New thread" compose button
  const composeBtn = await page.waitForSelector(
    'a[href="/post"]:has(svg), div[role="button"][aria-label*="New thread"]',
    { timeout: 15000 }
  );
  await composeBtn.click();
  await page.waitForTimeout(2000);

  // Click the media attachment icon (image/video)
  const mediaBtn = await page.waitForSelector(
    'svg[aria-label*="Attach media"], button[aria-label*="media"], [data-testid="attachment-button"]',
    { timeout: 10000 }
  );
  await mediaBtn.click();

  // Set file via input
  const fileInput = await page.waitForSelector('input[type="file"]', { timeout: 10000 });
  await fileInput.setInputFiles(tempVideoPath);
  await page.waitForTimeout(4000);

  // Fill post text
  const text = [job.title, job.description].filter(Boolean).join('\n\n');
  if (text) {
    const textBox = await page.waitForSelector(
      '[contenteditable="true"][aria-label*="thread"], [data-testid="tiptap-editor"]',
      { timeout: 10000 }
    );
    await textBox.click();
    await textBox.type(text, { delay: 30 });
  }

  // Post
  const postBtn = await page.waitForSelector(
    'div[role="button"]:has-text("Post"):not([aria-disabled="true"]), button:has-text("Post"):not(:disabled)',
    { timeout: 15000 }
  );
  await postBtn.click();

  // Wait for post to go through
  await page.waitForTimeout(5000);
  console.log(`[Threads] Upload complete for job ${job.id}`);
};
