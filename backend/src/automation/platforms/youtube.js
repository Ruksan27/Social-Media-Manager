// src/automation/platforms/youtube.js
// YouTube Shorts & Long-Form video upload via Playwright
const path = require('path');
const fs = require('fs');

/**
 * Uploads a video to YouTube (Shorts or Long-Form)
 * @param {import('playwright').Page} page
 * @param {object} job - Post job from DB
 * @param {string} tempVideoPath - Local path to the downloaded video file
 */
exports.upload = async (page, job, tempVideoPath) => {
  console.log(`[YouTube] Starting upload for job ${job.id}`);

  // Navigate to YouTube Studio upload
  await page.goto('https://studio.youtube.com', { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Click "Create" button
  await page.waitForSelector('#create-icon, ytcp-button#create-icon', { timeout: 15000 });
  await page.click('#create-icon, ytcp-button#create-icon');

  // Click "Upload videos"
  await page.waitForSelector('tp-yt-paper-item:has-text("Upload videos"), ytcp-paper-item:has-text("Upload")', { timeout: 10000 });
  await page.click('tp-yt-paper-item:has-text("Upload videos"), ytcp-paper-item:has-text("Upload")');

  // Wait for file input and upload the video
  const fileInput = await page.waitForSelector('input[type="file"]', { timeout: 15000 });
  await fileInput.setInputFiles(tempVideoPath);

  // Wait for upload to start processing (title field appears)
  await page.waitForSelector('ytcp-social-suggestion-input #textbox, #title-textarea #textbox', { timeout: 30000 });

  // Fill title
  const title = job.title || path.basename(tempVideoPath, path.extname(tempVideoPath));
  const titleBox = await page.$('ytcp-social-suggestion-input #textbox, #title-textarea #textbox');
  if (titleBox) {
    await titleBox.click({ clickCount: 3 }); // Select all
    await titleBox.fill(title);
  }

  // Fill description
  if (job.description) {
    const descBox = await page.$('#description-textarea #textbox');
    if (descBox) {
      await descBox.click({ clickCount: 3 });
      await descBox.fill(job.description);
    }
  }

  // Click "Next" through the wizard (3 times)
  for (let i = 0; i < 3; i++) {
    const nextBtn = await page.waitForSelector('ytcp-button#next-button:not([disabled])', { timeout: 15000 });
    await nextBtn.click();
    await page.waitForTimeout(1500);
  }

  // Set visibility to "Public" on the last step
  await page.waitForSelector('tp-yt-paper-radio-button[name="PUBLIC"]', { timeout: 15000 });
  await page.click('tp-yt-paper-radio-button[name="PUBLIC"]');
  await page.waitForTimeout(500);

  // Click "Publish" / "Save"
  const publishBtn = await page.waitForSelector('ytcp-button#done-button:not([disabled])', { timeout: 15000 });
  await publishBtn.click();

  // Wait for success dialog
  await page.waitForSelector('ytcp-video-upload-dialog .ytcp-video-upload-dialog, ytcp-uploads-still-processing-dialog', {
    timeout: 120000, // Videos can take a while to process
  });

  console.log(`[YouTube] Upload complete for job ${job.id}`);
};
