// src/automation/engagement/tiktok.js
// TikTok engagement automation: comment, check follower, auto-follow

/**
 * Posts a comment on a TikTok video
 * @param {import('playwright').Page} page
 * @param {string} postUrl - Full URL of the TikTok video
 * @param {string} commentText - Text to post as a comment
 */
exports.commentOnPost = async (page, postUrl, commentText) => {
  console.log(`[TikTok Engagement] Commenting on post: ${postUrl}`);

  await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Click "Add comment" input
  const commentInput = await page.waitForSelector(
    '[data-testid="comment-input"], [placeholder*="Add comment"], .comment-input textarea',
    { timeout: 15000 }
  );
  await commentInput.click();
  await page.waitForTimeout(500);
  await commentInput.fill(commentText);
  await page.waitForTimeout(500);

  // Press Enter to submit
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);

  console.log(`[TikTok Engagement] Comment posted successfully`);
  return { success: true };
};

/**
 * Checks if a target user follows you back on TikTok
 * @param {import('playwright').Page} page
 * @param {string} targetUsername
 * @returns {{ isFollowing: boolean }}
 */
exports.checkFollower = async (page, targetUsername) => {
  console.log(`[TikTok Engagement] Checking if @${targetUsername} follows you`);

  await page.goto(`https://www.tiktok.com/@${targetUsername}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Look for "Follows you" indicator
  const followsYouEl = await page.$(
    '[data-testid="user-bio-follows-you"], span:has-text("Follows you"), .follow-status:has-text("Follows you")'
  );
  const isFollowing = followsYouEl !== null;

  console.log(`[TikTok Engagement] @${targetUsername} follows you: ${isFollowing}`);
  return { isFollowing };
};

/**
 * Follows a user on TikTok if not already following
 * @param {import('playwright').Page} page
 * @param {string} targetUsername
 * @returns {{ alreadyFollowing: boolean, followed: boolean }}
 */
exports.followUser = async (page, targetUsername) => {
  console.log(`[TikTok Engagement] Following @${targetUsername}`);

  await page.goto(`https://www.tiktok.com/@${targetUsername}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Check if already following
  const followingBtn = await page.$('[data-testid="follow-button"]:has-text("Following")');
  if (followingBtn) {
    console.log(`[TikTok Engagement] Already following @${targetUsername}`);
    return { alreadyFollowing: true, followed: false };
  }

  // Click follow button
  const followBtn = await page.waitForSelector(
    '[data-testid="follow-button"]:has-text("Follow"):not(:disabled), button[aria-label*="Follow"]:not([aria-label*="Following"])',
    { timeout: 10000 }
  );
  await followBtn.click();
  await page.waitForTimeout(2000);

  // Verify
  const nowFollowing = await page.$('[data-testid="follow-button"]:has-text("Following")');
  const success = nowFollowing !== null;

  console.log(`[TikTok Engagement] Follow result for @${targetUsername}: ${success ? 'Success' : 'Failed'}`);
  return { alreadyFollowing: false, followed: success };
};
