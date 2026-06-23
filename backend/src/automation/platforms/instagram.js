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
  await page.waitForTimeout(3000);

  // Click "Create" / "+" button
  await page.waitForSelector('svg[aria-label="New post"], a[href="#"]:has(svg[aria-label*="Create"])', { timeout: 15000 });
  await page.click('svg[aria-label="New post"], a[href="#"]:has(svg[aria-label*="Create"])');
  await page.waitForTimeout(1000);

  // Select from the modal that appears
  const postOption = await page.$('button:has-text("Post"), span:has-text("Post")');
  if (postOption) await postOption.click();
  await page.waitForTimeout(1000);

  // Instagram's file dialog trigger
  const fileInput = await page.waitForSelector('input[type="file"]', { timeout: 15000 });
  await fileInput.setInputFiles(tempVideoPath);
  await page.waitForTimeout(3000);

  // Select "Reels" tab if it appears
  const reelsTab = await page.$('button:has-text("Reels"), [role="tab"]:has-text("Reels")');
  if (reelsTab) await reelsTab.click();
  await page.waitForTimeout(1000);

  // Click "Next" (crop/trim step)
  const nextBtn1 = await page.waitForSelector('button:has-text("Next"):not(:disabled)', { timeout: 15000 });
  await nextBtn1.click();
  await page.waitForTimeout(2000);

  // Click "Next" again (filter step if present)
  const nextBtn2 = await page.$('button:has-text("Next"):not(:disabled)');
  if (nextBtn2) {
    await nextBtn2.click();
    await page.waitForTimeout(2000);
  }

  // Fill caption
  const caption = [job.title, job.description].filter(Boolean).join('\n\n');
  if (caption) {
    const captionBox = await page.waitForSelector('[aria-label="Write a caption..."], [placeholder*="caption"]', { timeout: 10000 });
    await captionBox.click();
    await captionBox.fill(caption);
  }

  // Share the post
  const shareBtn = await page.waitForSelector('button:has-text("Share"):not(:disabled)', { timeout: 15000 });
  await shareBtn.click();

  // Wait for "Your reel has been shared" or similar success indicator
  await page.waitForSelector(
    'span:has-text("Your reel has been shared"), div[role="dialog"] span:has-text("shared")',
    { timeout: 60000 }
  );

  console.log(`[Instagram] Upload complete for job ${job.id}`);
};
