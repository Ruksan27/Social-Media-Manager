// src/automation/engagement/tiktok.js
// TikTok engagement automation: comment, check follower, auto-follow

/**
 * Posts a comment on a TikTok video.
 * TikTok uses a contenteditable div — .fill() does NOT work, must use .type()
 * @param {import('playwright').Page} page
 * @param {string} postUrl
 * @param {string} commentText
 */
exports.commentOnPost = async (page, postUrl, commentText) => {
  console.log(`[TikTok Engagement] Navigating to: ${postUrl}`);

  await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  // Dismiss any login/cookie modal
  const closeBtn = await page.$('[data-e2e="close-login-or-signup-container"], button:has-text("Close")');
  if (closeBtn) { await closeBtn.click(); await page.waitForTimeout(1000); }

  // Click comment input — TikTok uses a contenteditable div
  const commentBox = await page.waitForSelector(
    '[data-testid="comment-input"] [contenteditable], .comment-input-content [contenteditable], [placeholder*="Add comment"]',
    { timeout: 20000 }
  );
  await commentBox.click();
  await page.waitForTimeout(600);

  // type() is required for contenteditable — fill() clears without triggering React state
  await commentBox.type(commentText, { delay: 35 });
  await page.waitForTimeout(500);

  // Submit with Enter key
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);

  console.log(`[TikTok Engagement] ✅ Comment posted successfully`);
  return { success: true };
};

/**
 * Checks if a target user follows you on TikTok.
 * @param {import('playwright').Page} page
 * @param {string} targetUsername
 * @returns {{ isFollowing: boolean }}
 */
exports.checkFollower = async (page, targetUsername) => {
  console.log(`[TikTok Engagement] Checking if @${targetUsername} follows you`);

  await page.goto(`https://www.tiktok.com/@${targetUsername}`, {
    waitUntil: 'domcontentloaded', timeout: 30000
  });
  await page.waitForTimeout(4000);

  // TikTok shows "Follows you" as a small tag under the username
  const followsYouEl = await page.$('[data-e2e="follow-status"]:has-text("Follows you"), span:has-text("Follows you")');
  const isFollowing = followsYouEl !== null;

  console.log(`[TikTok Engagement] @${targetUsername} follows you: ${isFollowing}`);
  return { isFollowing };
};

/**
 * Follows a user on TikTok if not already following.
 * @param {import('playwright').Page} page
 * @param {string} targetUsername
 * @returns {{ alreadyFollowing: boolean, followed: boolean }}
 */
exports.followUser = async (page, targetUsername) => {
  console.log(`[TikTok Engagement] Following @${targetUsername}`);

  await page.goto(`https://www.tiktok.com/@${targetUsername}`, {
    waitUntil: 'domcontentloaded', timeout: 30000
  });
  await page.waitForTimeout(4000);

  // Check if already following
  const followingBtn = await page.$(
    '[data-e2e="follow-button"]:has-text("Following"), [data-e2e="follow-button"]:has-text("Friends")'
  );
  if (followingBtn) {
    console.log(`[TikTok Engagement] Already following @${targetUsername}`);
    return { alreadyFollowing: true, followed: false };
  }

  // Click Follow button
  const followBtn = await page.waitForSelector(
    '[data-e2e="follow-button"]:has-text("Follow")',
    { timeout: 10000 }
  );
  await followBtn.click();
  await page.waitForTimeout(2500);

  // Verify
  const nowFollowing = await page.$('[data-e2e="follow-button"]:has-text("Following"), [data-e2e="follow-button"]:has-text("Friends")');
  const success = nowFollowing !== null;

  console.log(`[TikTok Engagement] Follow result for @${targetUsername}: ${success ? '✅ Success' : '❌ Failed'}`);
  return { alreadyFollowing: false, followed: success };
};
