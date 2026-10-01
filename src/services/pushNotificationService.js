/**
 * pushNotificationService.js — Firebase FCM Push Notifications
 * VoraTok | Sends real-time notifications via Firebase Admin SDK
 */

import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../db/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let firebaseApp = null;
let fcmEnabled = false;

// ─── Initialize Firebase Admin ──────────────────────────────────────────────
export async function initFirebase() {
  try {
    let serviceAccount = null;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      } catch (_) {}
    }

    if (!serviceAccount) {
      const serviceAccountPath = path.resolve(
        __dirname,
        '../../firebase-service-account.json'
      );
      const require = createRequire(import.meta.url);
      serviceAccount = require(serviceAccountPath);
    }

    const apps = getApps();
    if (!apps.length) {
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id || 'voratok-5bc9e',
      });
    } else {
      firebaseApp = getApp();
    }

    fcmEnabled = true;
    console.log(`✅ Firebase FCM connected → Project: "${serviceAccount.project_id}"`);
    return true;
  } catch (err) {
    console.warn(`⚠️  Firebase FCM not initialized: ${err.message}`);
    fcmEnabled = false;
    return false;
  }
}

// ─── Save Device FCM Token ───────────────────────────────────────────────────
export async function saveFCMToken(userId, fcmToken, deviceType = 'android') {
  try {
    await query(
      `INSERT INTO user_devices (user_id, fcm_token, device_type, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, fcm_token) 
       DO UPDATE SET device_type = $3, updated_at = NOW()`,
      [userId, fcmToken, deviceType]
    );
    return true;
  } catch (err) {
    if (err.code === '42P01') {
      console.warn('[FCM] user_devices table not found');
    } else {
      console.error('[FCM] saveFCMToken error:', err.message);
    }
    return false;
  }
}

// ─── Get User FCM Tokens ─────────────────────────────────────────────────────
async function getUserTokens(userId) {
  try {
    const result = await query(
      `SELECT fcm_token FROM user_devices WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId]
    );
    return result.rows.map((r) => r.fcm_token);
  } catch {
    return [];
  }
}

// ─── Core Send Function ───────────────────────────────────────────────────────
async function sendToTokens(tokens, notification, data = {}) {
  if (!fcmEnabled || !tokens.length) return { sent: 0, failed: 0 };

  const messaging = getMessaging(firebaseApp);
  let sent = 0;
  let failed = 0;

  const messages = tokens.map((token) => ({
    token,
    notification: {
      title: notification.title,
      body: notification.body,
      imageUrl: notification.imageUrl || undefined,
    },
    data: {
      ...Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'voratok_notifications',
        icon: 'ic_notification',
        color: '#FE2C55',
      },
    },
  }));

  for (const msg of messages) {
    try {
      await messaging.send(msg);
      sent++;
    } catch (err) {
      failed++;
      if (
        err.code === 'messaging/registration-token-not-registered' ||
        err.code === 'messaging/invalid-registration-token'
      ) {
        try {
          await query(
            `DELETE FROM user_devices WHERE fcm_token = $1`,
            [msg.token]
          );
        } catch {}
      }
    }
  }

  return { sent, failed };
}

// ─── Notification Types ───────────────────────────────────────────────────────

/** 👍 Like Notification */
export async function sendLikeNotification({ recipientId, actorName, videoTitle }) {
  const tokens = await getUserTokens(recipientId);
  return sendToTokens(
    tokens,
    {
      title: '❤️ New Like',
      body: `${actorName} liked your video "${videoTitle || 'your video'}"`,
    },
    { type: 'like', recipientId }
  );
}

/** 💬 Comment Notification */
export async function sendCommentNotification({ recipientId, actorName, comment, videoId }) {
  const tokens = await getUserTokens(recipientId);
  return sendToTokens(
    tokens,
    {
      title: '💬 New Comment',
      body: `${actorName} commented: "${comment.substring(0, 60)}${comment.length > 60 ? '...' : ''}"`,
    },
    { type: 'comment', videoId: String(videoId), recipientId }
  );
}

/** 👥 Follow Notification */
export async function sendFollowNotification({ recipientId, actorName, actorAvatar }) {
  const tokens = await getUserTokens(recipientId);
  return sendToTokens(
    tokens,
    {
      title: '👤 New Follower',
      body: `${actorName} started following you!`,
      imageUrl: actorAvatar || undefined,
    },
    { type: 'follow', recipientId }
  );
}

/** 🔔 General / Admin Notification */
export async function sendGeneralNotification({ recipientId, title, body, data = {} }) {
  const tokens = await getUserTokens(recipientId);
  return sendToTokens(tokens, { title, body }, { type: 'general', ...data });
}

/** 📢 Broadcast to ALL users */
export async function sendBroadcastNotification({ title, body, data = {} }) {
  if (!fcmEnabled) return { sent: 0, failed: 0 };
  try {
    const result = await query(`SELECT fcm_token FROM user_devices WHERE fcm_token IS NOT NULL`);
    const tokens = result.rows.map((r) => r.fcm_token);
    return sendToTokens(tokens, { title, body }, { type: 'broadcast', ...data });
  } catch (err) {
    console.error('[FCM] Broadcast error:', err.message);
    return { sent: 0, failed: 0 };
  }
}

export { fcmEnabled };
export default {
  initFirebase,
  saveFCMToken,
  sendLikeNotification,
  sendCommentNotification,
  sendFollowNotification,
  sendGeneralNotification,
  sendBroadcastNotification,
  fcmEnabled,
};
