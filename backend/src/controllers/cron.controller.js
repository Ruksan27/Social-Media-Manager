// src/controllers/cron.controller.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { runAutomation } = require('../automation/engine');

exports.checkAndExecuteJobs = async (req, res) => {
  try {
    // Current time slots check
    const jobs = await prisma.post.findMany({
      where: {
        scheduledAt: { lte: new Date() },
        status: 'PENDING'
      },
      include: { profile: { include: { sessions: true } } }
    });

    if (jobs.length === 0) {
      return res.status(200).json({ message: "No pending jobs found." });
    }

    // Process jobs sequentially to save Render memory
    for (const job of jobs) {
      await prisma.post.update({ where: { id: job.id }, data: { status: 'PROCESSING' } });
      try {
        await runAutomation(job);
        await prisma.post.update({ where: { id: job.id }, data: { status: 'SUCCESS' } });
      } catch (err) {
        await prisma.post.update({
          where: { id: job.id },
          data: { status: 'FAILED', errorMessage: err.message }
        });
      }
    }

    // ── 24-Hour Cloudinary Video Cleanup ──
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oldJobs = await prisma.post.findMany({
      where: {
        scheduledAt: { lte: twentyFourHoursAgo },
        status: { in: ['SUCCESS', 'FAILED'] },
        cloudinaryUrl: { not: null, contains: 'cloudinary.com' } // only valid URLs
      }
    });

    let deletedVideosCount = 0;
    if (oldJobs.length > 0) {
      const cloudinary = require('cloudinary').v2;
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });

      for (const job of oldJobs) {
        try {
          // Extract public_id from Cloudinary URL
          // Example: https://res.cloudinary.com/.../upload/v123456/folder/filename.mp4 -> folder/filename
          const parts = job.cloudinaryUrl.split('/upload/');
          if (parts.length > 1) {
            const pathWithVersion = parts[1];
            const pathWithoutVersion = pathWithVersion.replace(/^v\d+\//, '');
            const publicId = pathWithoutVersion.replace(/\.[^/.]+$/, ""); // remove extension

            console.log(`🗑️ Auto-deleting old video from Cloudinary: ${publicId}`);
            await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
          }

          // Remove URL from database so we don't try to delete it again
          await prisma.post.update({
            where: { id: job.id },
            data: { cloudinaryUrl: null }
          });
          deletedVideosCount++;
        } catch (err) {
          console.error(`Failed to delete Cloudinary video for post ${job.id}:`, err.message);
        }
      }
    }

    res.status(200).json({ 
      processedJobsCount: jobs.length,
      deletedVideosCount: deletedVideosCount 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
