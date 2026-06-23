// src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION_USE_STRONG_SECRET';

/**
 * Verifies the HttpOnly JWT cookie on every protected route.
 * Attaches req.profile = { id, name } for downstream controllers.
 */
const authMiddleware = (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No session found.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.profile = { id: decoded.id, name: decoded.name };
    next();
  } catch (err) {
    // Clear the invalid cookie
    res.clearCookie('token', { httpOnly: true, sameSite: 'None', secure: true });
    return res.status(401).json({ error: 'Unauthorized: Session expired or invalid.' });
  }
};

module.exports = { authMiddleware, JWT_SECRET };
