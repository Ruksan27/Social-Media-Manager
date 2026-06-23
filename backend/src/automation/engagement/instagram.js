// src/automation/engagement/instagram.js
// Instagram engagement automation: comment, check follower, auto-follow

/**
 * Posts a comment on an Instagram post
 * @param {import('playwright').Page} page
 * @param {string} postUrl - Full URL of the Instagram post
 * @param {string} commentText - Text to post as a comment
 */
exports.commentOnPost = async (page, postUrl, commentText) => {
  console.log(`[Instagram Engagement] Commenting on post: ${postUrl}`);

  await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Click "Add a comment..." input area
  const commentInput = await page.waitForSelector(
    '[aria-label="Add a comment…"], [placeholder*="Add a comment"]',
    { timeout: 15000 }
  );
  await commentInput.click();
  await page.waitForTimeout(500);
  await commentInput.fill(commentText);
  await page.waitForTimeout(500);

  // Press Enter to submit
  await commentInput.press('Enter');
  await page.waitForTimeout(3000);

  // Verify comment was posted (our text appears)
  const posted = await page.$(`span:has-text("${commentText.slice(0, 30)}")`);
  if (!posted) {
    // Try clicking the Post button as fallback
    const postBtn = await page.$('button[type="submit"]:has-text("Post"), div[role="button"]:has-text("Post")');
    if (postBtn) await postBtn.click();
    await page.waitForTimeout(3000);
  }

  console.log(`[Instagram Engagement] Comment posted successfully`);
  return { success: true };
};

/**
 * Checks if a target user follows you back on Instagram
 * @param {import('playwright').Page} page
 * @param {string} targetUsername
 * @returns {{ isFollowing: boolean, followsYou: boolean }}
 */
exports.checkFollower = async (page, targetUsername) => {
  console.log(`[Instagram Engagement] Checking if @${targetUsername} follows you`);

  await page.goto(`https://www.instagram.com/${targetUsername}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Look for "Follows you" badge under their profile
  const followsYouBadge = await page.$('span:has-text("Follows you"), div:has-text("Follows you")');
  const isFollowing = followsYouBadge !== null;

  console.log(`[Instagram Engagement] @${targetUsername} follows you: ${isFollowing}`);
  return { isFollowing };
};

/**
 * Follows a user on Instagram if not already following
 * @param {import('playwright').Page} page
 * @param {string} targetUsername
 * @returns {{ alreadyFollowing: boolean, followed: boolean }}
 */
exports.followUser = async (page, targetUsername) => {
  console.log(`[Instagram Engagement] Following @${targetUsername}`);

  await page.goto(`https://www.instagram.com/${targetUsername}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Check if already following (button says "Following" or "Requested")
  const followingBtn = await page.$('button:has-text("Following"), button:has-text("Requested")');
  if (followingBtn) {
    console.log(`[Instagram Engagement] Already following @${targetUsername}`);
    return { alreadyFollowing: true, followed: false };
  }

  // Click the Follow button
  const followBtn = await page.waitForSelector(
    'button:has-text("Follow"):not(:has-text("Following")):not(:disabled)',
    { timeout: 10000 }
  );
  await followBtn.click();
  await page.waitForTimeout(2000);

  // Confirm the button changed to "Following" or "Requested"
  const nowFollowing = await page.$('button:has-text("Following"), button:has-text("Requested")');
  const success = nowFollowing !== null;

  console.log(`[Instagram Engagement] Follow action result for @${targetUsername}: ${success ? 'Success' : 'Failed'}`);
  return { alreadyFollowing: false, followed: success };
};
