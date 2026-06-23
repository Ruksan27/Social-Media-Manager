// src/controllers/post.controller.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /api/posts — Create a new scheduled post
exports.createPost = async (req, res) => {
  try {
    const { profileId, cloudinaryUrl, platformsData } = req.body;
    // platformsData should be an array of objects: 
    // [{ platform: 'TIKTOK', title: '...', description: '...', scheduledAt: '...' }]

    if (!profileId || !cloudinaryUrl || !platformsData?.length) {
      return res.status(400).json({ error: 'profileId, cloudinaryUrl, and platformsData are required.' });
    }

    // Create one post record per platform with its specific details
    const created = await Promise.all(
      platformsData.map((data) =>
        prisma.post.create({
          data: {
            profileId,
            cloudinaryUrl,
            platform: data.platform,
            title: data.title || null,
            description: data.description || null,
            scheduledAt: new Date(data.scheduledAt),
            status: 'PENDING',
          },
        })
      )
    );

    res.status(201).json(created);
  } catch (error) {
    console.error('createPost error:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/posts/:profileId — List all posts for a profile
exports.getPosts = async (req, res) => {
  try {
    const { profileId } = req.params;
    const posts = await prisma.post.findMany({
      where: { profileId },
      orderBy: { scheduledAt: 'asc' },
    });
    res.json(posts);
  } catch (error) {
    console.error('getPosts error:', error);
    res.status(500).json({ error: error.message });
  }
};

// PATCH /api/posts/:id — Edit a post (title, description, scheduledAt)
exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, scheduledAt } = req.body;

    const updated = await prisma.post.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(scheduledAt && { scheduledAt: new Date(scheduledAt), status: 'PENDING' }),
      },
    });
    res.json(updated);
  } catch (error) {
    console.error('updatePost error:', error);
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/posts/:id — Delete a post
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.post.delete({ where: { id } });
    res.json({ message: 'Post deleted successfully.' });
  } catch (error) {
    console.error('deletePost error:', error);
    res.status(500).json({ error: error.message });
  }
};
