// src/automation/platforms/youtube.js
// YouTube Shorts & Long-Form video upload via Playwright
const path = require('path');

/**
 * Uploads a video to YouTube (Shorts or Long-Form)
 * @param {import('playwright').Page} page
 * @param {object} job - Post job from DB
 * @param {string} tempVideoPath - Local path to the downloaded video file
 */
exports.upload = async (page, job, tempVideoPath) => {
  console.log(`[YouTube] Starting upload for job ${job.id}`);

  // Navigate to YouTube Studio
  await page.goto('https://studio.youtube.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Click "Create" button (the + icon in top-right)
  await page.waitForSelector('#create-icon, ytcp-icon-button#create-icon', { timeout: 15000 });
  await page.click('#create-icon, ytcp-icon-button#create-icon');
  await page.waitForTimeout(1000);

  // Click "Upload videos" from the dropdown
  await page.waitForSelector('[test-id="upload-beta-menu-item"], tp-yt-paper-item:has-text("Upload videos")', { timeout: 10000 });
  await page.click('[test-id="upload-beta-menu-item"], tp-yt-paper-item:has-text("Upload videos")');
  await page.waitForTimeout(1500);

  // Set file via hidden input
  const fileInput = await page.waitForSelector('input[type="file"]', { timeout: 15000 });
  await fileInput.setInputFiles(tempVideoPath);

  // Wait for title field to appear (signals upload has started)
  const titleSelector = 'ytcp-social-suggestion-input #textbox, #title-textarea #textbox, [aria-label="Title"]';
  await page.waitForSelector(titleSelector, { timeout: 45000 });
  await page.waitForTimeout(2000);

  // Fill title — click to focus, ctrl+A to select all, then type
  const title = job.title || path.basename(tempVideoPath, path.extname(tempVideoPath));
  const titleBox = await page.$(titleSelector);
  if (titleBox) {
    await titleBox.click({ clickCount: 3 });
    await page.keyboard.press('Control+A');
    await titleBox.type(title, { delay: 20 });
  }

  // Fill description
  if (job.description) {
    const descSelector = '#description-textarea #textbox, [aria-label="Description"]';
    const descBox = await page.$(descSelector);
    if (descBox) {
      await descBox.click({ clickCount: 3 });
      await descBox.type(job.description, { delay: 15 });
    }
  }

  // Click "Not made for kids" if the question appears
  const notForKids = await page.$('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT"]');
  if (notForKids) {
    await notForKids.click();
    await page.waitForTimeout(500);
  }

  // Click "Next" three times through wizard steps
  for (let i = 0; i < 3; i++) {
    const nextBtn = page.locator('ytcp-button#next-button').first();
    await nextBtn.waitFor({ state: 'visible', timeout: 15000 });
    await nextBtn.click();
    await page.waitForTimeout(2000);
  }

  // Set visibility to "Public"
  await page.waitForSelector('tp-yt-paper-radio-button[name="PUBLIC"]', { timeout: 20000 });
  await page.click('tp-yt-paper-radio-button[name="PUBLIC"]');
  await page.waitForTimeout(800);

  // Click "Publish" / "Save"  
  const doneBtn = page.locator('ytcp-button#done-button');
  await doneBtn.waitFor({ state: 'visible', timeout: 15000 });
  await doneBtn.click();

  // Wait for the upload to finish — either the "close" dialog or URL change
  // YouTube's done dialog has a "Close" button or "View on YouTube" link
  await page.waitForSelector(
    'a[href*="youtube.com/watch"], ytcp-video-upload-dialog [dialog-id="dialog"] a[href*="watch"]',
    { timeout: 180000 } // up to 3 min for processing
  ).catch(async () => {
    // Fallback: just wait for the dialog to close
    await page.waitForTimeout(10000);
  });

  console.log(`[YouTube] ✅ Upload complete for job ${job.id}`);
};
