// src/automation/platforms/linkedin.js
// LinkedIn video post via Playwright

/**
 * Uploads a video to LinkedIn
 * @param {import('playwright').Page} page
 * @param {object} job - Post job from DB
 * @param {string} tempVideoPath - Local path to the downloaded video file
 */
exports.upload = async (page, job, tempVideoPath) => {
  console.log(`[LinkedIn] Starting upload for job ${job.id}`);

  await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Click "Start a post" button
  const startPostBtn = await page.waitForSelector(
    'button[aria-label*="Create a post"], .share-box-feed-entry__trigger',
    { timeout: 15000 }
  );
  await startPostBtn.click();
  await page.waitForTimeout(2000);

  // Click the Video icon in the post modal toolbar
  const videoBtn = await page.waitForSelector(
    'button[aria-label*="Add a video"], li.share-creation-state__component-container button[aria-label*="Video"]',
    { timeout: 10000 }
  );
  await videoBtn.click();
  await page.waitForTimeout(1000);

  // Set file via input
  const fileInput = await page.waitForSelector('input[type="file"][accept*="video"]', { timeout: 10000 });
  await fileInput.setInputFiles(tempVideoPath);

  // Wait for video to upload
  await page.waitForSelector('.video-s-progress__percentage:has-text("100%"), .share-native-video__upload-success', {
    timeout: 120000
  });

  // Fill post text
  const text = [job.title, job.description].filter(Boolean).join('\n\n');
  if (text) {
    const textBox = await page.waitForSelector(
      '.ql-editor[contenteditable="true"], [data-placeholder*="What do you want to talk about"]',
      { timeout: 10000 }
    );
    await textBox.click();
    await textBox.type(text, { delay: 30 });
  }

  // Click "Post" button
  const postBtn = await page.waitForSelector(
    'button.share-actions__primary-action:has-text("Post"), button[aria-label*="Post"]:not(:disabled)',
    { timeout: 15000 }
  );
  await postBtn.click();

  // Wait for success
  await page.waitForSelector('.artdeco-toast-item--success, .share-box-success', { timeout: 30000 });

  console.log(`[LinkedIn] Upload complete for job ${job.id}`);
};
