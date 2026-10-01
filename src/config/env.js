import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'voratok_super_secure_jwt_secret_key_2026_pulse',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  otpProvider: process.env.OTP_PROVIDER || 'mock',
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10),
  otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
  storageProvider: process.env.STORAGE_PROVIDER || 'local',
  uploadMaxSizeMB: parseInt(process.env.UPLOAD_MAX_SIZE_MB || '100', 10),
  maxVideoDurationSeconds: parseInt(process.env.MAX_VIDEO_DURATION_SECONDS || '60', 10),
  cdnBaseUrl: process.env.CDN_BASE_URL || `http://localhost:${process.env.PORT || '5000'}`,
  databaseUrl: process.env.DATABASE_URL || ''
};
