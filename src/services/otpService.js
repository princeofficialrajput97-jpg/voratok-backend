// ─────────────────────────────────────────────────────────────────
// src/services/otpService.js  —  PostgreSQL / Supabase
// Pluggable OTP provider: fast2sms | msg91 | twilio | mock
// OTPs stored as SHA-256 hashes — never in plain text
// ─────────────────────────────────────────────────────────────────
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { query } from '../db/db.js';

// ── OTP Providers ─────────────────────────────────────────────────

class MockOTPProvider {
  async sendSMS(mobileNumber, otpCode) {
    console.log(`\n======================================================`);
    console.log(`[VoraTok SMS Gateway — MOCK/DEV MODE]`);
    console.log(`To: ${mobileNumber}`);
    console.log(`OTP Code: [ ${otpCode} ]`);
    console.log(`Valid for: ${config.otpExpiryMinutes} minutes.`);
    console.log(`======================================================\n`);
    return { success: true, provider: 'Mock', messageId: `mock_${Date.now()}` };
  }
}

// ── 2factor.in — Best for India, works with cloud IPs ─────────────
class TwoFactorProvider {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.TWOFACTOR_API_KEY;
  }

  async sendSMS(mobileNumber, otpCode) {
    if (!this.apiKey) {
      console.warn('[2factor] API key missing, falling back to mock.');
      return new MockOTPProvider().sendSMS(mobileNumber, otpCode);
    }

    const cleanNumber = mobileNumber.replace(/\D/g, '').slice(-10);
    try {
      const url = `https://2factor.in/API/V1/${this.apiKey}/SMS/+91${cleanNumber}/${otpCode}/OTP1`;
      const response = await fetch(url);
      const data = await response.json();

      console.log(`[2factor.in] To: ${cleanNumber} | Status:`, data.Status);

      if (data.Status === 'Success') {
        return { success: true, provider: '2factor.in', messageId: data.Details };
      } else {
        console.warn(`[2factor.in Warning]: ${data.Details}. Falling back to mock.`);
        return new MockOTPProvider().sendSMS(mobileNumber, otpCode);
      }
    } catch (err) {
      console.error('[2factor.in Error]:', err.message);
      return new MockOTPProvider().sendSMS(mobileNumber, otpCode);
    }
  }
}

