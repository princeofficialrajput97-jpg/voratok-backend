import express from 'express';
import { AuthService } from '../services/authService.js';
import { OTPService } from '../services/otpService.js';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db/db.js';

const router = express.Router();

// Check Username Availability
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const isValid = AuthService.validateUsername(username);
    if (!isValid) {
      return res.json({ available: false, valid: false, message: 'Invalid username format.' });
    }
    const available = await AuthService.isUsernameAvailable(username);
    res.json({ available, valid: true, message: available ? 'Username is available!' : 'Username is already taken.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { mobile_number, purpose } = req.body;
    const result = await OTPService.sendOTP(mobile_number, purpose || 'register');
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { mobile_number, otp_code, purpose } = req.body;
    const result = await OTPService.verifyOTP(mobile_number, otp_code, purpose || 'register');
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { full_name, username, mobile_number, password, dob } = req.body;
    const result = await AuthService.register({ full_name, username, mobile_number, password, dob });
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const username = req.body.username || req.body.identifier;
    const password = req.body.password;
    const result = await AuthService.login({ username, password });
    res.json({
      success: true,
      user: result.user,
      token: result.tokens?.accessToken,
      refreshToken: result.tokens?.refreshToken,
      tokens: result.tokens
    });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

// Refresh Token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    const result = await AuthService.refreshToken(refresh_token);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

// Forgot Password - Step 1: Verify User exists
const handleVerifyUser = async (req, res) => {
  try {
    const { identifier } = req.body; // mobile or username
    if (!identifier) {
      return res.status(400).json({ success: false, error: 'Username or mobile number is required.' });
    }
    const cleanId = identifier.trim();
    const cleanDigits = cleanId.replace(/\D/g, '').slice(-10);
    const withPrefix = `+91${cleanDigits}`;

    const userRes = await query(
      `SELECT id, username, mobile_number FROM users 
       WHERE LOWER(username) = LOWER($1) 
          OR mobile_number = $1 
          OR mobile_number = $2 
          OR mobile_number = $3 
          OR mobile_number LIKE $4`,
      [cleanId, withPrefix, cleanDigits, `%${cleanDigits}`]
    );
    const user = userRes.rows[0];

    if (!user) {
      return res.status(404).json({ success: false, error: 'No account found matching these details.' });
    }

    res.json({
      success: true,
      username: user.username,
      mobile_number: user.mobile_number,
      masked_mobile: user.mobile_number ? (user.mobile_number.slice(0, 3) + '*****' + user.mobile_number.slice(-3)) : ''
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

router.post('/forgot-password/verify', handleVerifyUser);
router.post('/forgot-password/verify-user', handleVerifyUser);

// Forgot Password - Step 2: Reset Password
router.post('/forgot-password/reset', async (req, res) => {
  try {
    const { mobile_number, new_password, otp_code } = req.body;
    await OTPService.verifyOTP(mobile_number, otp_code, 'forgot_password');
    await AuthService.resetPassword({ mobile_number, new_password });
    res.json({ success: true, message: 'Password has been successfully updated. You can now login.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get Current Logged In User
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userRes = await query(
      `SELECT u.*, p.followers_count, p.following_count, p.likes_count, p.videos_count,
              p.is_private, p.allow_comments, p.allow_downloads
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

    res.json({
      success: true,
      user: AuthService.sanitizeUser(user)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
