// src/controllers/auth.controller.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

// Get all profiles (for simple login if needed)
exports.getProfiles = async (req, res) => {
  try {
    const profiles = await prisma.profile.findMany();
    res.json(profiles);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
};

// Register a new profile with password
exports.createProfile = async (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ error: 'Name and password are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const profile = await prisma.profile.create({
      data: { 
        name,
        password: hashedPassword 
      },
    });

    res.status(201).json({ id: profile.id, name: profile.name });
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ error: 'Failed to create profile' });
  }
};

// Login an existing profile
exports.loginProfile = async (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name || !password) {
      return res.status(400).json({ error: 'Name and password are required' });
    }

    const profile = await prisma.profile.findFirst({
      where: { name }
    });

    if (!profile) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, profile.password || '');
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ id: profile.id, name: profile.name });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};
