// src/automation/engagement/instagram.js
// Instagram engagement automation: comment, check follower, auto-follow

/**
 * Posts a comment on an Instagram post.
 * Instagram uses a contenteditable div — .fill() does NOT work on these.
 * We must click to focus, then use keyboard to type character by character.
 * @param {import('playwright').Page} page
 * @param {string} postUrl
 * @param {string} commentText
 */
exports.commentOnPost = async (page, postUrl, commentText) => {
  console.log(`[Instagram Engagement] Navigating to: ${postUrl}`);

  await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Dismiss any login pop-up that might appear
  const notNow = await page.$('button:has-text("Not now"), div[role="button"]:has-text("Not Now")');
  if (notNow) { await notNow.click(); await page.waitForTimeout(1000); }

  // Click the comment area — Instagram's comment box is a contenteditable div
  const commentArea = await page.waitForSelector(
    '[aria-label="Add a comment…"], [placeholder*="Add a comment"], form [contenteditable="true"]',
    { timeout: 15000 }
  );
  await commentArea.click();
  await page.waitForTimeout(600);

  // Use type() — the ONLY reliable way for contenteditable elements
  await commentArea.type(commentText, { delay: 40 });
  await page.waitForTimeout(500);

  // Submit: Instagram allows Enter key OR clicking the "Post" button
  await commentArea.press('Enter');
  await page.waitForTimeout(3000);

  // Fallback: if Post button is still visible, click it
  const postBtn = await page.$('button:has-text("Post"), div[role="button"]:has-text("Post")');
  if (postBtn) {
    await postBtn.click();
    await page.waitForTimeout(2500);
  }

  console.log(`[Instagram Engagement] ✅ Comment posted successfully`);
  return { success: true };
};

/**
 * Checks if a target user follows you back on Instagram.
 * @param {import('playwright').Page} page
 * @param {string} targetUsername
 * @returns {{ isFollowing: boolean }}
 */
exports.checkFollower = async (page, targetUsername) => {
  console.log(`[Instagram Engagement] Checking if @${targetUsername} follows you`);

  await page.goto(`https://www.instagram.com/${targetUsername}/`, {
    waitUntil: 'domcontentloaded', timeout: 30000
  });
  await page.waitForTimeout(3500);

  // Dismiss login pop-up
  const notNow = await page.$('button:has-text("Not now")');
  if (notNow) { await notNow.click(); await page.waitForTimeout(800); }

  // Instagram shows "Follows you" badge right under the username
  const followsYouBadge = await page.$('span:has-text("Follows you")');
  const isFollowing = followsYouBadge !== null;

  console.log(`[Instagram Engagement] @${targetUsername} follows you: ${isFollowing}`);
  return { isFollowing };
};

/**
 * Follows a user on Instagram if not already following.
 * @param {import('playwright').Page} page
 * @param {string} targetUsername
 * @returns {{ alreadyFollowing: boolean, followed: boolean }}
 */
exports.followUser = async (page, targetUsername) => {
  console.log(`[Instagram Engagement] Following @${targetUsername}`);

  await page.goto(`https://www.instagram.com/${targetUsername}/`, {
    waitUntil: 'domcontentloaded', timeout: 30000
  });
  await page.waitForTimeout(3500);

  // Dismiss login pop-up
  const notNow = await page.$('button:has-text("Not now")');
  if (notNow) { await notNow.click(); await page.waitForTimeout(800); }

  // Check if already following
  const followingBtn = await page.$('button:has-text("Following"), button:has-text("Requested")');
  if (followingBtn) {
    console.log(`[Instagram Engagement] Already following @${targetUsername}`);
    return { alreadyFollowing: true, followed: false };
  }

  // Find and click the Follow button
  // Instagram's Follow button text is exactly "Follow" (not "Following")
  const followBtn = await page.$('button:has-text("Follow"):not(:has-text("Following"))');
  if (!followBtn) {
    throw new Error(`Could not find Follow button for @${targetUsername}. Make sure you are logged in.`);
  }
  await followBtn.click();
  await page.waitForTimeout(2500);

  // Confirm success
  const nowFollowing = await page.$('button:has-text("Following"), button:has-text("Requested")');
  const success = nowFollowing !== null;

  console.log(`[Instagram Engagement] Follow result for @${targetUsername}: ${success ? '✅ Success' : '❌ Failed'}`);
  return { alreadyFollowing: false, followed: success };
};
