// src/controllers/session.controller.js
const { PrismaClient } = require('@prisma/client');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const prisma = new PrismaClient();

const PLATFORM_URLS = {
  YOUTUBE_SHORTS: 'https://studio.youtube.com',
  YOUTUBE_LONG: 'https://studio.youtube.com',
  TIKTOK: 'https://www.tiktok.com/login',
  INSTA_REELS: 'https://www.instagram.com',
  FB_REELS: 'https://business.facebook.com/creatorstudio',
  THREADS: 'https://www.threads.net/login',
  LINKEDIN: 'https://www.linkedin.com/login'
};

exports.linkSession = async (req, res) => {
  const { profileId, platform } = req.params;

  if (!PLATFORM_URLS[platform]) {
    return res.status(400).json({ error: 'Invalid platform' });
  }

  // We respond immediately, but the process continues in the background.
  // In a real production app, you might use WebSockets or a local desktop app approach for this.
  // Since this is a local tool, we will just launch the browser.
  res.status(200).json({ message: 'Browser opened. Please login in the opened window.' });

  try {
    console.log(`Opening browser to link ${platform} for profile ${profileId}`);
    
    // Launch visible browser
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(PLATFORM_URLS[platform]);

    // Give the user 2 minutes (120000ms) to log in manually
    console.log('Waiting up to 2 minutes for manual login...');
    await page.waitForTimeout(120000); // 2 minutes

    // Save the state
    const storageState = await context.storageState();
    
    // Upsert into DB
    const existingSession = await prisma.socialSession.findFirst({
      where: { profileId, platform }
    });

    if (existingSession) {
      await prisma.socialSession.update({
        where: { id: existingSession.id },
        data: { sessionData: storageState }
      });
    } else {
      await prisma.socialSession.create({
        data: {
          profileId,
          platform,
          sessionData: storageState
        }
      });
    }

    console.log(`Successfully saved session for ${platform}`);
    await browser.close();

  } catch (error) {
    console.error('Error linking session:', error);
  }
};

exports.getLinkedSessions = async (req, res) => {
  const { profileId } = req.params;
  try {
    const sessions = await prisma.socialSession.findMany({
      where: { profileId },
      select: { platform: true, updatedAt: true }
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};