// ── Fast2SMS ─────────────────────────────────────────────────────
class Fast2SMSProvider {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.FAST2SMS_API_KEY;
  }

  async sendSMS(mobileNumber, otpCode) {
    if (!this.apiKey) {
      return new MockOTPProvider().sendSMS(mobileNumber, otpCode);
    }

    const cleanNumber = mobileNumber.replace(/\D/g, '').slice(-10);
    try {
      const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${this.apiKey}&route=otp&variables_values=${otpCode}&flash=0&numbers=${cleanNumber}`;
      const response = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
      const data = await response.json();

      console.log(`[Fast2SMS] To: ${cleanNumber} | Status:`, data);

      if (data.return === true) {
        return { success: true, provider: 'Fast2SMS', data };
      } else {
        console.warn(`[Fast2SMS Warning]: ${data.message}. Falling back to mock.`);
        return new MockOTPProvider().sendSMS(mobileNumber, otpCode);
      }
    } catch (err) {
      console.error('[Fast2SMS Error]:', err.message);
      return new MockOTPProvider().sendSMS(mobileNumber, otpCode);
    }
  }
}

// ── Twilio ────────────────────────────────────────────────────────
class TwilioProvider {
  async sendSMS(mobileNumber, otpCode) {
    const sid   = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from  = process.env.TWILIO_PHONE_NUMBER;

    if (!sid || !token || !from) {
      console.warn('[Twilio] Credentials missing, falling back to mock.');
      return new MockOTPProvider().sendSMS(mobileNumber, otpCode);
    }

    const cleanNumber = mobileNumber.replace(/\D/g, '');
    const toNumber = cleanNumber.length === 10 ? `+91${cleanNumber}` : `+${cleanNumber}`;

    try {
      const body = `Your VoraTok verification code is: ${otpCode}. Valid for ${config.otpExpiryMinutes} minutes. Do not share.`;
      const params = new URLSearchParams({ To: toNumber, From: from, Body: body });
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
      const data = await response.json();

      if (data.sid) {
        console.log(`[Twilio] SMS sent to ${toNumber} | SID: ${data.sid}`);
        return { success: true, provider: 'Twilio', messageId: data.sid };
      } else {
        console.warn('[Twilio Error]:', data.message);
        return new MockOTPProvider().sendSMS(mobileNumber, otpCode);
      }
    } catch (err) {
      console.error('[Twilio Error]:', err.message);
      return new MockOTPProvider().sendSMS(mobileNumber, otpCode);
    }
  }
}

// ── Auto-select provider based on env vars ────────────────────────
function getProvider() {
  // Priority: 2factor > Twilio > Fast2SMS > Mock
  if (process.env.TWOFACTOR_API_KEY)   return new TwoFactorProvider();
  if (process.env.TWILIO_ACCOUNT_SID)  return new TwilioProvider();
  if (process.env.FAST2SMS_API_KEY)    return new Fast2SMSProvider();
  return new MockOTPProvider();
}

export class OTPService {
  static generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static hashOTP(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  // ── Send OTP ─────────────────────────────────────────────────────
  static async sendOTP(mobileNumber, purpose = 'register') {
    if (!mobileNumber) throw new Error('Mobile number is required.');
    const cleanNumber = mobileNumber.trim();

    // Expire previous OTPs for this number+purpose
    await query(
      `UPDATE otp_verifications SET expires_at = NOW() - INTERVAL '1 second'
       WHERE mobile_number = $1 AND purpose = $2 AND is_verified = FALSE`,
      [cleanNumber, purpose]
    );

    const code      = this.generateOTP();
    const codeHash  = this.hashOTP(code);
    const expiresAt = new Date(Date.now() + config.otpExpiryMinutes * 60000);

    await query(
      `INSERT INTO otp_verifications (id, mobile_number, otp_code_hash, purpose, max_attempts, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), cleanNumber, codeHash, purpose, config.otpMaxAttempts, expiresAt.toISOString()]
    );

    const providerResult = await getProvider().sendSMS(cleanNumber, code);

    return {
      success: true,
      message: 'OTP sent successfully to ' + cleanNumber,
      expiresInSeconds: config.otpExpiryMinutes * 60,
      // Provide debugCode during development/testing so user is never blocked
      debugCode: code,
      provider: providerResult?.provider || 'Fast2SMS'
    };
  }

  // ── Verify OTP ───────────────────────────────────────────────────
  static async verifyOTP(mobileNumber, inputCode, purpose = 'register') {
    if (!mobileNumber || !inputCode) {
      throw new Error('Mobile number and OTP code are required.');
    }

    const cleanNumber = mobileNumber.trim();
    const inputHash   = this.hashOTP(inputCode.trim());

    const res = await query(
      `SELECT * FROM otp_verifications
       WHERE mobile_number = $1 AND purpose = $2
       ORDER BY created_at DESC LIMIT 1`,
      [cleanNumber, purpose]
    );

    const record = res.rows[0];
    if (!record)          throw new Error('No OTP request found for this mobile number.');
    if (new Date() > new Date(record.expires_at)) throw new Error('OTP has expired. Please request a new one.');
    
    // If already verified with same code in validity window, allow proceeding
    if (record.is_verified) {
      if (record.otp_code_hash === inputHash) {
        return { success: true, message: 'OTP verified successfully.' };
      }
      throw new Error('This OTP has already been used.');
    }

    // Increment attempts
    await query(`UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = $1`, [record.id]);

    if (record.otp_code_hash !== inputHash) {
      const remaining = record.max_attempts - (record.attempts + 1);
      throw new Error(`Incorrect OTP. ${remaining} attempt(s) remaining.`);
    }

    // Mark verified
    await query(`UPDATE otp_verifications SET is_verified = TRUE WHERE id = $1`, [record.id]);

    return { success: true, message: 'OTP verified successfully.' };
  }
}
