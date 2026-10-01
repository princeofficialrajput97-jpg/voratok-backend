import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { query } from '../db/db.js';

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid Bearer token.'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const userRes = await query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    const user = userRes.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, error: 'User no longer exists.' });
    }

    if (user.is_banned) {
      return res.status(403).json({ success: false, error: 'Account has been banned.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Token is invalid or expired.' });
  }
}

export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const userRes = await query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    req.user = userRes.rows[0] || null;
  } catch (err) {
    req.user = null;
  }
  next();
}

export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

export const requireAdmin = requireRole(['admin', 'super_admin']);
export const requireModerator = requireRole(['moderator', 'admin', 'super_admin']);
