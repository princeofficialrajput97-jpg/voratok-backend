import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { config } from './config/env.js';
import { testConnection, query } from './db/db.js';
import { StorageService } from './services/storageService.js';
import { initFirebase } from './services/pushNotificationService.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import feedRoutes from './routes/feedRoutes.js';
import videoRoutes from './routes/videoRoutes.js';
import interactionRoutes from './routes/interactionRoutes.js';
import userRoutes from './routes/userRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import moderationRoutes from './routes/moderationRoutes.js';
import adsRoutes from './routes/adsRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Ensure public directories exist
const publicDir = path.resolve(__dirname, '../public');
const uploadsDir = path.resolve(__dirname, '../public/uploads/videos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Global Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static asset delivery (simulating CDN for uploaded media)
app.use('/uploads', express.static(path.resolve(__dirname, '../public/uploads')));
app.use(express.static(publicDir));

// System Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    app: 'VoraTok API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: 'Supabase PostgreSQL (connected)',
    environment: config.nodeEnv
  });
});

// Maintenance Mode Middleware (checks Supabase app_settings)
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api/admin') || req.path === '/api/health' || req.path === '/api/settings/public') {
    return next();
  }
  try {
    const res2 = await query(`SELECT setting_value FROM app_settings WHERE setting_key = 'maintenance_mode'`);
    const setting = res2.rows[0]?.setting_value;
    if (setting?.enabled) {
      return res.status(503).json({
        success: false,
        maintenance: true,
        message: setting.message || 'Service undergoing scheduled maintenance.'
      });
    }
  } catch (_) { /* DB not ready — skip maintenance check */ }
  next();
});

// API Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.url}`
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[VoraTok Error Handler]', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Global error handlers — prevent silent crashes
process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err.message);
});

// Start Server — bind to port FIRST, then run async checks
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`⚡ VoraTok Short Video API Server is running!`);
  console.log(`📡 PORT: ${config.port}`);
  console.log(`🛡️  Mode: ${config.nodeEnv}`);
  console.log(`📱 OTP Provider: ${config.otpProvider}`);
  console.log(`======================================================\n`);
});

// Run async init AFTER listen (non-blocking)
server.on('listening', async () => {
  try { await testConnection(); } catch (e) { console.warn('⚠️  DB check failed:', e.message); }
  try { await StorageService.testConnection(); } catch (e) { console.warn('⚠️  Cloudinary check failed:', e.message); }
  try { await initFirebase(); } catch (e) { console.warn('⚠️  Firebase check failed:', e.message); }
});

export default app;
