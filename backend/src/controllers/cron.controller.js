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

    res.status(200).json({ processedJobsCount: jobs.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
