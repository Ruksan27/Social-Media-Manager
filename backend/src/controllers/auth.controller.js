// src/controllers/auth.controller.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth.middleware');

const prisma = new PrismaClient();

// ─── Cookie options ───────────────────────────────────────────────────────────
// HttpOnly = JS cannot read this cookie → protects against XSS token theft
// SameSite=None + Secure = required for cross-site (Vercel frontend → Render backend)
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

// ─── Register ─────────────────────────────────────────────────────────────────
exports.createProfile = async (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'Name and password are required' });
    }

    // Check for duplicate name
    const existing = await prisma.profile.findFirst({ where: { name: name.trim() } });
    if (existing) {
      return res.status(409).json({ error: 'A profile with this name already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const profile = await prisma.profile.create({
      data: { name: name.trim(), password: hashedPassword },
    });

    const token = jwt.sign({ id: profile.id, name: profile.name }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, COOKIE_OPTIONS);
    res.status(201).json({ id: profile.id, name: profile.name });
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ error: 'Failed to create profile' });
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
exports.loginProfile = async (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'Name and password are required' });
    }

    const profile = await prisma.profile.findFirst({ where: { name: name.trim() } });
    if (!profile) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, profile.password || '');
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: profile.id, name: profile.name }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, COOKIE_OPTIONS);
    res.json({ id: profile.id, name: profile.name });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};

// ─── Me (restore session from cookie) ─────────────────────────────────────────
exports.getMe = async (req, res) => {
  // req.profile is populated by authMiddleware
  res.json({ id: req.profile.id, name: req.profile.name });
};

// ─── Logout ───────────────────────────────────────────────────────────────────
exports.logout = (req, res) => {
  res.clearCookie('token', { ...COOKIE_OPTIONS, maxAge: 0 });
  res.json({ message: 'Logged out successfully' });
};

// ─── List all profiles (for admin / dev use only) ─────────────────────────────
exports.getProfiles = async (req, res) => {
  try {
    const profiles = await prisma.profile.findMany({
      select: { id: true, name: true, createdAt: true },
    });
    res.json(profiles);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
};
