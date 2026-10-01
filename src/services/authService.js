// ─────────────────────────────────────────────────────────────────
// src/services/authService.js  —  PostgreSQL / Supabase backed
// ─────────────────────────────────────────────────────────────────
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { query, withTransaction } from '../db/db.js';

export class AuthService {

  // ── Token Generation ─────────────────────────────────────────────
  static async generateTokens(user) {
    const payload = { id: user.id, username: user.username, role: user.role };

    const accessToken = jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    const refreshToken = jwt.sign({ id: user.id }, config.jwtSecret, { expiresIn: config.refreshTokenExpiresIn });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await query(
      `INSERT INTO user_sessions (id, user_id, refresh_token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), user.id, refreshToken, expiresAt.toISOString()]
    );

    return { accessToken, refreshToken };
  }

  // ── Username Validation ──────────────────────────────────────────
  static validateUsername(username) {
    if (!username || typeof username !== 'string') return false;
    return /^[a-zA-Z0-9_.]{3,30}$/.test(username.trim());
  }

  // ── Check username availability ──────────────────────────────────
  static async isUsernameAvailable(username) {
    const res = await query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    return res.rows.length === 0;
  }

  // ── Register ─────────────────────────────────────────────────────
  static async register({ full_name, username, mobile_number, password, dob }) {
    if (!full_name || !username || !mobile_number || !password) {
      throw new Error('All required fields must be provided.');
    }

    if (!this.validateUsername(username)) {
      throw new Error('Username must be 3-30 characters: letters, numbers, underscores, and dots only.');
    }

    if (!(await this.isUsernameAvailable(username))) {
      throw new Error('This username is already taken. Please choose another.');
    }

    const mobileCheck = await query('SELECT id FROM users WHERE mobile_number = $1', [mobile_number.trim()]);
    if (mobileCheck.rows.length > 0) {
      throw new Error('An account with this mobile number already exists.');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const password_hash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO users
           (id, username, full_name, mobile_number, password_hash, dob, bio, profile_photo_url, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'user')`,
        [
          userId,
          username.toLowerCase().trim(),
          full_name.trim(),
          mobile_number.trim(),
          password_hash,
          dob || null,
          `Hey there! I am using VoraTok. 🚀`,
          `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`
        ]
      );

      await client.query(
        `INSERT INTO profiles (id, user_id) VALUES ($1, $2)`,
        [uuidv4(), userId]
      );
    });

    const userRes = await query(
      `SELECT u.*, p.* FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = $1`,
      [userId]
    );
    const user = userRes.rows[0];
    const tokens = await this.generateTokens(user);

    return { user: this.sanitizeUser(user), tokens };
  }

  // ── Login ────────────────────────────────────────────────────────
  static async login({ username, password }) {
    if (!username || !password) {
      throw new Error('Username and password are required.');
    }

    const res = await query(
      `SELECT u.*, p.followers_count, p.following_count, p.likes_count, p.videos_count,
              p.is_private, p.allow_comments, p.allow_downloads
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE LOWER(u.username) = LOWER($1) OR u.mobile_number = $1`,
      [username.trim()]
    );

    const user = res.rows[0];
    if (!user) throw new Error('Invalid username or password.');
    if (user.is_banned)     throw new Error('Your account has been permanently banned.');
    if (user.is_suspended)  throw new Error(`Your account is suspended. Reason: ${user.suspension_reason || 'Policy violation'}`);

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) throw new Error('Invalid username or password.');

    const tokens = await this.generateTokens(user);
    return { user: this.sanitizeUser(user), tokens };
  }

  // ── Refresh Token ────────────────────────────────────────────────
  static async refreshToken(refreshToken) {
    if (!refreshToken) throw new Error('Refresh token is required.');

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwtSecret);
    } catch {
      throw new Error('Invalid or expired refresh token.');
    }

    const sessionRes = await query(
      `SELECT * FROM user_sessions WHERE refresh_token = $1 AND is_revoked = FALSE`,
      [refreshToken]
    );
    if (sessionRes.rows.length === 0) throw new Error('Session has been invalidated or expired.');

    const userRes = await query(
      `SELECT u.*, p.followers_count, p.following_count, p.likes_count, p.videos_count
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = $1`,
      [decoded.id]
    );
    if (userRes.rows.length === 0) throw new Error('User not found.');

    // Invalidate old session
    await query(`UPDATE user_sessions SET is_revoked = TRUE WHERE refresh_token = $1`, [refreshToken]);

    const user = userRes.rows[0];
    const tokens = await this.generateTokens(user);
    return { user: this.sanitizeUser(user), tokens };
  }

  // ── Reset Password ───────────────────────────────────────────────
  static async resetPassword({ mobile_number, new_password }) {
    const cleanNumber = mobile_number.trim();
    const cleanDigits = cleanNumber.replace(/\D/g, '').slice(-10);
    const withPrefix = `+91${cleanDigits}`;

    const res = await query(
      `SELECT id FROM users WHERE mobile_number = $1 OR mobile_number = $2 OR mobile_number = $3 OR mobile_number LIKE $4`,
      [cleanNumber, withPrefix, cleanDigits, `%${cleanDigits}`]
    );
    if (res.rows.length === 0) throw new Error('Account not found.');

    if (new_password.length < 6) throw new Error('Password must be at least 6 characters long.');

    const password_hash = await bcrypt.hash(new_password, 10);
    const userId = res.rows[0].id;

    await query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [password_hash, userId]);
    await query(`UPDATE user_sessions SET is_revoked = TRUE WHERE user_id = $1`, [userId]);

    return true;
  }

  // ── Sanitize user for response (never expose password_hash) ──────
  static sanitizeUser(user) {
    const { password_hash, ...safe } = user;
    return safe;
  }
}
